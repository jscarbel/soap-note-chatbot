/**
 * Represents the supported DynamoDB attribute data types for keys
 */
export type DynamoDbKeyAttributeType = 'string' | 'number';

/**
 * Represents a DynamoDB stage environment
 */
export type DynamoDbStage = 'dev' | 'staging' | 'prod';

/**
 * Represents a table name with stage prefix validation
 */
export type DynamoDbTableName = `${DynamoDbStage}-${string}`;

/**
 * Represents a single key definition for DynamoDB (partition key or sort key)
 */
export type DynamoDbKeyDefinition = readonly [
  keyName: string,
  type: DynamoDbKeyAttributeType,
];

/**
 * Represents either a partition key only, or partition key + sort key combination
 */
export type DynamoDbKeySchema =
  | readonly [partitionKey: DynamoDbKeyDefinition]
  | readonly [
      partitionKey: DynamoDbKeyDefinition,
      sortKey: DynamoDbKeyDefinition,
    ];

/**
 * Represents the index configuration for Global Secondary Indexes (GSI) and Local Secondary Indexes (LSI)
 */
export type DynamoDbIndexConfiguration = Record<string, DynamoDbKeySchema>;

/**
 * Represents the AWS region for DynamoDB operations
 */
export type DynamoDbRegion = string;

/**
 * Sort key conditions for query operations
 */
export type SortKeyCondition =
  | { operator: 'begins_with'; value: string }
  | { operator: 'between'; start: string | number; end: string | number }
  | { operator: '>'; value: string | number }
  | { operator: '>='; value: string | number }
  | { operator: '<'; value: string | number }
  | { operator: '<='; value: string | number }
  | { operator: '='; value: string | number };

/**
 * Extracts the key type from a DynamoDB key schema
 */
export type KeyFromSchema<T extends DynamoDbKeySchema> = T extends readonly [
  infer PK extends DynamoDbKeyDefinition,
]
  ? {
      [K in PK[0]]: PK[1] extends 'string' ? string : number;
    }
  : T extends readonly [
        infer PK extends DynamoDbKeyDefinition,
        infer SK extends DynamoDbKeyDefinition,
      ]
    ? {
        [K in PK[0]]: PK[1] extends 'string' ? string : number;
      } & {
        [K in SK[0]]: SK[1] extends 'string' ? string : number;
      }
    : never;

/**
 * Extracts the partition key type from a DynamoDB key schema
 */
export type PartitionKeyFromSchema<T extends DynamoDbKeySchema> =
  T[0][1] extends 'string' ? string : number;

/**
 * Options for DynamoDB query operations
 */
export interface DynamoDbQueryOptions {
  /** Maximum number of items to return */
  limit?: number;
  /**
   * Whether to use strongly consistent reads
   * @default false (eventually consistent)
   */
  consistentRead?: boolean;
  /** Pagination token for continuing a previous query */
  exclusiveStartKey?: Record<string, unknown>;
  /** Whether to scan forward (true) or backward (false) */
  scanIndexForward?: boolean;
  /** Name of the index to query (for GSI/LSI queries) */
  indexName?: string;
  /** Filter expression to apply after initial query */
  filterExpression?: string;
  /** Expression attribute names for filter expression */
  expressionAttributeNames?: Record<string, string>;
  /** Expression attribute values for filter expression */
  expressionAttributeValues?: Record<string, unknown>;
}

/**
 * Options for DynamoDB scan operations
 */
export interface DynamoDbScanOptions {
  /** Maximum number of items to return */
  limit?: number;
  /**
   * Whether to use strongly consistent reads
   * @default false (eventually consistent)
   */
  consistentRead?: boolean;
  /** Pagination token for continuing a previous scan */
  exclusiveStartKey?: Record<string, unknown>;
  /** Name of the index to scan (for GSI queries) */
  indexName?: string;
  /** Filter expression to apply during scan */
  filterExpression?: string;
  /** Expression attribute names for filter expression */
  expressionAttributeNames?: Record<string, string>;
  /** Expression attribute values for filter expression */
  expressionAttributeValues?: Record<string, unknown>;
  /** Number of parallel scan segments (for parallel scans) */
  totalSegments?: number;
  /** Current segment number (for parallel scans) */
  segment?: number;
}

/**
 * Result wrapper for paginated operations
 */
export interface DynamoDbPaginatedResult<T> {
  /** Array of items matching the query/scan */
  items: T[];
  /** Pagination token for retrieving the next page, undefined if no more pages */
  lastEvaluatedKey?: Record<string, unknown>;
  /** Number of items returned */
  count: number;
  /** Total number of items examined (before filtering) */
  scannedCount: number;
}

