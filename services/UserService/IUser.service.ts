import { Email } from '../../models/email.model';
import { User, UserId } from '../../models/user.model';

export interface IUserService {
  /**
   * Retrieve a user by their unique email address
   */
  getUserByEmail(email: Email): Promise<User | undefined>;

  /**
   * Retrieve a user by their unique user ID
   */
  getUserById(userId: UserId): Promise<User | undefined>;

  /**
   * Create a new user with the provided information
   * @throws {ConflictError} When a user with the same email already exists
   */
  createUser(userData: Omit<User, 'id'>): Promise<User>;

  /**
   * Update an existing user's information
   * @throws {NotFoundError} When the user doesn't exist
   */
  updateUser(userId: UserId, updates: Partial<Omit<User, 'id'>>): Promise<User>;

  /**
   * Delete a user by their ID
   * @throws {NotFoundError} When the user doesn't exist
   */
  deleteUser(userId: UserId): Promise<void>;

  /**
   * Check if a user exists by email
   */
  userExistsByEmail(email: Email): Promise<boolean>;

  /**
   * Check if a user exists by ID
   */
  userExistsById(userId: UserId): Promise<boolean>;

  /**
   * Get all users (with optional pagination)
   */
  getAllUsers(options?: {
    limit?: number;
    exclusiveStartKey?: Record<string, unknown>;
  }): Promise<{
    users: User[];
    lastEvaluatedKey?: Record<string, unknown>;
    count: number;
  }>;

  /**
   * Get user count
   */
  getUserCount(): Promise<number>;
}
