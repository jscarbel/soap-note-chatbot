import {
  ConditionalCheckFailedException,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceNotFoundException,
  TransactionCanceledException,
} from '@aws-sdk/client-dynamodb';
import {
  BatchGetCommand,
  BatchWriteCommand,
  DeleteCommand,
  QueryCommand as DocQueryCommand,
  ScanCommand as DocScanCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { ZodType } from 'zod';
import { ensureErrorObject } from '../../utils/ensureErrorObject';
import {
  DynamoDbConditionalCheckFailedError,
  DynamoDbDeleteOptions,
  DynamoDbError,
  DynamoDbIndexConfiguration,
  DynamoDbKeyDefinition,
  DynamoDbKeySchema,
  DynamoDbPaginatedResult,
  DynamoDbPutOptions,
  DynamoDbQueryOptions,
  DynamoDbRegion,
  DynamoDbScanOptions,
  DynamoDbTableName,
  DynamoDbTableNotFoundError,
  DynamoDbTransactionCancelledError,
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
 * Query builder implementation for type-safe DynamoDB queries
 */
class DynamoDbQueryBuilder<T, TKeySchema extends DynamoDbKeySchema>
  implements IDynamoDbQueryBuilder<T, TKeySchema>
{
  protected options: DynamoDbQueryOptions = {};
  private keyConditionExpression: string;
  private expressionAttributeNames: Record<string, string> = {};
  private expressionAttributeValues: Record<string, unknown> = {};

  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
    private readonly partitionKey: DynamoDbKeyDefinition,
    private readonly partitionKeyValue: PartitionKeyFromSchema<TKeySchema>,
    private readonly schema: ZodType<T>,
    private readonly sortKey?: DynamoDbKeyDefinition,
  ) {
    // Set up partition key condition
    const pkAlias = '#pk';
    const pkValueAlias = ':pkval';
    this.keyConditionExpression = `${pkAlias} = ${pkValueAlias}`;
    this.expressionAttributeNames[pkAlias] = this.partitionKey[0];
    this.expressionAttributeValues[pkValueAlias] = this.partitionKeyValue;
  }

  /** @inheritdoc */
  addSortKey(
    condition: SortKeyCondition,
  ): IDynamoDbQueryBuilder<T, TKeySchema> {
    if (!this.sortKey) {
      throw new Error('Cannot add sort key condition: table has no sort key');
    }

    const skAlias = '#sk';
    const skValueAlias = ':skval';
    this.expressionAttributeNames[skAlias] = this.sortKey[0];

    switch (condition.operator) {
      case '=':
        this.keyConditionExpression += ` AND ${skAlias} = ${skValueAlias}`;
        this.expressionAttributeValues[skValueAlias] = condition.value;
        break;
      case '>':
        this.keyConditionExpression += ` AND ${skAlias} > ${skValueAlias}`;
        this.expressionAttributeValues[skValueAlias] = condition.value;
        break;
      case '>=':
        this.keyConditionExpression += ` AND ${skAlias} >= ${skValueAlias}`;
        this.expressionAttributeValues[skValueAlias] = condition.value;
        break;
      case '<':
        this.keyConditionExpression += ` AND ${skAlias} < ${skValueAlias}`;
        this.expressionAttributeValues[skValueAlias] = condition.value;
        break;
      case '<=':
        this.keyConditionExpression += ` AND ${skAlias} <= ${skValueAlias}`;
        this.expressionAttributeValues[skValueAlias] = condition.value;
        break;
      case 'begins_with':
        this.keyConditionExpression += ` AND begins_with(${skAlias}, ${skValueAlias})`;
        this.expressionAttributeValues[skValueAlias] = condition.value;
        break;
      case 'between':
        const startAlias = ':skstart';
        const endAlias = ':skend';
        this.keyConditionExpression += ` AND ${skAlias} BETWEEN ${startAlias} AND ${endAlias}`;
        this.expressionAttributeValues[startAlias] = condition.start;
        this.expressionAttributeValues[endAlias] = condition.end;
        break;
    }

    return this;
  }

  /** @inheritdoc */
  sortKeyExpression(
    expression: string,
    expressionAttributeValues?: Record<string, unknown>,
  ): IDynamoDbQueryBuilder<T, TKeySchema> {
    if (!this.sortKey) {
      throw new Error('Cannot add sort key expression: table has no sort key');
    }

    this.keyConditionExpression += ` AND ${expression}`;
    if (expressionAttributeValues) {
      Object.assign(this.expressionAttributeValues, expressionAttributeValues);
    }

    return this;
  }

  /** @inheritdoc */
  limit(count: number): IDynamoDbQueryBuilder<T, TKeySchema> {
    this.options.limit = count;
    return this;
  }

  /** @inheritdoc */
  consistentRead(): IDynamoDbQueryBuilder<T, TKeySchema> {
    this.options.consistentRead = true;
    return this;
  }

  /** @inheritdoc */
  startFrom(
    exclusiveStartKey: Record<string, unknown>,
  ): IDynamoDbQueryBuilder<T, TKeySchema> {
    this.options.exclusiveStartKey = exclusiveStartKey;
    return this;
  }

  /** @inheritdoc */
  scanBackward(): IDynamoDbQueryBuilder<T, TKeySchema> {
    this.options.scanIndexForward = false;
    return this;
  }

  /** @inheritdoc */
  index(indexName: string): IDynamoDbQueryBuilder<T, TKeySchema> {
    this.options.indexName = indexName;
    return this;
  }

  /** @inheritdoc */
  filter(
    expression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, unknown>,
  ): IDynamoDbQueryBuilder<T, TKeySchema> {
    this.options.filterExpression = expression;
    if (expressionAttributeNames) {
      this.options.expressionAttributeNames = {
        ...this.options.expressionAttributeNames,
        ...expressionAttributeNames,
      };
    }
    if (expressionAttributeValues) {
      this.options.expressionAttributeValues = {
        ...this.options.expressionAttributeValues,
        ...expressionAttributeValues,
      };
    }
    return this;
  }

  /** @inheritdoc */
  async execute(): Promise<DynamoDbPaginatedResult<T>> {
    try {
      const command = new DocQueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: this.keyConditionExpression,
        ExpressionAttributeNames:
          Object.keys(this.expressionAttributeNames).length > 0
            ? {
                ...this.expressionAttributeNames,
                ...this.options.expressionAttributeNames,
              }
            : this.options.expressionAttributeNames,
        ExpressionAttributeValues:
          Object.keys(this.expressionAttributeValues).length > 0
            ? {
                ...this.expressionAttributeValues,
                ...this.options.expressionAttributeValues,
              }
            : this.options.expressionAttributeValues,
        Limit: this.options.limit,
        ConsistentRead: this.options.consistentRead,
        ExclusiveStartKey: this.options.exclusiveStartKey,
        ScanIndexForward: this.options.scanIndexForward,
        IndexName: this.options.indexName,
        FilterExpression: this.options.filterExpression,
      });

      const result = await this.client.send(command);

      const items = (result.Items || []).map((item) => {
        return this.schema.parse(item);
      });

      return {
        items,
        lastEvaluatedKey: result.LastEvaluatedKey,
        count: result.Count || 0,
        scannedCount: result.ScannedCount || 0,
      };
    } catch (error) {
      throw this.handleDynamoDbError(error);
    }
  }

  /** @inheritdoc */
  private handleDynamoDbError(error: unknown): Error {
    if (error instanceof ResourceNotFoundException) {
      return new DynamoDbTableNotFoundError('Table not found');
    }
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'ValidationException'
    ) {
      return new DynamoDbValidationError((error as Error).message);
    }
    const unknownError = ensureErrorObject(error);
    return new DynamoDbError(unknownError.message, 'UNKNOWN_ERROR', 500);
  }
}

