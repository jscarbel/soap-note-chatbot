/**
 * Base HTTP error class that provides structured error handling for API routes.
 * All HTTP errors extend this class and include a statusCode property for
 * automatic HTTP response generation in catch blocks.
 *
 * @example
 * ```typescript
 * // In your route handler catch block:
 * catch (error: unknown) {
 *   if (error instanceof HttpError) {
 *     return new Response(error.message, { status: error.statusCode });
 *   }
 *   // Handle other errors...
 * }
 * ```
 */
export class HttpError extends Error {
  public readonly statusCode: number;

  /**
   * Creates a new HTTP error with the specified status code and message.
   *
   * @param statusCode - HTTP status code to return in the response
   * @param message - Error message to display (defaults to generic HTTP error message)
   * @param name - Error name for logging (defaults to class name)
   */
  constructor(
    statusCode: number,
    message: string = 'An HTTP error occurred',
    name?: string,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.name = name ?? this.constructor.name;

    // Maintains proper stack trace for where error was thrown (Node.js only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * 400 Bad Request - The server cannot process the request due to client error.
 * Use when the request syntax is invalid, parameters are missing/malformed,
 * or the request cannot be fulfilled due to bad syntax.
 *
 * @example
 * ```typescript
 * // With default message
 * throw new BadRequestError();
 *
 * // With custom message
 * throw new BadRequestError('Invalid email format provided');
 * ```
 */
export class BadRequestError extends HttpError {
  constructor(message: string = 'The request is invalid or malformed') {
    super(400, message);
  }
}

/**
 * 401 Unauthorized - Authentication is required and has failed or not been provided.
 * Use when the user needs to authenticate before accessing the resource.
 *
 * @example
 * ```typescript
 * // When JWT token is missing
 * throw new AuthenticationError('Authentication token required');
 *
 * // When token is expired
 * throw new AuthenticationError('Authentication token has expired');
 * ```
 */
export class AuthenticationError extends HttpError {
  constructor(message: string = 'Authentication required') {
    super(401, message);
  }
}

/**
 * 403 Forbidden - The server understood the request but refuses to authorize it.
 * Use when the user is authenticated but doesn't have permission for the resource.
 *
 * @example
 * ```typescript
 * // When user lacks required role
 * throw new ForbiddenError('Admin access required for this operation');
 *
 * // When accessing another user's data
 * throw new ForbiddenError('You can only access your own chat history');
 * ```
 */
export class ForbiddenError extends HttpError {
  constructor(message: string = 'Access to this resource is forbidden') {
    super(403, message);
  }
}

/**
 * 404 Not Found - The requested resource could not be found.
 * Use when a specific resource (user, chat, etc.) doesn't exist.
 *
 * @example
 * ```typescript
 * // When user not found by ID
 * throw new NotFoundError('User with ID 123 not found');
 *
 * // When chat doesn't exist
 * throw new NotFoundError(`Chat with ID ${chatId} does not exist`);
 * ```
 */
export class NotFoundError extends HttpError {
  constructor(message: string = 'The requested resource was not found') {
    super(404, message);
  }
}

/**
 * 409 Conflict - The request conflicts with the current state of the server.
 * Use when there's a conflict with existing data (duplicate email, concurrent updates, etc.).
 *
 * @example
 * ```typescript
 * // When email already exists
 * throw new ConflictError('A user with this email already exists');
 *
 * // When resource was modified by another request
 * throw new ConflictError('Resource was modified by another request');
 * ```
 */
export class ConflictError extends HttpError {
  constructor(message: string = 'The request conflicts with existing data') {
    super(409, message);
  }
}

/**
 * 422 Unprocessable Entity - The request is well-formed but contains semantic errors.
 * Use when validation fails or business logic rules are violated.
 *
 * @example
 * ```typescript
 * // When Zod validation fails
 * throw new UnprocessableEntityError('Invalid user data: name is required');
 *
 * // When business rules are violated
 * throw new UnprocessableEntityError('Cannot delete chat with active sessions');
 * ```
 */
export class UnprocessableEntityError extends HttpError {
  constructor(message: string = 'The request data could not be processed') {
    super(422, message);
  }
}

/**
 * 429 Too Many Requests - The user has sent too many requests in a given time period.
 * Use when rate limiting is exceeded or when throttling API usage.
 *
 * @example
 * ```typescript
 * // When rate limit exceeded
 * throw new TooManyRequestsError('Rate limit exceeded. Try again in 60 seconds');
 *
 * // When daily quota exceeded
 * throw new TooManyRequestsError('Daily API quota exceeded');
 * ```
 */
export class TooManyRequestsError extends HttpError {
  constructor(message: string = 'Too many requests. Please try again later') {
    super(429, message);
  }
}

/**
 * 501 Not Implemented - The server does not support the functionality required.
 * Use when a feature is not yet implemented or when certain operations
 * are not supported in the current environment.
 *
 * @example
 * ```typescript
 * // In development environment
 * throw new NotImplementedError('Email notifications not implemented in development');
 *
 * // For placeholder endpoints
 * throw new NotImplementedError('This feature is coming soon');
 * ```
 */
export class NotImplementedError extends HttpError {
  constructor(message: string = 'This functionality is not yet implemented') {
    super(501, message);
  }
}
