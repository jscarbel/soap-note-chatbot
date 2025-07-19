type Constructable<T = {}, TArgs extends ReadonlyArray<unknown> = []> = new (
  ...args: TArgs
) => T;

/**
 * **Class Resolver** - Automatically switches between production and test class implementations
 * based on environment variables.
 *
 * This utility function helps you write cleaner code by automatically choosing which class
 * to instantiate based on your current environment (development, test, production, etc.).
 * It's particularly useful for dependency injection and testing scenarios.
 *
 * ```
 */
export function classResolver<
  T = {},
  TArgs extends ReadonlyArray<unknown> = [],
>(
  prodClass: Constructable<T, TArgs>,
  testClass: Constructable<T, TArgs>,
  ...args: TArgs
): T {
  const classResolverOverride = process.env.CLASS_RESOLVER_OVERRIDE;
  const nodeEnv = process.env.NODE_ENV;

  if (classResolverOverride !== undefined) {
    switch (classResolverOverride.toLowerCase()) {
      case 'test': {
        return new testClass(...args);
      }
      case 'prod':
      case 'production':
        return new prodClass(...args);
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
        return new prodClass(...args);
      case 'dev':
      case 'development':
      case 'test':
        return new testClass(...args);
      default: {
        console.warn(
          `Unknown NODE_ENV value: ${nodeEnv}. Returning production class`,
        );
        return new prodClass(...args);
      }
    }
  }

  console.warn(
    'Could not determine NODE_ENV or CLASS_RESOLVER_OVERRIDE. ' +
      'Defaulting ot production service class.',
  );
  return new prodClass(...args);
}
