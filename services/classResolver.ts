type Constructable<T = {}, TArgs extends ReadonlyArray<unknown> = []> = new (
  ...args: TArgs
) => T;

/**
 * **Type-Safe Class Resolver** - Returns a constructor that automatically switches between
 * production and test class implementations based on environment variables.
 *
 * This utility function maintains complete type safety by using generics instead of `any`.
 * The returned constructor preserves all type information from the original classes.
 *
 * @template T - The interface or base type that both classes implement
 * @template TArgs - The constructor argument types (as a readonly tuple)
 *
 * @param prodClass - Constructor for production environment
 * @param testClass - Constructor for test/development environment
 * @returns Constructor that creates instances based on environment
 *
 * @example
 * ```typescript
 * // For services with no constructor arguments
 * const UserService = classResolver<IUserService>(
 *   ProdUserService,
 *   MockUserService,
 * );
 *
 * // For services with constructor arguments
 * const DynamoDbService = classResolver<
 *   IDynamoDbService<User>,
 *   [DynamoDbTableName, DynamoDbKeySchema, ZodType<User>]
 * >(
 *   ProdDynamoDbService,
 *   MockDynamoDBService,
 * );
 * ```
 */
export function classResolver<
  T = {},
  TArgs extends ReadonlyArray<unknown> = [],
>(
  prodClass: Constructable<T, TArgs>,
  testClass: Constructable<T, TArgs>,
): Constructable<T, TArgs> {
  const classResolverOverride = process.env.CLASS_RESOLVER_OVERRIDE;
  const nodeEnv = process.env.NODE_ENV;

  if (classResolverOverride !== undefined) {
    switch (classResolverOverride.toLowerCase()) {
      case 'test': {
        return testClass;
      }
      case 'prod':
      case 'production':
        return prodClass;
      default:
        console.warn(
          `Unknown CLASS_RESOLVER_OVERRIDE value: ${classResolverOverride}. ` +
            'Expected "test" or "prod"',
        );
    }
  }

  if (nodeEnv !== undefined) {
    switch (nodeEnv.toLowerCase()) {
      case 'prod':
      case 'production':
      case 'staging':
        return prodClass;
      case 'dev':
      case 'development':
      case 'test':
        return testClass;
      default: {
        console.warn(
          `Unknown NODE_ENV value: ${nodeEnv}. Returning production class`,
        );
        return prodClass;
      }
    }
  }

  console.warn(
    'Could not determine NODE_ENV or CLASS_RESOLVER_OVERRIDE. ' +
      'Defaulting to production service class.',
  );
  return prodClass;
}
