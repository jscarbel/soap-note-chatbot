import { ZodType } from 'zod';
import { ensureErrorObject } from '../../utils/ensureErrorObject';
import {
  DynamoDbConditionalCheckFailedError,
  DynamoDbDeleteOptions,
  DynamoDbIndexConfiguration,
  DynamoDbKeyDefinition,
  DynamoDbKeySchema,
  DynamoDbNotFoundError,
  DynamoDbPaginatedResult,
  DynamoDbPutOptions,
  DynamoDbRegion,
  DynamoDbTableName,
  DynamoDbUpdateOptions,
  DynamoDbValidationError,
  IDynamoDbQueryBuilder,
  IDynamoDbScanBuilder,
  IDynamoDbService,
  KeyFromSchema,
  PartitionKeyFromSchema,
  SortKeyCondition,
} from './IDynamoDb.service';

/**
 * In-memory storage for mock DynamoDB tables
 * Global storage that persists across service instances but resets on process restart
 */
const globalMockStorage = new Map<
  string,
  Map<string, Record<string, unknown>>
>();

(globalThis as Record<string, unknown>).globalMockStorage = globalMockStorage;

/**
 * Helper to serialize keys for consistent storage and lookup
 */
function serializeKey(key: Record<string, unknown>): string {
  const sortedKey = Object.keys(key)
    .sort()
    .reduce(
      (acc, k) => {
        acc[k] = key[k];
        return acc;
      },
      {} as Record<string, unknown>,
    );
  return JSON.stringify(sortedKey);
}

/**
 * Helper to evaluate condition expressions (simplified implementation)
 */
