type Constructable<T = {}, TArgs extends ReadonlyArray<unknown> = []> = new (
  ...args: TArgs
) => T;

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
 * // Define your resolver
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
