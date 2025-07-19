import { Email } from '../../models/email.model';
import { User, UserId } from '../../models/user.model';
import { ConflictError, NotFoundError } from '../../utils/errors';
import { DynamoDbService } from '../DynamoDbService';
import { IUserService } from './IUser.service';

export class ProdUserService implements IUserService {
  private readonly userDb = DynamoDbService(
    'prod-users' as const,
    [['id', 'string']] as const,
    User.schema,
    {
      'email-index': [['email', 'string']] as const,
    },
  );

  async getUserByEmail(email: Email): Promise<User | undefined> {
    try {
      const result = await this.userDb
        .scan()
        .index('email-index')
        .filter('#email = :email', { '#email': 'email' }, { ':email': email })
        .limit(1)
        .execute();

      return result.items[0];
    } catch (error) {
      throw error;
    }
  }

  async getUserById(userId: UserId): Promise<User | undefined> {
    try {
      return await this.userDb.getItem({ id: userId });
    } catch (error) {
      throw error;
    }
  }

  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    try {
      // Check if user already exists with this email
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        throw new ConflictError('A user with this email already exists');
      }

      const newUser: User = {
        id: UserId.generate(),
        ...userData,
      };

      await this.userDb.putItem(newUser);
      return newUser;
    } catch (error) {
      throw error;
    }
  }

  async updateUser(
    userId: UserId,
    updates: Partial<Omit<User, 'id'>>,
  ): Promise<User> {
    try {
      // First verify the user exists
      const existingUser = await this.getUserById(userId);
      if (!existingUser) {
        throw new NotFoundError(`User with ID ${userId} not found`);
      }

      // If email is being updated, check for conflicts
      if (updates.email && updates.email !== existingUser.email) {
        const conflictingUser = await this.getUserByEmail(updates.email);
        if (conflictingUser && conflictingUser.id !== userId) {
          throw new ConflictError('A user with this email already exists');
        }
      }

      // Build update expression dynamically
      const updateParts: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, unknown> = {};

      if (updates.name !== undefined) {
        updateParts.push('#name = :name');
        expressionAttributeNames['#name'] = 'name';
        expressionAttributeValues[':name'] = updates.name;
      }

      if (updates.email !== undefined) {
        updateParts.push('#email = :email');
        expressionAttributeNames['#email'] = 'email';
        expressionAttributeValues[':email'] = updates.email;
      }

      if (updateParts.length === 0) {
        // No updates to make, return existing user
        return existingUser;
      }

      const updateExpression = `SET ${updateParts.join(', ')}`;

      const updatedUser = await this.userDb.updateItem(
        { id: userId },
        {
          updateExpression,
          expressionAttributeNames,
          expressionAttributeValues,
          returnValues: 'ALL_NEW',
        },
      );

      if (!updatedUser) {
        throw new Error('Failed to update user');
      }

      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  async deleteUser(userId: UserId): Promise<void> {
    try {
      const existingUser = await this.getUserById(userId);
      if (!existingUser) {
        throw new NotFoundError(`User with ID ${userId} not found`);
      }

      await this.userDb.deleteItem({ id: userId });
    } catch (error) {
      throw error;
    }
  }

  async userExistsByEmail(email: Email): Promise<boolean> {
    try {
      const user = await this.getUserByEmail(email);
      return user !== undefined;
    } catch (error) {
      throw error;
    }
  }

  async userExistsById(userId: UserId): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      return user !== undefined;
    } catch (error) {
      throw error;
    }
  }

  async getAllUsers(options?: {
    limit?: number;
    exclusiveStartKey?: Record<string, unknown>;
  }): Promise<{
    users: User[];
    lastEvaluatedKey?: Record<string, unknown>;
    count: number;
  }> {
    try {
      let scanBuilder = this.userDb.scan();

      if (options?.limit) {
        scanBuilder = scanBuilder.limit(options.limit);
      }

      if (options?.exclusiveStartKey) {
        scanBuilder = scanBuilder.startFrom(options.exclusiveStartKey);
      }

      const result = await scanBuilder.execute();

      return {
        users: result.items,
        lastEvaluatedKey: result.lastEvaluatedKey,
        count: result.count,
      };
    } catch (error) {
      throw error;
    }
  }

  async getUserCount(): Promise<number> {
    try {
      return await this.userDb.getItemCount();
    } catch (error) {
      throw error;
    }
  }
}