/**
 * Scan builder implementation for type-safe DynamoDB scans
 */
class DynamoDbScanBuilder<T> implements IDynamoDbScanBuilder<T> {
  protected options: DynamoDbScanOptions = {};

  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
    private readonly schema: ZodType<T>,
  ) {}

  /** @inheritdoc */
  limit(count: number): IDynamoDbScanBuilder<T> {
    this.options.limit = count;
    return this;
  }

  /** @inheritdoc */
  consistentRead(): IDynamoDbScanBuilder<T> {
    this.options.consistentRead = true;
    return this;
  }

  /** @inheritdoc */
  startFrom(
    exclusiveStartKey: Record<string, unknown>,
  ): IDynamoDbScanBuilder<T> {
    this.options.exclusiveStartKey = exclusiveStartKey;
    return this;
  }

  /** @inheritdoc */
  index(indexName: string): IDynamoDbScanBuilder<T> {
    this.options.indexName = indexName;
    return this;
  }

  /** @inheritdoc */
  filter(
    expression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, unknown>,
  ): IDynamoDbScanBuilder<T> {
    this.options.filterExpression = expression;
    this.options.expressionAttributeNames = {
      ...this.options.expressionAttributeNames,
      ...expressionAttributeNames,
    };
    this.options.expressionAttributeValues = {
      ...this.options.expressionAttributeValues,
      ...expressionAttributeValues,
    };
    return this;
  }

  /** @inheritdoc */
  parallel(totalSegments: number, segment: number): IDynamoDbScanBuilder<T> {
    this.options.totalSegments = totalSegments;
    this.options.segment = segment;
    return this;
  }

  /** @inheritdoc */
  async execute(): Promise<DynamoDbPaginatedResult<T>> {
    try {
      const command = new DocScanCommand({
        TableName: this.tableName,
        Limit: this.options.limit,
        ConsistentRead: this.options.consistentRead,
        ExclusiveStartKey: this.options.exclusiveStartKey,
        IndexName: this.options.indexName,
        FilterExpression: this.options.filterExpression,
        ExpressionAttributeNames: this.options.expressionAttributeNames,
        ExpressionAttributeValues: this.options.expressionAttributeValues,
        TotalSegments: this.options.totalSegments,
        Segment: this.options.segment,
      });

      const result = await this.client.send(command);

      const items = (result.Items || []).map((item) => {
        return this.schema.parse(item);
      });

      return {
        items,
        lastEvaluatedKey: result.LastEvaluatedKey,
        count: result.Count || 0,
        scannedCount: result.ScannedCount || 0,
      };
    } catch (error) {
      throw this.handleDynamoDbError(error);
    }
  }

  private handleDynamoDbError(error: unknown): Error {
    if (error instanceof ResourceNotFoundException) {
      return new DynamoDbTableNotFoundError('Table not found');
    }
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'ValidationException'
    ) {
      return new DynamoDbValidationError((error as Error).message);
    }
    const unknownError = ensureErrorObject(error);
    return new DynamoDbError(unknownError.message, 'UNKNOWN_ERROR', 500);
  }
}

