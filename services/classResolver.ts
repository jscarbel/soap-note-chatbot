type Constructable<T = {}, TArgs extends ReadonlyArray<unknown> = []> = new (
  ...args: TArgs
) => T;

type Factory<T = {}> = () => T;

/**
 * **Class Resolver** - Returns a constructor that automatically switches between production
 * and test class implementations based on environment variables.
 *
 * This utility function helps you write cleaner code by automatically choosing which class
 * constructor to return based on your current environment (development, test, production, etc.).
 * It's particularly useful for dependency injection and testing scenarios.
 *
 * The returned constructor can be instantiated normally with `new`, and it will create
 * an instance of the appropriate class based on the environment.
 *
 * @example
 * ```typescript
 * // Define your resolver for parameterless constructors
 * const UserService = classResolver<IUserService>(
 *   ProdUserService,
 *   MockUserService,
 * );
 *
 * // Later, instantiate it
 * const userService = new UserService();
 * ```
 */
export function classResolver<
  T = {},
  TArgs extends ReadonlyArray<unknown> = [],
>(
  prodClass: Constructable<T, TArgs>,
  testClass: Constructable<T, TArgs>,
): Constructable<T, TArgs>;

/**
 * **Factory Resolver** - Returns a factory function that automatically switches between production
 * and test implementations based on environment variables.
 *
 * Use this overload when your classes require constructor parameters.
 *
 * @example
 * ```typescript
 * // Define your resolver for parameterized constructors
 * const createDynamoDbService = classResolver<IDynamoDbService>(
 *   (...args) => new ProdDynamoDbService(...args),
 *   (...args) => new MockDynamoDBService(...args),
 * );
 *
 * // Later, create an instance with parameters
 * const service = createDynamoDbService('prod-users', keySchema, schema);
 * ```
 */
export function classResolver<T = {}>(
  prodFactory: Factory<T>,
  testFactory: Factory<T>,
): Factory<T>;

export function classResolver<T = {}>(
  prodImplementation: Constructable<T> | Factory<T>,
  testImplementation: Constructable<T> | Factory<T>,
): Constructable<T> | Factory<T> {
  const classResolverOverride = process.env.CLASS_RESOLVER_OVERRIDE;
  const nodeEnv = process.env.NODE_ENV;

  if (classResolverOverride !== undefined) {
    switch (classResolverOverride.toLowerCase()) {
      case 'test': {
        return testImplementation;
      }
      case 'prod':
      case 'production':
        return prodImplementation;
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
        return prodImplementation;
      case 'dev':
      case 'development':
      case 'test':
        return testImplementation;
      default: {
        console.warn(
          `Unknown NODE_ENV value: ${nodeEnv}. Returning production implementation`,
        );
        return prodImplementation;
      }
    }
  }

  console.warn(
    'Could not determine NODE_ENV or CLASS_RESOLVER_OVERRIDE. ' +
      'Defaulting to production service implementation.',
  );
  return prodImplementation;
}