/**
 * Options for DynamoDB put operations
 */
export interface DynamoDbPutOptions {
  /** Condition expression that must be satisfied for the put to succeed */
  conditionExpression?: string;
  /** Expression attribute names for condition expression */
  expressionAttributeNames?: Record<string, string>;
  /** Expression attribute values for condition expression */
  expressionAttributeValues?: Record<string, unknown>;
  /** What to return if the operation succeeds */
  returnValues?: 'NONE' | 'ALL_OLD';
}

/**
 * Options for DynamoDB update operations
 */
export interface DynamoDbUpdateOptions {
  /** Update expression defining how to modify the item */
  updateExpression: string;
  /** Condition expression that must be satisfied for the update to succeed */
  conditionExpression?: string;
  /** Expression attribute names for update/condition expressions */
  expressionAttributeNames?: Record<string, string>;
  /** Expression attribute values for update/condition expressions */
  expressionAttributeValues?: Record<string, unknown>;
  /** What to return after the update */
  returnValues?: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW';
}

/**
 * Options for DynamoDB delete operations
 */
export interface DynamoDbDeleteOptions {
  /** Condition expression that must be satisfied for the delete to succeed */
  conditionExpression?: string;
  /** Expression attribute names for condition expression */
  expressionAttributeNames?: Record<string, string>;
  /** Expression attribute values for condition expression */
  expressionAttributeValues?: Record<string, unknown>;
  /** What to return if the delete succeeds */
  returnValues?: 'NONE' | 'ALL_OLD';
}

/**
 * Standardized DynamoDB service errors
 */
export class DynamoDbError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'DynamoDbError';
  }
}

export class DynamoDbNotFoundError extends DynamoDbError {
  constructor(message: string = 'The requested item was not found') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'DynamoDbNotFoundError';
  }
}

export class DynamoDbConditionalCheckFailedError extends DynamoDbError {
  constructor(message: string = 'Conditional check failed') {
    super(message, 'CONDITIONAL_CHECK_FAILED', 400);
    this.name = 'DynamoDbConditionalCheckFailedError';
  }
}

export class DynamoDbValidationError extends DynamoDbError {
  constructor(message: string = 'Item validation failed') {
    super(message, 'VALIDATION_ERROR', 422);
    this.name = 'DynamoDbValidationError';
  }
}

export class DynamoDbTableNotFoundError extends DynamoDbError {
  constructor(message: string = 'Table not found') {
    super(message, 'TABLE_NOT_FOUND', 404);
    this.name = 'DynamoDbTableNotFoundError';
  }
}

export class DynamoDbTransactionCancelledError extends DynamoDbError {
  constructor(message: string = 'Transaction was cancelled') {
    super(message, 'TRANSACTION_CANCELLED', 400);
    this.name = 'DynamoDbTransactionCancelledError';
  }
}

/**
 * Query builder for type-safe DynamoDB queries
 */
export interface IDynamoDbQueryBuilder<
  T,
  TKeySchema extends DynamoDbKeySchema,
> {
  /**
   * Add a sort key condition to the query
   */
  addSortKey(condition: SortKeyCondition): IDynamoDbQueryBuilder<T, TKeySchema>;

  /**
   * Add a sort key condition using string expression (for complex conditions)
   */
  sortKeyExpression(
    expression: string,
    expressionAttributeValues?: Record<string, unknown>,
  ): IDynamoDbQueryBuilder<T, TKeySchema>;

  /**
   * Set the maximum number of items to return
   */
  limit(count: number): IDynamoDbQueryBuilder<T, TKeySchema>;

  /**
   * Use strongly consistent reads
   */
  consistentRead(): IDynamoDbQueryBuilder<T, TKeySchema>;

  /**
   * Set pagination token for continuing a previous query
   */
  startFrom(
    exclusiveStartKey: Record<string, unknown>,
  ): IDynamoDbQueryBuilder<T, TKeySchema>;

  /**
   * Scan backward instead of forward
   */
  scanBackward(): IDynamoDbQueryBuilder<T, TKeySchema>;

  /**
   * Query a specific index
   */
  index(indexName: string): IDynamoDbQueryBuilder<T, TKeySchema>;

  /**
   * Add a filter expression
   */
  filter(
    expression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, unknown>,
  ): IDynamoDbQueryBuilder<T, TKeySchema>;

  /**
   * Execute the query
   */
  execute(): Promise<DynamoDbPaginatedResult<T>>;
}

