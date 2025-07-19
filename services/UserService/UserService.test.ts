import { beforeEach, describe, expect, it } from 'vitest';
import { Email } from '../../models/email.model';
import { User, UserId } from '../../models/user.model';
import { ConflictError, NotFoundError } from '../../utils/errors';
import { UserService } from './index';
import { IUserService } from './IUser.service';

describe('UserService', () => {
  let userService: IUserService;

  // Test data factories
  const createTestEmail = (localPart = 'test'): Email =>
    Email.parse(`${localPart}@example.com`);

  const createTestUser = (
    overrides: Partial<Omit<User, 'id'>> = {},
  ): Omit<User, 'id'> => ({
    name: 'John Doe',
    email: createTestEmail('john'),
    ...overrides,
  });

  beforeEach(() => {
    // Clear mock storage before each test
    const globalMockStorage = (
      globalThis as unknown as {
        globalMockStorage: Map<string, Map<string, Record<string, unknown>>>;
      }
    ).globalMockStorage;
    if (globalMockStorage) {
      globalMockStorage.clear();
    }

    userService = new UserService();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = createTestUser();

      const createdUser = await userService.createUser(userData);

      expect(createdUser.id).toBeDefined();
      expect(createdUser.name).toBe(userData.name);
      expect(createdUser.email).toBe(userData.email);
      expect(UserId.schema.safeParse(createdUser.id).success).toBe(true);
    });

    it('should throw ConflictError when creating user with existing email', async () => {
      const userData = createTestUser();

      // Create first user
      await userService.createUser(userData);

      // Attempt to create second user with same email
      await expect(userService.createUser(userData)).rejects.toThrow(
        ConflictError,
      );
    });

    it('should validate user data against schema', async () => {
      const invalidUserData = {
        name: '',
        email: 'invalid-email' as Email,
      };

      await expect(userService.createUser(invalidUserData)).rejects.toThrow();
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const userData = createTestUser();
      const createdUser = await userService.createUser(userData);

      const foundUser = await userService.getUserById(createdUser.id);

      expect(foundUser).toEqual(createdUser);
    });

    it('should return undefined when user not found', async () => {
      const nonExistentId = UserId.generate();

      const result = await userService.getUserById(nonExistentId);

      expect(result).toBeUndefined();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found by email', async () => {
      const userData = createTestUser();
      const createdUser = await userService.createUser(userData);

      const foundUser = await userService.getUserByEmail(userData.email);

      expect(foundUser).toEqual(createdUser);
    });

    it('should return undefined when user not found by email', async () => {
      const nonExistentEmail = createTestEmail('nonexistent');

      const result = await userService.getUserByEmail(nonExistentEmail);

      expect(result).toBeUndefined();
    });
  });

  describe('updateUser', () => {
    it('should update user name successfully', async () => {
      const userData = createTestUser();
      const createdUser = await userService.createUser(userData);

      const updatedUser = await userService.updateUser(createdUser.id, {
        name: 'Jane Smith',
      });

      expect(updatedUser.id).toBe(createdUser.id);
      expect(updatedUser.name).toBe('Jane Smith');
      expect(updatedUser.email).toBe(createdUser.email);
    });

    it('should update user email successfully', async () => {
      const userData = createTestUser();
      const createdUser = await userService.createUser(userData);
      const newEmail = createTestEmail('jane');

      const updatedUser = await userService.updateUser(createdUser.id, {
        email: newEmail,
      });

      expect(updatedUser.id).toBe(createdUser.id);
      expect(updatedUser.name).toBe(createdUser.name);
      expect(updatedUser.email).toBe(newEmail);
    });

    it('should update multiple fields at once', async () => {
      const userData = createTestUser();
      const createdUser = await userService.createUser(userData);
      const newEmail = createTestEmail('updated');

      const updatedUser = await userService.updateUser(createdUser.id, {
        name: 'Updated Name',
        email: newEmail,
      });

      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.email).toBe(newEmail);
    });

    it('should throw NotFoundError when updating non-existent user', async () => {
      const nonExistentId = UserId.generate();

      await expect(
        userService.updateUser(nonExistentId, { name: 'New Name' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when updating to existing email', async () => {
      const user1Data = createTestUser({ email: createTestEmail('user1') });
      const user2Data = createTestUser({ email: createTestEmail('user2') });

      const user1 = await userService.createUser(user1Data);
      const user2 = await userService.createUser(user2Data);

      // Try to update user2's email to user1's email
      await expect(
        userService.updateUser(user2.id, { email: user1.email }),
      ).rejects.toThrow(ConflictError);
    });

    it('should return unchanged user when no updates provided', async () => {
      const userData = createTestUser();
      const createdUser = await userService.createUser(userData);

      const result = await userService.updateUser(createdUser.id, {});

      expect(result).toEqual(createdUser);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const userData = createTestUser();
      const createdUser = await userService.createUser(userData);

      await userService.deleteUser(createdUser.id);

      const deletedUser = await userService.getUserById(createdUser.id);
      expect(deletedUser).toBeUndefined();
    });

    it('should throw NotFoundError when deleting non-existent user', async () => {
      const nonExistentId = UserId.generate();

      await expect(userService.deleteUser(nonExistentId)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('userExistsByEmail', () => {
    it('should return true when user exists', async () => {
      const userData = createTestUser();
      await userService.createUser(userData);

      const exists = await userService.userExistsByEmail(userData.email);

      expect(exists).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      const nonExistentEmail = createTestEmail('nonexistent');

      const exists = await userService.userExistsByEmail(nonExistentEmail);

      expect(exists).toBe(false);
    });
  });

  describe('userExistsById', () => {
    it('should return true when user exists', async () => {
      const userData = createTestUser();
      const createdUser = await userService.createUser(userData);

      const exists = await userService.userExistsById(createdUser.id);

      expect(exists).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      const nonExistentId = UserId.generate();

      const exists = await userService.userExistsById(nonExistentId);

      expect(exists).toBe(false);
    });
  });

  describe('getAllUsers', () => {
    it('should return all users when no options provided', async () => {
      const users = [
        createTestUser({ email: createTestEmail('user1') }),
        createTestUser({ email: createTestEmail('user2') }),
        createTestUser({ email: createTestEmail('user3') }),
      ];

      const createdUsers = await Promise.all(
        users.map((userData) => userService.createUser(userData)),
      );

      const result = await userService.getAllUsers();

      expect(result.users).toHaveLength(3);
      expect(result.count).toBe(3);
      expect(result.users.map((u) => u.id).sort()).toEqual(
        createdUsers.map((u) => u.id).sort(),
      );
    });

    it('should respect limit option', async () => {
      const users = [
        createTestUser({ email: createTestEmail('user1') }),
        createTestUser({ email: createTestEmail('user2') }),
        createTestUser({ email: createTestEmail('user3') }),
      ];

      await Promise.all(
        users.map((userData) => userService.createUser(userData)),
      );

      const result = await userService.getAllUsers({ limit: 2 });

      expect(result.users).toHaveLength(2);
      expect(result.count).toBe(2);
    });

    it('should return empty array when no users exist', async () => {
      const result = await userService.getAllUsers();

      expect(result.users).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('getUserCount', () => {
    it('should return correct count of users', async () => {
      const initialCount = await userService.getUserCount();
      expect(initialCount).toBe(0);

      const users = [
        createTestUser({ email: createTestEmail('user1') }),
        createTestUser({ email: createTestEmail('user2') }),
        createTestUser({ email: createTestEmail('user3') }),
      ];

      await Promise.all(
        users.map((userData) => userService.createUser(userData)),
      );

      const finalCount = await userService.getUserCount();
      expect(finalCount).toBe(3);
    });

    it('should update count after deletions', async () => {
      const userData = createTestUser();
      const createdUser = await userService.createUser(userData);

      let count = await userService.getUserCount();
      expect(count).toBe(1);

      await userService.deleteUser(createdUser.id);

      count = await userService.getUserCount();
      expect(count).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete user lifecycle', async () => {
      // Create
      const userData = createTestUser({
        name: 'Test User',
        email: createTestEmail('lifecycle'),
      });
      const createdUser = await userService.createUser(userData);

      expect(await userService.userExistsById(createdUser.id)).toBe(true);
      expect(await userService.userExistsByEmail(userData.email)).toBe(true);

      // Read
      const foundUser = await userService.getUserById(createdUser.id);
      expect(foundUser).toEqual(createdUser);

      // Update
      const updatedUser = await userService.updateUser(createdUser.id, {
        name: 'Updated User',
      });
      expect(updatedUser.name).toBe('Updated User');

      // Delete
      await userService.deleteUser(createdUser.id);
      expect(await userService.userExistsById(createdUser.id)).toBe(false);
      expect(await userService.userExistsByEmail(userData.email)).toBe(false);
    });

    it('should maintain data consistency across operations', async () => {
      const users = [
        createTestUser({ name: 'User One', email: createTestEmail('one') }),
        createTestUser({ name: 'User Two', email: createTestEmail('two') }),
        createTestUser({ name: 'User Three', email: createTestEmail('three') }),
      ];

      // Create all users
      const createdUsers = await Promise.all(
        users.map((userData) => userService.createUser(userData)),
      );

      // Verify count
      expect(await userService.getUserCount()).toBe(3);

      // Verify all can be found
      for (const user of createdUsers) {
        expect(await userService.getUserById(user.id)).toBeDefined();
        expect(await userService.getUserByEmail(user.email)).toBeDefined();
      }

      // Update one user
      await userService.updateUser(createdUsers[0]!.id, {
        name: 'Updated User One',
      });

      // Delete one user
      await userService.deleteUser(createdUsers[1]!.id);

      // Verify final state
      expect(await userService.getUserCount()).toBe(2);

      const finalUsers = await userService.getAllUsers();
      expect(finalUsers.users).toHaveLength(2);

      const updatedUser = finalUsers.users.find(
        (u) => u.id === createdUsers[0]!.id,
      );
      expect(updatedUser?.name).toBe('Updated User One');
    });
  });
});