/**
 * Streaming scan builder that implements async iteration
 */
class DynamoDbStreamingScanBuilder<T> extends DynamoDbScanBuilder<T> {
  async *[Symbol.asyncIterator](): AsyncIterator<T[]> {
    let lastEvaluatedKey: Record<string, unknown> | undefined =
      this.options.exclusiveStartKey;

    do {
      if (lastEvaluatedKey) {
        this.startFrom(lastEvaluatedKey);
      }

      const result = await this.execute();

      if (result.items.length > 0) {
        yield result.items;
      }

      lastEvaluatedKey = result.lastEvaluatedKey;
    } while (lastEvaluatedKey);
  }
}

/**
 * Production implementation of DynamoDB service using AWS SDK v3
 */
export class ProdDynamoDbService<
  T extends Record<string, unknown> = {},
  TKeySchema extends DynamoDbKeySchema = DynamoDbKeySchema,
> implements IDynamoDbService<T, TKeySchema>
{
  private readonly client: DynamoDBDocumentClient;
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

    const dynamoClient = new DynamoDBClient({ region });
    this.client = DynamoDBDocumentClient.from(dynamoClient);
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

  private handleDynamoDbError(error: unknown): Error {
    if (error instanceof ResourceNotFoundException) {
      return new DynamoDbTableNotFoundError('Table not found');
    }
    if (error instanceof ConditionalCheckFailedException) {
      return new DynamoDbConditionalCheckFailedError(
        'Conditional check failed',
      );
    }
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'ValidationException'
    ) {
      return new DynamoDbValidationError((error as Error).message);
    }
    if (error instanceof TransactionCanceledException) {
      return new DynamoDbTransactionCancelledError('Transaction was cancelled');
    }

    const unknownError = ensureErrorObject(error);
    return new DynamoDbError(unknownError.message, 'UNKNOWN_ERROR', 500);
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
    consistentRead = false,
  ): Promise<T | undefined> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: this.buildKey(key),
        ConsistentRead: consistentRead,
      });

      const result = await this.client.send(command);

      if (!result.Item) {
        return undefined;
      }

      return this.validateAndParseItem(result.Item);
    } catch (error) {
      throw this.handleDynamoDbError(error);
    }
  }

  async putItem(item: T, options?: DynamoDbPutOptions): Promise<T | undefined> {
    try {
      // Add timestamps if not present
      const itemWithTimestamps = { ...item } as Record<string, unknown>;
      const now = new Date().toISOString();

      // Set createdAt if not present
      if ('createdAt' in itemWithTimestamps && !itemWithTimestamps.createdAt) {
        itemWithTimestamps.createdAt = now;
      }

      // Always set updatedAt
      if ('updatedAt' in itemWithTimestamps) {
        itemWithTimestamps.updatedAt = now;
      }

      const command = new PutCommand({
        TableName: this.tableName,
        Item: itemWithTimestamps,
        ConditionExpression: options?.conditionExpression,
        ExpressionAttributeNames: options?.expressionAttributeNames,
        ExpressionAttributeValues: options?.expressionAttributeValues,
        ReturnValues: options?.returnValues,
      });

      const result = await this.client.send(command);

      if (result.Attributes && options?.returnValues === 'ALL_OLD') {
        return this.validateAndParseItem(result.Attributes);
      }

      return undefined;
    } catch (error) {
      throw this.handleDynamoDbError(error);
    }
  }

  async updateItem(
    key: KeyFromSchema<TKeySchema>,
    options: DynamoDbUpdateOptions,
  ): Promise<T | undefined> {
    try {
      const {
        updateExpression,
        expressionAttributeNames,
        expressionAttributeValues,
      } = this.addTimestampToUpdateExpression(
        options.updateExpression,
        options.expressionAttributeNames,
        options.expressionAttributeValues,
      );

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: this.buildKey(key),
        UpdateExpression: updateExpression,
        ConditionExpression: options.conditionExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: options.returnValues,
      });

      const result = await this.client.send(command);

      if (
        result.Attributes &&
        options.returnValues &&
        options.returnValues !== 'NONE'
      ) {
        return this.validateAndParseItem(result.Attributes);
      }

      return undefined;
    } catch (error) {
      throw this.handleDynamoDbError(error);
    }
  }
  async deleteItem(
    key: KeyFromSchema<TKeySchema>,
    options?: DynamoDbDeleteOptions,
  ): Promise<T | undefined> {
    try {
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: this.buildKey(key),
        ConditionExpression: options?.conditionExpression,
        ExpressionAttributeNames: options?.expressionAttributeNames,
        ExpressionAttributeValues: options?.expressionAttributeValues,
        ReturnValues: options?.returnValues,
      });

      const result = await this.client.send(command);

      if (result.Attributes && options?.returnValues === 'ALL_OLD') {
        return this.validateAndParseItem(result.Attributes);
      }

      return undefined;
    } catch (error) {
      throw this.handleDynamoDbError(error);
    }
  }

  query(
    partitionKeyValue: PartitionKeyFromSchema<TKeySchema>,
  ): IDynamoDbQueryBuilder<T, TKeySchema> {
    return new DynamoDbQueryBuilder(
      this.client,
      this.tableName,
      this.partitionKey,
      partitionKeyValue,
      this.schema,
      this.sortKey,
    );
  }

  scan(): IDynamoDbScanBuilder<T> {
    return new DynamoDbScanBuilder(this.client, this.tableName, this.schema);
  }

  scanStream(): IDynamoDbScanBuilder<T> & {
    [Symbol.asyncIterator](): AsyncIterator<T[]>;
  } {
    return new DynamoDbStreamingScanBuilder(
      this.client,
      this.tableName,
      this.schema,
    );
  }

  async batchWrite(
    operations: Array<
      | { operation: 'put'; item: T }
      | { operation: 'delete'; key: KeyFromSchema<TKeySchema> }
    >,
  ): Promise<void> {
    // Process in batches of 25 (DynamoDB limit)
    const batchSize = 25;
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);

      try {
        const writeRequests = batch.map((op) => {
          if (op.operation === 'put') {
            return {
              PutRequest: {
                Item: op.item,
              },
            };
          } else {
            return {
              DeleteRequest: {
                Key: this.buildKey(op.key),
              },
            };
          }
        });

        const command = new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: writeRequests,
          },
        });

        let result = await this.client.send(command);

        // Handle unprocessed items with exponential backoff
        let retryCount = 0;
        const maxRetries = 5;

        while (
          result.UnprocessedItems &&
          Object.keys(result.UnprocessedItems).length > 0 &&
          retryCount < maxRetries
        ) {
          const delay = Math.pow(2, retryCount) * 100; // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));

          const retryCommand = new BatchWriteCommand({
            RequestItems: result.UnprocessedItems,
          });

          result = await this.client.send(retryCommand);
          retryCount++;
        }

        if (
          result.UnprocessedItems &&
          Object.keys(result.UnprocessedItems).length > 0
        ) {
          throw new Error('Some items could not be processed after retries');
        }
      } catch (error) {
        throw this.handleDynamoDbError(error);
      }
    }
  }

  async batchGet(
    keys: Array<KeyFromSchema<TKeySchema>>,
    consistentRead = false,
  ): Promise<T[]> {
    const results: T[] = [];

    // Process in batches of 100 (DynamoDB limit)
    const batchSize = 100;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);

      try {
        const dynamoKeys = batch.map((key) => this.buildKey(key));

        const command = new BatchGetCommand({
          RequestItems: {
            [this.tableName]: {
              Keys: dynamoKeys,
              ConsistentRead: consistentRead,
            },
          },
        });

        const result = await this.client.send(command);

        if (result.Responses && result.Responses[this.tableName]) {
          const items = result.Responses[this.tableName].map((item) => {
            return this.validateAndParseItem(item);
          });
          results.push(...items);
        }
      } catch (error) {
        throw this.handleDynamoDbError(error);
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
    try {
      const transactItems = operations.map((op) => {
        const baseParams = {
          TableName: this.tableName,
          ConditionExpression: op.conditionExpression,
          ExpressionAttributeNames: op.expressionAttributeNames,
          ExpressionAttributeValues: op.expressionAttributeValues,
        };

        switch (op.operation) {
          case 'put':
            if (!op.item) {
              throw new Error('Put operation requires item');
            }
            return {
              Put: {
                ...baseParams,
                Item: op.item,
              },
            };
          case 'update':
            if (!op.key || !op.updateExpression) {
              throw new Error(
                'Update operation requires key and updateExpression',
              );
            }
            return {
              Update: {
                ...baseParams,
                Key: this.buildKey(op.key),
                UpdateExpression: op.updateExpression,
              },
            };
          case 'delete':
            if (!op.key) {
              throw new Error('Delete operation requires key');
            }
            return {
              Delete: {
                ...baseParams,
                Key: this.buildKey(op.key),
              },
            };
          case 'conditionCheck':
            if (!op.key) {
              throw new Error('ConditionCheck operation requires key');
            }
            return {
              ConditionCheck: {
                ...baseParams,
                Key: this.buildKey(op.key),
              },
            };
          default:
            throw new Error(`Unknown operation: ${op.operation}`);
        }
      });

      const command = new TransactWriteCommand({
        TransactItems: transactItems,
      });

      await this.client.send(command);
    } catch (error) {
      throw this.handleDynamoDbError(error);
    }
  }

  async getItemCount(): Promise<number> {
    try {
      const command = new DescribeTableCommand({
        TableName: this.tableName,
      });

      const result = await this.client.send(command);
      return result.Table?.ItemCount || 0;
    } catch (error) {
      throw this.handleDynamoDbError(error);
    }
  }

  private addTimestampToUpdateExpression(
    updateExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, unknown>,
  ): {
    updateExpression: string;
    expressionAttributeNames: Record<string, string>;
    expressionAttributeValues: Record<string, unknown>;
  } {
    const now = new Date().toISOString();
    const names = { ...expressionAttributeNames };
    const values = { ...expressionAttributeValues };

    // Add updatedAt to the SET clause
    names['#updatedAt'] = 'updatedAt';
    values[':updatedAt'] = now;

    // Check if SET clause exists
    if (updateExpression.includes('SET ')) {
      // Append to existing SET clause
      const updatedExpression = updateExpression.replace(
        /SET\s+(.+?)(?:\s+(ADD|REMOVE|DELETE)|$)/,
        (match, setClause, nextOperation) => {
          const newSetClause = `${setClause.trim()}, #updatedAt = :updatedAt`;
          return nextOperation
            ? `SET ${newSetClause} ${nextOperation}`
            : `SET ${newSetClause}`;
        },
      );
      return {
        updateExpression: updatedExpression,
        expressionAttributeNames: names,
        expressionAttributeValues: values,
      };
    } else {
      // Add SET clause
      return {
        updateExpression: `SET #updatedAt = :updatedAt ${updateExpression}`,
        expressionAttributeNames: names,
        expressionAttributeValues: values,
      };
    }
  }
}