/**
 * Scan builder for type-safe DynamoDB scans
 */
export interface IDynamoDbScanBuilder<T> {
  /**
   * Set the maximum number of items to return
   */
  limit(count: number): IDynamoDbScanBuilder<T>;

  /**
   * Use strongly consistent reads
   */
  consistentRead(): IDynamoDbScanBuilder<T>;

  /**
   * Set pagination token for continuing a previous scan
   */
  startFrom(
    exclusiveStartKey: Record<string, unknown>,
  ): IDynamoDbScanBuilder<T>;

  /**
   * Scan a specific index
   */
  index(indexName: string): IDynamoDbScanBuilder<T>;

  /**
   * Add a filter expression
   */
  filter(
    expression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, unknown>,
  ): IDynamoDbScanBuilder<T>;

  /**
   * Configure parallel scanning
   */
  parallel(totalSegments: number, segment: number): IDynamoDbScanBuilder<T>;

  /**
   * Execute the scan
   */
  execute(): Promise<DynamoDbPaginatedResult<T>>;
}

/**
 * ## DynamoDB Service Interface
 *
 * This interface provides a comprehensive, type-safe abstraction over AWS DynamoDB operations
 * with improved type safety, standardized error handling, and builder patterns for complex operations.
 *
 * ### Key Features:
 * - **Type Safety**: All operations are validated against a Zod schema with compile-time key validation
 * - **Stage-Aware**: Table names must follow the `{stage}-{tableName}` pattern
 * - **Flexible Keys**: Supports both partition-key-only and partition+sort key tables
 * - **Index Support**: Full support for GSI and LSI operations
 * - **Pagination**: Built-in pagination support for query and scan operations
 * - **Conditional Operations**: Support for condition expressions on all write operations
 * - **Error Handling**: Standardized error types for consistent error handling
 *
 * ### Constructor Parameters:
 * The implementing class should accept these parameters in its constructor:
 *
 * 1. **tableName**: `DynamoDbTableName` - Must be in format `{stage}-{tableName}` where stage is 'dev' | 'staging' | 'prod'
 * 2. **keySchema**: `DynamoDbKeySchema` - Either:
 *    - Single partition key: `[['userId', 'string']]`
 *    - Partition + sort key: `[['userId', 'string'], ['timestamp', 'number']]`
 * 3. **schema**: `ZodType<T>` - Zod schema for validating all items
 * 4. **indexes?**: `DynamoDbIndexConfiguration | undefined` - Optional index definitions:
 *    ```typescript
 *    {
 *      'by-email': [['email', 'string']],           // GSI with partition key only
 *      'by-status': [['status', 'string'], ['createdAt', 'number']]  // GSI with partition + sort key
 *    }
 *    ```
 * 5. **region?**: `DynamoDbRegion` - AWS region (defaults to 'us-east-2')
 *
 * ### Usage Examples:
 *
 * ```typescript
 * // User table with single partition key
 * const userService = new DynamoDbService(
 *   'prod-users',
 *   [['userId', 'string']],
 *   UserSchema,
 *   { 'by-email': [['email', 'string']] }
 * );
 *
 * // Type-safe key usage
 * const user = await userService.getItem({ userId: 'user123' }); // ✅ Correct
 * // const user = await userService.getItem({ wrongKey: 'value' }); // ❌ Compile error
 *
 * // Fluent query builder
 * const messages = await userService.query('chat123')
 *   .sortKey({ operator: '>', value: Date.now() - 86400000 })
 *   .limit(50)
 *   .consistentRead()
 *   .execute();
 *
 * // Complex scan with streaming
 * const stream = userService.scanStream()
 *   .filter('#status = :status', { '#status': 'status' }, { ':status': 'active' })
 *   .parallel(4, 0); // Process segment 0 of 4
 *
 * for await (const batch of stream) {
 *   console.log(`Processing ${batch.length} items`);
 *   // Process batch...
 * }
 * ```
 */
export interface IDynamoDbService<
  T extends Record<string, unknown> = {},
  TKeySchema extends DynamoDbKeySchema = DynamoDbKeySchema,
