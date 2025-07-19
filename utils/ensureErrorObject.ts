/**
 *
 * @description Utility function to guarantee that an error is an {@link Error} object.
 *
 * @info this is **not** throwing anything, but rather just ensuring
 * that a caught exception is actually returning an instance of
 * the error class. In JavaScript, anything can be thrown, so therte's no
 * guarantee that the exception is going to be an error object
 * without adding logic like this
 *
 * @example
 * ```typescript
 * try {
 *   await someCodeThatThrows();
 * } catch(e: unknown) {
 *   const error = ensureErrorObject(e); // error is now guaranteed to be an Error object
 *   // and now you can do anything you want with the Error
 *   this.logger.error(error)
 * }
 */
export const ensureErrorObject = (e: unknown): Error => {
  if (e instanceof Error) {
    return e;
  }

  if (e === undefined) return new Error('Unknown error');
  if (e === null) return new Error('null');
  if (typeof e === 'symbol') return new Error(e.toString());

  try {
    return new Error(JSON.stringify(e));
  } catch (err: unknown) {
    console.error('Could not stringify error', err);
    try {
      return new Error(e?.toString() ?? 'Unknown error');
    } catch (toStringErr: unknown) {
      return new Error('Unknown error');
    }
  }
};
