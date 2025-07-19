import { ZodType } from 'zod';
import { classResolver } from '../classResolver';
import {
  DynamoDbIndexConfiguration,
  DynamoDbKeySchema,
  DynamoDbRegion,
  DynamoDbTableName,
  IDynamoDbService,
} from './IDynamoDb.service';
import { MockDynamoDBService } from './MockDynamoDb.service';
import { ProdDynamoDbService } from './ProdDynamoDb.service';

export function DynamoDbService<
  T extends Record<string, unknown> = Record<string, unknown>,
  TKeySchema extends DynamoDbKeySchema = DynamoDbKeySchema,
>(
  tableName: DynamoDbTableName,
  keySchema: TKeySchema,
  schema: ZodType<T>,
  indexes?: DynamoDbIndexConfiguration | undefined,
  region?: DynamoDbRegion,
): IDynamoDbService<T, TKeySchema> {
  const ServiceClass = classResolver<
    IDynamoDbService<T, TKeySchema>,
    [
      tableName: DynamoDbTableName,
      keySchema: TKeySchema,
      schema: ZodType<T>,
      indexes?: DynamoDbIndexConfiguration | undefined,
      region?: DynamoDbRegion,
    ]
  >(ProdDynamoDbService, MockDynamoDBService);

  return new ServiceClass(tableName, keySchema, schema, indexes, region);
}