function evaluateCondition(
  item: Record<string, unknown> | undefined,
  conditionExpression?: string,
  expressionAttributeNames?: Record<string, string>,
  expressionAttributeValues?: Record<string, unknown>,
): boolean {
  if (!conditionExpression) return true;

  // Handle compound expressions with AND
  if (conditionExpression.includes(' AND ')) {
    const conditions = conditionExpression.split(' AND ').map((c) => c.trim());
    return conditions.every((condition) =>
      evaluateCondition(
        item,
        condition,
        expressionAttributeNames,
        expressionAttributeValues,
      ),
    );
  }

  // Handle compound expressions with OR
  if (conditionExpression.includes(' OR ')) {
    const conditions = conditionExpression.split(' OR ').map((c) => c.trim());
    return conditions.some((condition) =>
      evaluateCondition(
        item,
        condition,
        expressionAttributeNames,
        expressionAttributeValues,
      ),
    );
  }

  // Handle attribute_not_exists
  if (conditionExpression.includes('attribute_not_exists')) {
    const match = conditionExpression.match(/attribute_not_exists\(([^)]+)\)/);
    if (match) {
      const attrName = match[1];
      const actualAttrName = expressionAttributeNames?.[attrName] || attrName;
      return !item || item[actualAttrName] === undefined;
    }
  }

  // Handle attribute_exists
  if (conditionExpression.includes('attribute_exists')) {
    const match = conditionExpression.match(/attribute_exists\(([^)]+)\)/);
    if (match) {
      const attrName = match[1];
      const actualAttrName = expressionAttributeNames?.[attrName] || attrName;
      return Boolean(item && item[actualAttrName] !== undefined);
    }
  }

  // Handle comparison operations (=, >, <, >=, <=)
  const comparisonMatch = conditionExpression.match(
    /([#\w]+)\s*(>=|<=|>|<|=)\s*([:\w]+)/,
  );
  if (
    comparisonMatch &&
    item &&
    expressionAttributeNames &&
    expressionAttributeValues
  ) {
    const attrName = comparisonMatch[1];
    const operator = comparisonMatch[2];
    const valueName = comparisonMatch[3];
    const actualAttrName = expressionAttributeNames[attrName] || attrName;
    const expectedValue = expressionAttributeValues[valueName];
    const actualValue = item[actualAttrName];

    switch (operator) {
      case '=':
        return actualValue === expectedValue;
      case '>':
      case '<':
      case '>=':
      case '<=':
        // Type guard for numeric comparisons
        if (
          typeof actualValue === 'number' &&
          typeof expectedValue === 'number'
        ) {
          switch (operator) {
            case '>':
              return actualValue > expectedValue;
            case '<':
              return actualValue < expectedValue;
            case '>=':
              return actualValue >= expectedValue;
            case '<=':
              return actualValue <= expectedValue;
          }
        }
        // Type guard for string comparisons
        if (
          typeof actualValue === 'string' &&
          typeof expectedValue === 'string'
        ) {
          switch (operator) {
            case '>':
              return actualValue > expectedValue;
            case '<':
              return actualValue < expectedValue;
            case '>=':
              return actualValue >= expectedValue;
            case '<=':
              return actualValue <= expectedValue;
          }
        }
        return false;
      default:
        return false;
    }
  }
  // For unknown conditions, default to false to be safe
  return false;
}

/**
 * Helper to apply update expressions (simplified implementation)
 */
function applyUpdateExpression(
  item: Record<string, unknown>,
  updateExpression: string,
  expressionAttributeNames?: Record<string, string>,
  expressionAttributeValues?: Record<string, unknown>,
): Record<string, unknown> {
  const updatedItem = { ...item };

  // Handle SET operations
  const setMatch = updateExpression.match(
    /SET\s+(.+?)(?:\s+(?:ADD|REMOVE|DELETE)|$)/,
  );
  if (setMatch) {
    const setClause = setMatch[1];
    const assignments = setClause.split(',').map((s) => s.trim());

    for (const assignment of assignments) {
      const [attrPath, valuePath] = assignment.split('=').map((s) => s.trim());
      const actualAttrName = expressionAttributeNames?.[attrPath] || attrPath;
      const value = expressionAttributeValues?.[valuePath];

      if (value !== undefined) {
        updatedItem[actualAttrName] = value;
      }
    }
  }

  // Handle ADD operations (simplified - just treats as SET for numbers)
  const addMatch = updateExpression.match(
    /ADD\s+(.+?)(?:\s+(?:SET|REMOVE|DELETE)|$)/,
  );
  if (addMatch) {
    const addClause = addMatch[1];
    const assignments = addClause.split(',').map((s) => s.trim());

    for (const assignment of assignments) {
      const parts = assignment.split(/\s+/);
      if (parts.length === 2) {
        const attrPath = parts[0];
        const valuePath = parts[1];
        const actualAttrName = expressionAttributeNames?.[attrPath] || attrPath;
        const addValue = expressionAttributeValues?.[valuePath];

        if (typeof addValue === 'number') {
          const currentValue =
            typeof updatedItem[actualAttrName] === 'number'
              ? (updatedItem[actualAttrName] as number)
              : 0;
          updatedItem[actualAttrName] = currentValue + addValue;
        }
      }
    }
  }

  return updatedItem;
}

/**
 * Mock query builder implementation
 */
class MockDynamoDbQueryBuilder<T, TKeySchema extends DynamoDbKeySchema>
  implements IDynamoDbQueryBuilder<T, TKeySchema>
{
  private sortKeyCondition?: { condition: SortKeyCondition };
  private limitValue?: number;
  private consistentReadFlag = false;
  private exclusiveStartKeyValue?: Record<string, unknown>;
  private scanIndexForwardFlag = true;
  private indexNameValue?: string;
  private filterExpressionValue?: string;
  private filterAttributeNames?: Record<string, string>;
  private filterAttributeValues?: Record<string, unknown>;

  constructor(
    private readonly storage: Map<string, Record<string, unknown>>,
    private readonly partitionKey: DynamoDbKeyDefinition,
    private readonly partitionKeyValue: PartitionKeyFromSchema<TKeySchema>,
    private readonly schema: ZodType<T>,
    private readonly sortKey?: DynamoDbKeyDefinition,
  ) {}

  addSortKey(
    condition: SortKeyCondition,
  ): IDynamoDbQueryBuilder<T, TKeySchema> {
    if (!this.sortKey) {
      throw new Error('Cannot add sort key condition: table has no sort key');
    }
    this.sortKeyCondition = { condition };
    return this;
  }

  sortKeyExpression(): IDynamoDbQueryBuilder<T, TKeySchema> {
    // Simplified implementation - just return this
    return this;
  }

  limit(count: number): IDynamoDbQueryBuilder<T, TKeySchema> {
    this.limitValue = count;
    return this;
  }

  consistentRead(): IDynamoDbQueryBuilder<T, TKeySchema> {
    this.consistentReadFlag = true;
    return this;
  }

  startFrom(
    exclusiveStartKey: Record<string, unknown>,
  ): IDynamoDbQueryBuilder<T, TKeySchema> {
    this.exclusiveStartKeyValue = exclusiveStartKey;
    return this;
  }

  scanBackward(): IDynamoDbQueryBuilder<T, TKeySchema> {
    this.scanIndexForwardFlag = false;
    return this;
  }

  index(): IDynamoDbQueryBuilder<T, TKeySchema> {
    // Simplified implementation for mock
    return this;
  }

  filter(
    expression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, unknown>,
  ): IDynamoDbQueryBuilder<T, TKeySchema> {
    this.filterExpressionValue = expression;
    this.filterAttributeNames = expressionAttributeNames;
    this.filterAttributeValues = expressionAttributeValues;
    return this;
  }

  async execute(): Promise<DynamoDbPaginatedResult<T>> {
    const items: T[] = [];
    let scannedCount = 0;

    for (const [, item] of this.storage) {
      scannedCount++;

      // Check partition key match
      const itemPkValue = item[this.partitionKey[0]];
      if (itemPkValue !== this.partitionKeyValue) {
        continue;
      }

      // Check sort key condition if provided
      if (this.sortKeyCondition && this.sortKey) {
        const itemSkValue = item[this.sortKey[0]] as string | number;
        const condition = this.sortKeyCondition.condition;

        let matchesSortKey = false;
        switch (condition.operator) {
          case '=':
            matchesSortKey = itemSkValue === condition.value;
            break;
          case '>':
            matchesSortKey = itemSkValue > condition.value;
            break;
          case '>=':
            matchesSortKey = itemSkValue >= condition.value;
            break;
          case '<':
            matchesSortKey = itemSkValue < condition.value;
            break;
          case '<=':
            matchesSortKey = itemSkValue <= condition.value;
            break;
          case 'begins_with':
            matchesSortKey = String(itemSkValue).startsWith(
              String(condition.value),
            );
            break;
          case 'between':
            matchesSortKey =
              itemSkValue >= condition.start && itemSkValue <= condition.end;
            break;
        }

        if (!matchesSortKey) {
          continue;
        }
      }

      // Apply filter expression if provided
      if (this.filterExpressionValue) {
        const matchesFilter = evaluateCondition(
          item,
          this.filterExpressionValue,
          this.filterAttributeNames,
          this.filterAttributeValues,
        );
        if (!matchesFilter) {
          continue;
        }
      }

      try {
        const parsedItem = this.schema.parse(item);
        items.push(parsedItem);
      } catch {
        // Skip items that don't match schema
        continue;
      }

      // Apply limit
      if (this.limitValue && items.length >= this.limitValue) {
        break;
      }
    }

    // Sort by sort key if present
    if (this.sortKey) {
      items.sort((a, b) => {
        const aValue = (a as Record<string, unknown>)[this.sortKey![0]] as
          | string
          | number;
        const bValue = (b as Record<string, unknown>)[this.sortKey![0]] as
          | string
          | number;

        if (aValue < bValue) return this.scanIndexForwardFlag ? -1 : 1;
        if (aValue > bValue) return this.scanIndexForwardFlag ? 1 : -1;
        return 0;
      });
    }

    return {
      items,
      lastEvaluatedKey: undefined, // Simplified - no pagination in mock
      count: items.length,
      scannedCount,
    };
  }
}

/**
 * Mock scan builder implementation
 */
class MockDynamoDbScanBuilder<T> implements IDynamoDbScanBuilder<T> {
  private limitValue?: number;
  private consistentReadFlag = false;
  private exclusiveStartKeyValue?: Record<string, unknown>;
  private indexNameValue?: string;
  private filterExpressionValue?: string;
  private filterAttributeNames?: Record<string, string>;
  private filterAttributeValues?: Record<string, unknown>;

  constructor(
    private readonly storage: Map<string, Record<string, unknown>>,
    private readonly schema: ZodType<T>,
  ) {}

  limit(count: number): IDynamoDbScanBuilder<T> {
    this.limitValue = count;
    return this;
  }

  consistentRead(): IDynamoDbScanBuilder<T> {
    this.consistentReadFlag = true;
    return this;
  }

  startFrom(
    exclusiveStartKey: Record<string, unknown>,
  ): IDynamoDbScanBuilder<T> {
    this.exclusiveStartKeyValue = exclusiveStartKey;
    return this;
  }

  index(): IDynamoDbScanBuilder<T> {
    // Simplified implementation for mock
    return this;
  }

  filter(
    expression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, unknown>,
  ): IDynamoDbScanBuilder<T> {
    this.filterExpressionValue = expression;
    this.filterAttributeNames = expressionAttributeNames;
    this.filterAttributeValues = expressionAttributeValues;
    return this;
  }

  parallel(): IDynamoDbScanBuilder<T> {
    // Simplified implementation for mock
    return this;
  }

  async execute(): Promise<DynamoDbPaginatedResult<T>> {
    const items: T[] = [];
    let scannedCount = 0;

    for (const [, item] of this.storage) {
      scannedCount++;

      // Apply filter expression if provided
      if (this.filterExpressionValue) {
        const matchesFilter = evaluateCondition(
          item,
          this.filterExpressionValue,
          this.filterAttributeNames,
          this.filterAttributeValues,
        );
        if (!matchesFilter) {
          continue;
        }
      }

      try {
        const parsedItem = this.schema.parse(item);
        items.push(parsedItem);
      } catch {
        // Skip items that don't match schema
        continue;
      }

      // Apply limit
      if (this.limitValue && items.length >= this.limitValue) {
        break;
      }
    }

    return {
      items,
      lastEvaluatedKey: undefined, // Simplified - no pagination in mock
      count: items.length,
      scannedCount,
    };
  }
}

/**
 * Mock streaming scan builder
 */
class MockDynamoDbStreamingScanBuilder<T> extends MockDynamoDbScanBuilder<T> {
  async *[Symbol.asyncIterator](): AsyncIterator<T[]> {
    const result = await this.execute();
    if (result.items.length > 0) {
      yield result.items;
    }
  }
}

/**
 * Mock DynamoDB service implementation using in-memory storage
 */
export class MockDynamoDBService<
  T extends Record<string, unknown> = {},
  TKeySchema extends DynamoDbKeySchema = DynamoDbKeySchema,
> implements IDynamoDbService<T, TKeySchema>
{
  private readonly storage: Map<string, Record<string, unknown>>;
  private readonly partitionKey: DynamoDbKeyDefinition;
  private readonly sortKey: DynamoDbKeyDefinition | undefined;

  constructor(
    private readonly tableName: DynamoDbTableName,
    readonly keySchema: TKeySchema,
    private readonly schema: ZodType<T>,
    private readonly indexes?: DynamoDbIndexConfiguration | undefined,
    private readonly region: DynamoDbRegion = 'us-east-2',
  ) {
    this.partitionKey = keySchema[0];
    this.sortKey = keySchema[1];

    // Get or create storage for this table
    if (!globalMockStorage.has(tableName)) {
      globalMockStorage.set(tableName, new Map());
    }
    this.storage = globalMockStorage.get(tableName)!;
  }

  private validateAndParseItem(item: unknown): T {
    try {
      return this.schema.parse(item);
    } catch (e: unknown) {
      const error = ensureErrorObject(e);
      throw new DynamoDbValidationError(
        `Item validation failed: ${error.message}`,
      );
    }
  }

  private buildKey(key: KeyFromSchema<TKeySchema>): Record<string, unknown> {
    const dynamoKey: Record<string, unknown> = {};

    // Add partition key
    const pkValue =
      key[this.partitionKey[0] as keyof KeyFromSchema<TKeySchema>];
    dynamoKey[this.partitionKey[0]] = pkValue;

    // Add sort key if it exists
    if (this.sortKey) {
      const skValue = key[this.sortKey[0] as keyof KeyFromSchema<TKeySchema>];
      dynamoKey[this.sortKey[0]] = skValue;
    }

    return dynamoKey;
  }

  async getItem(
    key: KeyFromSchema<TKeySchema>,
    _consistentRead = false,
  ): Promise<T | undefined> {
    const keyStr = serializeKey(this.buildKey(key));
    const item = this.storage.get(keyStr);

    if (!item) {
      return undefined;
    }

    return this.validateAndParseItem(item);
  }

  async putItem(item: T, options?: DynamoDbPutOptions): Promise<T | undefined> {
    // Build key from item
    const keyObj: Record<string, unknown> = {};
    keyObj[this.partitionKey[0]] = (item as Record<string, unknown>)[
      this.partitionKey[0]
    ];
    if (this.sortKey) {
      keyObj[this.sortKey[0]] = (item as Record<string, unknown>)[
        this.sortKey[0]
      ];
    }

    const keyStr = serializeKey(keyObj);
    const existingItem = this.storage.get(keyStr);

    // Check condition expression
    const conditionPassed = evaluateCondition(
      existingItem,
      options?.conditionExpression,
      options?.expressionAttributeNames,
      options?.expressionAttributeValues,
    );

    if (!conditionPassed) {
      throw new DynamoDbConditionalCheckFailedError('Conditional check failed');
    }

    // Validate item against schema
    this.validateAndParseItem(item);

    // Store the item
    this.storage.set(keyStr, { ...(item as Record<string, unknown>) });

    // Return old item if requested
    if (options?.returnValues === 'ALL_OLD' && existingItem) {
      return this.validateAndParseItem(existingItem);
    }

    return undefined;
  }

  async updateItem(
    key: KeyFromSchema<TKeySchema>,
    options: DynamoDbUpdateOptions,
  ): Promise<T | undefined> {
    const keyStr = serializeKey(this.buildKey(key));
    const existingItem = this.storage.get(keyStr);

    if (!existingItem) {
      throw new DynamoDbNotFoundError('Item not found');
    }

    // Check condition expression
    const conditionPassed = evaluateCondition(
      existingItem,
      options.conditionExpression,
      options.expressionAttributeNames,
      options.expressionAttributeValues,
    );

    if (!conditionPassed) {
      throw new DynamoDbConditionalCheckFailedError('Conditional check failed');
    }

    // Apply update expression
    const updatedItem = applyUpdateExpression(
      existingItem,
      options.updateExpression,
      options.expressionAttributeNames,
      options.expressionAttributeValues,
    );

    // Validate updated item
    const validatedItem = this.validateAndParseItem(updatedItem);

    // Store updated item
    this.storage.set(keyStr, { ...updatedItem });

    // Return based on returnValues
    switch (options.returnValues) {
      case 'ALL_OLD':
        return this.validateAndParseItem(existingItem);
      case 'ALL_NEW':
      case 'UPDATED_NEW':
        return validatedItem;
      case 'UPDATED_OLD':
        // Simplified - return old item
        return this.validateAndParseItem(existingItem);
      default:
        return undefined;
    }
  }

  async deleteItem(
    key: KeyFromSchema<TKeySchema>,
    options?: DynamoDbDeleteOptions,
  ): Promise<T | undefined> {
    const keyStr = serializeKey(this.buildKey(key));
    const existingItem = this.storage.get(keyStr);

    if (!existingItem) {
      throw new DynamoDbNotFoundError('Item not found');
    }

    // Check condition expression
    const conditionPassed = evaluateCondition(
      existingItem,
      options?.conditionExpression,
      options?.expressionAttributeNames,
      options?.expressionAttributeValues,
    );

    if (!conditionPassed) {
      throw new DynamoDbConditionalCheckFailedError('Conditional check failed');
    }

    // Delete the item
    this.storage.delete(keyStr);

    // Return old item if requested
    if (options?.returnValues === 'ALL_OLD') {
      return this.validateAndParseItem(existingItem);
    }

    return undefined;
  }

  query(
    partitionKeyValue: PartitionKeyFromSchema<TKeySchema>,
  ): IDynamoDbQueryBuilder<T, TKeySchema> {
    return new MockDynamoDbQueryBuilder(
      this.storage,
      this.partitionKey,
      partitionKeyValue,
      this.schema,
      this.sortKey,
    );
  }

  scan(): IDynamoDbScanBuilder<T> {
    return new MockDynamoDbScanBuilder(this.storage, this.schema);
  }

  scanStream(): IDynamoDbScanBuilder<T> & {
    [Symbol.asyncIterator](): AsyncIterator<T[]>;
  } {
    return new MockDynamoDbStreamingScanBuilder(this.storage, this.schema);
  }

  async batchWrite(
    operations: Array<
      | { operation: 'put'; item: T }
      | { operation: 'delete'; key: KeyFromSchema<TKeySchema> }
    >,
  ): Promise<void> {
    for (const op of operations) {
      if (op.operation === 'put') {
        await this.putItem(op.item);
      } else {
        await this.deleteItem(op.key);
      }
    }
  }

  async batchGet(
    keys: Array<KeyFromSchema<TKeySchema>>,
    consistentRead = false,
  ): Promise<T[]> {
    const results: T[] = [];

    for (const key of keys) {
      const item = await this.getItem(key, consistentRead);
      if (item) {
        results.push(item);
      }
    }

    return results;
  }

  async transactWrite(
    operations: Array<{
      operation: 'put' | 'update' | 'delete' | 'conditionCheck';
      item?: T;
      key?: KeyFromSchema<TKeySchema>;
      updateExpression?: string;
      conditionExpression?: string;
      expressionAttributeNames?: Record<string, string>;
      expressionAttributeValues?: Record<string, unknown>;
    }>,
  ): Promise<void> {
    // Check all conditions first (simplified transaction simulation)
    for (const op of operations) {
      if (op.operation === 'conditionCheck' && op.key) {
        const keyStr = serializeKey(this.buildKey(op.key));
        const item = this.storage.get(keyStr);

        const conditionPassed = evaluateCondition(
          item,
          op.conditionExpression,
          op.expressionAttributeNames,
          op.expressionAttributeValues,
        );

        if (!conditionPassed) {
          throw new DynamoDbConditionalCheckFailedError(
            'Transaction condition failed',
          );
        }
      }
    }

    for (const op of operations) {
      switch (op.operation) {
        case 'put':
          if (op.item) {
            await this.putItem(op.item, {
              conditionExpression: op.conditionExpression,
              expressionAttributeNames: op.expressionAttributeNames,
              expressionAttributeValues: op.expressionAttributeValues,
            });
          }
          break;
        case 'update':
          if (op.key && op.updateExpression) {
            await this.updateItem(op.key, {
              updateExpression: op.updateExpression,
              conditionExpression: op.conditionExpression,
              expressionAttributeNames: op.expressionAttributeNames,
              expressionAttributeValues: op.expressionAttributeValues,
            });
          }
          break;
        case 'delete':
          if (op.key) {
            await this.deleteItem(op.key, {
              conditionExpression: op.conditionExpression,
              expressionAttributeNames: op.expressionAttributeNames,
              expressionAttributeValues: op.expressionAttributeValues,
            });
          }
          break;
      }
    }
  }

  async getItemCount(): Promise<number> {
    return this.storage.size;
  }
}