> {
  /**
   * Retrieves a single item by its primary key
   *
   * @param key - Primary key values, now type-safe based on the table's key schema
   * @param consistentRead - Whether to use strongly consistent reads (default: false)
   * @returns Promise resolving to the item if found, undefined if not found
   * @throws {DynamoDbTableNotFoundError} When the table doesn't exist
   * @throws {DynamoDbValidationError} When the key doesn't match the table's key schema
   *
   * @example
   * ```typescript
   * const user = await service.getItem({ userId: 'user123' }); // Type-safe!
   * if (user) {
   *   console.log('Found user:', user.name);
   * }
   * ```
   */
  getItem(
    key: KeyFromSchema<TKeySchema>,
    consistentRead?: boolean,
  ): Promise<T | undefined>;

  /**
   * Creates or completely replaces an item
   *
   * @param item - The item to store (must conform to the schema)
   * @param options - Optional parameters for conditional puts and return values
   * @returns Promise resolving to the previous item if returnValues is set
   * @throws {DynamoDbConditionalCheckFailedError} When condition expression fails
   * @throws {DynamoDbValidationError} When item doesn't match the schema
   *
   * @example
   * ```typescript
   * // Simple put
   * await service.putItem({ userId: 'user123', name: 'John', email: 'john@example.com' });
   *
   * // Conditional put (only if item doesn't exist)
   * await service.putItem(
   *   { userId: 'user123', name: 'John' },
   *   {
   *     conditionExpression: 'attribute_not_exists(userId)',
   *     returnValues: 'ALL_OLD'
   *   }
   * );
   * ```
   */
  putItem(item: T, options?: DynamoDbPutOptions): Promise<T | undefined>;

  /**
   * Updates specific attributes of an existing item
   *
   * @param key - Primary key identifying the item to update (type-safe)
   * @param options - Update expression and optional conditions
   * @returns Promise resolving to the updated item (based on returnValues)
   * @throws {DynamoDbConditionalCheckFailedError} When condition expression fails
   * @throws {DynamoDbValidationError} When the resulting item doesn't match the schema
   * @throws {DynamoDbNotFoundError} When the item to update doesn't exist
   *
   * @example
   * ```typescript
   * const updated = await service.updateItem(
   *   { userId: 'user123' },
   *   {
   *     updateExpression: 'SET #name = :name, #updatedAt = :now',
   *     expressionAttributeNames: { '#name': 'name', '#updatedAt': 'updatedAt' },
   *     expressionAttributeValues: { ':name': 'John Doe', ':now': Date.now() },
   *     returnValues: 'ALL_NEW'
   *   }
   * );
   * ```
   */
  updateItem(
    key: KeyFromSchema<TKeySchema>,
    options: DynamoDbUpdateOptions,
  ): Promise<T | undefined>;

  /**
   * Deletes an item by its primary key
   *
   * @param key - Primary key identifying the item to delete (type-safe)
   * @param options - Optional conditions and return values
   * @returns Promise resolving to the deleted item if returnValues is set
   * @throws {DynamoDbConditionalCheckFailedError} When condition expression fails
   * @throws {DynamoDbNotFoundError} When the item to delete doesn't exist
   *
   * @example
   * ```typescript
   * // Simple delete
   * await service.deleteItem({ userId: 'user123' });
   *
   * // Conditional delete with return value
   * const deleted = await service.deleteItem(
   *   { userId: 'user123' },
   *   {
   *     conditionExpression: 'attribute_exists(userId)',
   *     returnValues: 'ALL_OLD'
   *   }
   * );
   * ```
   */
  deleteItem(
    key: KeyFromSchema<TKeySchema>,
    options?: DynamoDbDeleteOptions,
  ): Promise<T | undefined>;

  /**
   * Creates a fluent query builder for type-safe querying
   *
   * @param partitionKeyValue - Value for the partition key (type-safe)
   * @returns Query builder for chaining operations
   *
   * @example
   * ```typescript
   * // Simple query
   * const result = await service.query('chat123').execute();
   *
   * // Complex query with conditions
   * const messages = await service.query('chat123')
   *   .sortKey({ operator: 'between', start: 1000, end: 2000 })
   *   .limit(50)
   *   .consistentRead()
   *   .index('by-timestamp')
   *   .execute();
   * ```
   */
  query(
    partitionKeyValue: PartitionKeyFromSchema<TKeySchema>,
  ): IDynamoDbQueryBuilder<T, TKeySchema>;

  /**
   * Creates a fluent scan builder for type-safe scanning
   *
   * @returns Scan builder for chaining operations
   *
   * @example
   * ```typescript
   * // Simple scan
   * const result = await service.scan().execute();
   *
   * // Filtered scan
   * const activeUsers = await service.scan()
   *   .filter('#status = :status', { '#status': 'status' }, { ':status': 'active' })
   *   .limit(100)
   *   .execute();
   * ```
   */
  scan(): IDynamoDbScanBuilder<T>;

  /**
   * Creates a streaming scan for processing large datasets
   *
   * @returns Async generator that yields batches of items
   * @throws {DynamoDbTableNotFoundError} When the table doesn't exist
   *
   * @example
   * ```typescript
   * const stream = service.scanStream()
   *   .filter('#status = :status', { '#status': 'status' }, { ':status': 'active' })
   *   .parallel(4, 0); // Process segment 0 of 4
   *
   * for await (const batch of stream) {
   *   console.log(`Processing ${batch.length} items`);
   *   // Process batch without loading everything into memory
   * }
   * ```
   */
  scanStream(): IDynamoDbScanBuilder<T> & {
    [Symbol.asyncIterator](): AsyncIterator<T[]>;
  };

  /**
   * Executes a batch write operation (put and/or delete multiple items)
   *
   * Can process up to 25 items per batch. Automatically handles unprocessed items
   * through exponential backoff retry logic.
   *
   * @param operations - Array of batch operations with type-safe keys
   * @returns Promise resolving when all operations complete
   * @throws {DynamoDbValidationError} When any item doesn't match the schema
   * @throws {DynamoDbTableNotFoundError} When the table doesn't exist
   *
   * @example
   * ```typescript
   * await service.batchWrite([
   *   { operation: 'put', item: { userId: 'user1', name: 'Alice' } },
   *   { operation: 'put', item: { userId: 'user2', name: 'Bob' } },
   *   { operation: 'delete', key: { userId: 'user3' } } // Type-safe key
   * ]);
   * ```
   */
  batchWrite(
    operations: Array<
      | { operation: 'put'; item: T }
      | { operation: 'delete'; key: KeyFromSchema<TKeySchema> }
    >,
  ): Promise<void>;

  /**
   * Executes a batch get operation (retrieve multiple items by key)
   *
   * Can retrieve up to 100 items per batch. Items are returned in arbitrary order.
   *
   * @param keys - Array of primary keys to retrieve (type-safe)
   * @param consistentRead - Whether to use strongly consistent reads
   * @returns Promise resolving to array of found items (may be fewer than requested)
   * @throws {DynamoDbTableNotFoundError} When the table doesn't exist
   *
   * @example
   * ```typescript
   * const users = await service.batchGet([
   *   { userId: 'user1' },
   *   { userId: 'user2' },
   *   { userId: 'user3' }
   * ]); // All keys are type-safe
   * ```
   */
  batchGet(
    keys: Array<KeyFromSchema<TKeySchema>>,
    consistentRead?: boolean,
  ): Promise<T[]>;

  /**
   * Creates a transaction that groups multiple operations for atomic execution
   *
   * All operations succeed or all fail. Useful for maintaining data consistency
   * across multiple items or tables.
   *
   * @param operations - Array of transactional operations with type-safe keys
   * @returns Promise resolving when the transaction completes
   * @throws {DynamoDbTransactionCancelledError} When transaction conditions fail
   * @throws {DynamoDbValidationError} When any item doesn't match the schema
   *
   * @example
   * ```typescript
   * await service.transactWrite([
   *   {
   *     operation: 'put',
   *     item: { userId: 'user1', balance: 100 },
   *     conditionExpression: 'attribute_not_exists(userId)'
   *   },
   *   {
   *     operation: 'update',
   *     key: { accountId: 'acc1' }, // Type-safe
   *     updateExpression: 'ADD balance :amount',
   *     expressionAttributeValues: { ':amount': -100 }
   *   }
   * ]);
   * ```
   */
  transactWrite(
    operations: Array<{
      operation: 'put' | 'update' | 'delete' | 'conditionCheck';
      item?: T;
      key?: KeyFromSchema<TKeySchema>;
      updateExpression?: string;
      conditionExpression?: string;
      expressionAttributeNames?: Record<string, string>;
      expressionAttributeValues?: Record<string, unknown>;
    }>,
  ): Promise<void>;

  /**
   * Gets the total number of items in the table (approximate)
   *
   * Note: This count is eventually consistent and may not reflect recent writes.
   *
   * @returns Promise resolving to approximate item count
   * @throws {DynamoDbTableNotFoundError} When the table doesn't exist
   *
   * @example
   * ```typescript
   * const count = await service.getItemCount();
   * console.log(`Table contains approximately ${count} items`);
   * ```
   */
  getItemCount(): Promise<number>;
}
