export const ensureErrorObject = (e: unknown): Error => {
  if (e instanceof Error) {
    return e;
  }

  return new Error(JSON.stringify(e));
};
