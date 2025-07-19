import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  DynamoDbConditionalCheckFailedError,
  DynamoDbNotFoundError,
  DynamoDbValidationError,
  IDynamoDbService,
} from './IDynamoDb.service';
import { DynamoDbService } from './index';

type TestUser = {
  readonly userId: string;
  readonly name: string;
  readonly email: string;
  readonly age: number;
  readonly status: 'active' | 'inactive';
  readonly createdAt: number;
};

type TestUserKey = {
  readonly userId: string;
};

type TestMessage = {
  readonly chatId: string;
  readonly messageId: string;
  readonly content: string;
  readonly timestamp: number;
  readonly userId: string;
};

type TestMessageKey = {
  readonly chatId: string;
  readonly messageId: string;
};

// Zod schemas
const TestUserSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().positive(),
  status: z.enum(['active', 'inactive']),
  createdAt: z.number(),
}) satisfies z.ZodType<TestUser>;

const TestMessageSchema = z.object({
  chatId: z.string(),
  messageId: z.string(),
  content: z.string(),
  timestamp: z.number(),
  userId: z.string(),
}) satisfies z.ZodType<TestMessage>;

// Test fixtures
const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  userId: 'user-123',
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  status: 'active' as const,
  createdAt: Date.now(),
  ...overrides,
});

const createTestMessage = (
  overrides: Partial<TestMessage> = {},
): TestMessage => ({
  chatId: 'chat-123',
  messageId: 'msg-123',
  content: 'Hello world',
  timestamp: Date.now(),
  userId: 'user-123',
  ...overrides,
});

describe('DynamoDbService', () => {
  let userService: IDynamoDbService<TestUser, [['userId', 'string']]>;
  let messageService: IDynamoDbService<
    TestMessage,
    [['chatId', 'string'], ['messageId', 'string']]
  >;

  beforeEach(() => {
    const globalMockStorage = (
      globalThis as unknown as {
        globalMockStorage: Map<string, Map<string, Record<string, unknown>>>;
      }
    ).globalMockStorage;
    if (globalMockStorage) {
      globalMockStorage.clear();
    }

    userService = DynamoDbService<TestUser, [['userId', 'string']]>(
      'dev-users',
      [['userId', 'string']] as const,
      TestUserSchema,
      {
        'by-email': [['email', 'string']] as const,
        'by-status': [
          ['status', 'string'],
          ['createdAt', 'number'],
        ] as const,
      },
    );

    messageService = DynamoDbService<
      TestMessage,
      [['chatId', 'string'], ['messageId', 'string']]
    >(
      'dev-messages',
      [
        ['chatId', 'string'],
        ['messageId', 'string'],
      ] as const,
      TestMessageSchema,
      {
        'by-user': [
          ['userId', 'string'],
          ['timestamp', 'number'],
        ] as const,
      },
    );
  });

  describe('getItem', () => {
    it('should return undefined for non-existent item', async () => {
      const result = await userService.getItem({ userId: 'non-existent' });
      expect(result).toBeUndefined();
    });

    it('should return item after it has been stored', async () => {
      const testUser = createTestUser();
      await userService.putItem(testUser);

      const result = await userService.getItem({ userId: testUser.userId });
      expect(result).toEqual(testUser);
    });

    it('should work with composite keys', async () => {
      const testMessage = createTestMessage();
      await messageService.putItem(testMessage);

      const result = await messageService.getItem({
        chatId: testMessage.chatId,
        messageId: testMessage.messageId,
      });
      expect(result).toEqual(testMessage);
    });

    it('should support consistent reads', async () => {
      const testUser = createTestUser();
      await userService.putItem(testUser);

      const result = await userService.getItem(
        { userId: testUser.userId },
        true,
      );
      expect(result).toEqual(testUser);
    });
  });

  describe('putItem', () => {
    it('should store a new item', async () => {
      const testUser = createTestUser();
      const result = await userService.putItem(testUser);

      expect(result).toBeUndefined();

      const stored = await userService.getItem({ userId: testUser.userId });
      expect(stored).toEqual(testUser);
    });

    it('should overwrite existing item by default', async () => {
      const testUser = createTestUser();
      await userService.putItem(testUser);

      const updatedUser = { ...testUser, name: 'Jane Doe' };
      await userService.putItem(updatedUser);

      const result = await userService.getItem({ userId: testUser.userId });
      expect(result?.name).toBe('Jane Doe');
    });

    it('should support conditional puts', async () => {
      const testUser = createTestUser();

      // First put should succeed
      await userService.putItem(testUser, {
        conditionExpression: 'attribute_not_exists(userId)',
      });

      // Second put should fail due to condition
      await expect(
        userService.putItem(testUser, {
          conditionExpression: 'attribute_not_exists(userId)',
        }),
      ).rejects.toThrow(DynamoDbConditionalCheckFailedError);
    });

    it('should return old item when requested', async () => {
      const testUser = createTestUser();
      await userService.putItem(testUser);

      const updatedUser = { ...testUser, name: 'Jane Doe' };
      const oldItem = await userService.putItem(updatedUser, {
        returnValues: 'ALL_OLD',
      });

      expect(oldItem?.name).toBe('John Doe');
    });

    it('should validate item against schema', async () => {
      const invalidUser = {
        userId: 'user-123',
        name: 'John',
        email: 'invalid-email', // Invalid email
        age: -5, // Invalid age
        status: 'unknown' as any, // Invalid status
        createdAt: Date.now(),
      };

      await expect(
        userService.putItem(invalidUser as TestUser),
      ).rejects.toThrow(DynamoDbValidationError);
    });
  });

  describe('updateItem', () => {
    it('should update existing item', async () => {
      const testUser = createTestUser();
      await userService.putItem(testUser);

      const updatedItem = await userService.updateItem(
        { userId: testUser.userId },
        {
          updateExpression: 'SET #name = :name, #age = :age',
          expressionAttributeNames: {
            '#name': 'name',
            '#age': 'age',
          },
          expressionAttributeValues: {
            ':name': 'Jane Doe',
            ':age': 25,
          },
          returnValues: 'ALL_NEW',
        },
      );

      expect(updatedItem?.name).toBe('Jane Doe');
      expect(updatedItem?.age).toBe(25);
      expect(updatedItem?.userId).toBe(testUser.userId);
    });

    it('should throw error for non-existent item', async () => {
      await expect(
        userService.updateItem(
          { userId: 'non-existent' },
          {
            updateExpression: 'SET #name = :name',
            expressionAttributeNames: { '#name': 'name' },
            expressionAttributeValues: { ':name': 'New Name' },
          },
        ),
      ).rejects.toThrow(DynamoDbNotFoundError);
    });

    it('should support conditional updates', async () => {
      const testUser = createTestUser();
      await userService.putItem(testUser);

      // Update should succeed with correct condition
      await userService.updateItem(
        { userId: testUser.userId },
        {
          updateExpression: 'SET #age = :age',
          conditionExpression: '#status = :status',
          expressionAttributeNames: {
            '#age': 'age',
            '#status': 'status',
          },
          expressionAttributeValues: {
            ':age': 31,
            ':status': 'active',
          },
        },
      );

      // Update should fail with incorrect condition
      await expect(
        userService.updateItem(
          { userId: testUser.userId },
          {
            updateExpression: 'SET #age = :age',
            conditionExpression: '#status = :status',
            expressionAttributeNames: {
              '#age': 'age',
              '#status': 'status',
            },
            expressionAttributeValues: {
              ':age': 32,
              ':status': 'inactive',
            },
          },
        ),
      ).rejects.toThrow(DynamoDbConditionalCheckFailedError);
    });

    it('should support ADD operations for numbers', async () => {
      const testUser = createTestUser({ age: 30 });
      await userService.putItem(testUser);

      const updatedItem = await userService.updateItem(
        { userId: testUser.userId },
        {
          updateExpression: 'ADD #age :increment',
          expressionAttributeNames: { '#age': 'age' },
          expressionAttributeValues: { ':increment': 5 },
          returnValues: 'ALL_NEW',
        },
      );

      expect(updatedItem?.age).toBe(35);
    });

    it('should return different values based on returnValues', async () => {
      const testUser = createTestUser();
      await userService.putItem(testUser);

      // Test ALL_OLD
      const oldItem = await userService.updateItem(
        { userId: testUser.userId },
        {
          updateExpression: 'SET #name = :name',
          expressionAttributeNames: { '#name': 'name' },
          expressionAttributeValues: { ':name': 'New Name' },
          returnValues: 'ALL_OLD',
        },
      );
      expect(oldItem?.name).toBe('John Doe');

      // Test NONE
      const noneResult = await userService.updateItem(
        { userId: testUser.userId },
        {
          updateExpression: 'SET #age = :age',
          expressionAttributeNames: { '#age': 'age' },
          expressionAttributeValues: { ':age': 25 },
          returnValues: 'NONE',
        },
      );
      expect(noneResult).toBeUndefined();
    });
  });

  describe('deleteItem', () => {
    it('should delete existing item', async () => {
      const testUser = createTestUser();
      await userService.putItem(testUser);

      await userService.deleteItem({ userId: testUser.userId });

      const result = await userService.getItem({ userId: testUser.userId });
      expect(result).toBeUndefined();
    });

    it('should throw error when deleting non-existent item', async () => {
      await expect(
        userService.deleteItem({ userId: 'non-existent' }),
      ).rejects.toThrow(DynamoDbNotFoundError);
    });

    it('should support conditional deletes', async () => {
      const testUser = createTestUser();
      await userService.putItem(testUser);

      // Delete should fail with incorrect condition
      await expect(
        userService.deleteItem(
          { userId: testUser.userId },
          {
            conditionExpression: '#status = :status',
            expressionAttributeNames: { '#status': 'status' },
            expressionAttributeValues: { ':status': 'inactive' },
          },
        ),
      ).rejects.toThrow(DynamoDbConditionalCheckFailedError);

      // Delete should succeed with correct condition
      const deletedItem = await userService.deleteItem(
        { userId: testUser.userId },
        {
          conditionExpression: '#status = :status',
          expressionAttributeNames: { '#status': 'status' },
          expressionAttributeValues: { ':status': 'active' },
          returnValues: 'ALL_OLD',
        },
      );

      expect(deletedItem).toEqual(testUser);
    });
  });

  describe('query', () => {
    it('should query items by partition key', async () => {
      const messages = [
        createTestMessage({ messageId: 'msg-1', content: 'First message' }),
        createTestMessage({ messageId: 'msg-2', content: 'Second message' }),
        createTestMessage({
          chatId: 'chat-456',
          messageId: 'msg-3',
          content: 'Different chat',
        }),
      ];

      for (const message of messages) {
        await messageService.putItem(message);
      }

      const result = await messageService.query('chat-123').execute();

      expect(result.items).toHaveLength(2);
      expect(result.items.every((item) => item.chatId === 'chat-123')).toBe(
        true,
      );
      expect(result.count).toBe(2);
    });

    it('should support sort key conditions', async () => {
      const messages = [
        createTestMessage({ messageId: 'msg-1', timestamp: 1000 }),
        createTestMessage({ messageId: 'msg-2', timestamp: 2000 }),
        createTestMessage({ messageId: 'msg-3', timestamp: 3000 }),
      ];

      for (const message of messages) {
        await messageService.putItem(message);
      }

      // Test greater than condition
      const result1 = await messageService
        .query('chat-123')
        .addSortKey({ operator: '>', value: 'msg-1' })
        .execute();

      expect(result1.items).toHaveLength(2);
      expect(result1.items.every((item) => item.messageId > 'msg-1')).toBe(
        true,
      );

      // Test between condition
      const result2 = await messageService
        .query('chat-123')
        .addSortKey({ operator: 'between', start: 'msg-1', end: 'msg-2' })
        .execute();

      expect(result2.items).toHaveLength(2);
    });

    it('should support begins_with sort key condition', async () => {
      const messages = [
        createTestMessage({ messageId: 'user_msg_1' }),
        createTestMessage({ messageId: 'user_msg_2' }),
        createTestMessage({ messageId: 'bot_msg_1' }),
      ];

      for (const message of messages) {
        await messageService.putItem(message);
      }

      const result = await messageService
        .query('chat-123')
        .addSortKey({ operator: 'begins_with', value: 'user_' })
        .execute();

      expect(result.items).toHaveLength(2);
      expect(
        result.items.every((item) => item.messageId.startsWith('user_')),
      ).toBe(true);
    });

    it('should support limit', async () => {
      const messages = [
        createTestMessage({ messageId: 'msg-1' }),
        createTestMessage({ messageId: 'msg-2' }),
        createTestMessage({ messageId: 'msg-3' }),
      ];

      for (const message of messages) {
        await messageService.putItem(message);
      }

      const result = await messageService.query('chat-123').limit(2).execute();

      expect(result.items).toHaveLength(2);
    });

    it('should support filter expressions', async () => {
      const users = [
        createTestUser({ userId: 'user-1', status: 'active', age: 25 }),
        createTestUser({ userId: 'user-2', status: 'inactive', age: 30 }),
        createTestUser({ userId: 'user-3', status: 'active', age: 35 }),
      ];

      for (const user of users) {
        await userService.putItem(user);
      }

      // Note: This test assumes we can query users by some mechanism
      // In a real scenario, you'd need a GSI or different approach
      const activeUsers = await userService
        .scan()
        .filter(
          '#status = :status AND #age > :minAge',
          { '#status': 'status', '#age': 'age' },
          { ':status': 'active', ':minAge': 30 },
        )
        .execute();

      expect(activeUsers.items).toHaveLength(1);
      expect(activeUsers.items[0]?.userId).toBe('user-3');
    });

    it('should support consistent reads', async () => {
      const message = createTestMessage();
      await messageService.putItem(message);

      const result = await messageService
        .query('chat-123')
        .consistentRead()
        .execute();

      expect(result.items).toHaveLength(1);
    });

    it('should support scan backward', async () => {
      const messages = [
        createTestMessage({ messageId: 'msg-1' }),
        createTestMessage({ messageId: 'msg-2' }),
        createTestMessage({ messageId: 'msg-3' }),
      ];

      for (const message of messages) {
        await messageService.putItem(message);
      }

      const result = await messageService
        .query('chat-123')
        .scanBackward()
        .execute();

      // Items should be in reverse order
      expect(result.items[0]?.messageId).toBe('msg-3');
    });
  });

  describe('scan', () => {
    it('should scan all items', async () => {
      const users = [
        createTestUser({ userId: 'user-1' }),
        createTestUser({ userId: 'user-2' }),
        createTestUser({ userId: 'user-3' }),
      ];

      for (const user of users) {
        await userService.putItem(user);
      }

      const result = await userService.scan().execute();

      expect(result.items).toHaveLength(3);
      expect(result.count).toBe(3);
    });

    it('should support filter expressions', async () => {
      const users = [
        createTestUser({ userId: 'user-1', status: 'active' }),
        createTestUser({ userId: 'user-2', status: 'inactive' }),
        createTestUser({ userId: 'user-3', status: 'active' }),
      ];

      for (const user of users) {
        await userService.putItem(user);
      }

      const result = await userService
        .scan()
        .filter(
          '#status = :status',
          { '#status': 'status' },
          { ':status': 'active' },
        )
        .execute();

      expect(result.items).toHaveLength(2);
      expect(result.items.every((item) => item.status === 'active')).toBe(true);
    });

    it('should support limit', async () => {
      const users = [
        createTestUser({ userId: 'user-1' }),
        createTestUser({ userId: 'user-2' }),
        createTestUser({ userId: 'user-3' }),
      ];

      for (const user of users) {
        await userService.putItem(user);
      }

      const result = await userService.scan().limit(2).execute();

      expect(result.items).toHaveLength(2);
    });
  });

  describe('scanStream', () => {
    it('should stream scan results', async () => {
      const users = [
        createTestUser({ userId: 'user-1' }),
        createTestUser({ userId: 'user-2' }),
        createTestUser({ userId: 'user-3' }),
      ];

      for (const user of users) {
        await userService.putItem(user);
      }

      const allItems: TestUser[] = [];
      const stream = userService.scanStream();

      for await (const batch of stream) {
        allItems.push(...batch);
      }

      expect(allItems).toHaveLength(3);
    });
  });

  describe('batchWrite', () => {
    it('should handle batch put operations', async () => {
      const users = [
        createTestUser({ userId: 'user-1' }),
        createTestUser({ userId: 'user-2' }),
        createTestUser({ userId: 'user-3' }),
      ];

      await userService.batchWrite(
        users.map((user) => ({ operation: 'put' as const, item: user })),
      );

      for (const user of users) {
        const result = await userService.getItem({ userId: user.userId });
        expect(result).toEqual(user);
      }
    });

    it('should handle batch delete operations', async () => {
      const users = [
        createTestUser({ userId: 'user-1' }),
        createTestUser({ userId: 'user-2' }),
      ];

      // First, put the items
      for (const user of users) {
        await userService.putItem(user);
      }

      // Then delete them in batch
      await userService.batchWrite(
        users.map((user) => ({
          operation: 'delete' as const,
          key: { userId: user.userId },
        })),
      );

      for (const user of users) {
        const result = await userService.getItem({ userId: user.userId });
        expect(result).toBeUndefined();
      }
    });

    it('should handle mixed batch operations', async () => {
      const user1 = createTestUser({ userId: 'user-1' });
      const user2 = createTestUser({ userId: 'user-2' });
      await userService.putItem(user2); // Pre-existing item to delete

      await userService.batchWrite([
        { operation: 'put', item: user1 },
        { operation: 'delete', key: { userId: user2.userId } },
      ]);

      const result1 = await userService.getItem({ userId: user1.userId });
      const result2 = await userService.getItem({ userId: user2.userId });

      expect(result1).toEqual(user1);
      expect(result2).toBeUndefined();
    });
  });

  describe('batchGet', () => {
    it('should retrieve multiple items by key', async () => {
      const users = [
        createTestUser({ userId: 'user-1' }),
        createTestUser({ userId: 'user-2' }),
        createTestUser({ userId: 'user-3' }),
      ];

      for (const user of users) {
        await userService.putItem(user);
      }

      const results = await userService.batchGet([
        { userId: 'user-1' },
        { userId: 'user-2' },
        { userId: 'non-existent' },
      ]);

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.userId).sort()).toEqual(['user-1', 'user-2']);
    });

    it('should work with composite keys', async () => {
      const messages = [
        createTestMessage({ chatId: 'chat-1', messageId: 'msg-1' }),
        createTestMessage({ chatId: 'chat-1', messageId: 'msg-2' }),
      ];

      for (const message of messages) {
        await messageService.putItem(message);
      }

      const results = await messageService.batchGet([
        { chatId: 'chat-1', messageId: 'msg-1' },
        { chatId: 'chat-1', messageId: 'msg-2' },
        { chatId: 'chat-1', messageId: 'non-existent' },
      ]);

      expect(results).toHaveLength(2);
    });
  });

  describe('transactWrite', () => {
    it('should execute multiple operations atomically', async () => {
      const user1 = createTestUser({ userId: 'user-1' });
      const user2 = createTestUser({ userId: 'user-2' });

      await userService.transactWrite([
        {
          operation: 'put',
          item: user1,
          conditionExpression: 'attribute_not_exists(userId)',
        },
        {
          operation: 'put',
          item: user2,
          conditionExpression: 'attribute_not_exists(userId)',
        },
      ]);

      const result1 = await userService.getItem({ userId: user1.userId });
      const result2 = await userService.getItem({ userId: user2.userId });

      expect(result1).toEqual(user1);
      expect(result2).toEqual(user2);
    });

    it('should support update operations in transactions', async () => {
      const user = createTestUser();
      await userService.putItem(user);

      await userService.transactWrite([
        {
          operation: 'update',
          key: { userId: user.userId },
          updateExpression: 'SET #name = :name',
          expressionAttributeNames: { '#name': 'name' },
          expressionAttributeValues: { ':name': 'Updated Name' },
        },
      ]);

      const result = await userService.getItem({ userId: user.userId });
      expect(result?.name).toBe('Updated Name');
    });

    it('should support delete operations in transactions', async () => {
      const user = createTestUser();
      await userService.putItem(user);

      await userService.transactWrite([
        {
          operation: 'delete',
          key: { userId: user.userId },
          conditionExpression: 'attribute_exists(userId)',
        },
      ]);

      const result = await userService.getItem({ userId: user.userId });
      expect(result).toBeUndefined();
    });

    it('should support condition check operations', async () => {
      const user = createTestUser();
      await userService.putItem(user);

      await userService.transactWrite([
        {
          operation: 'conditionCheck',
          key: { userId: user.userId },
          conditionExpression: '#status = :status',
          expressionAttributeNames: { '#status': 'status' },
          expressionAttributeValues: { ':status': 'active' },
        },
      ]);

      // Should not throw - condition is satisfied
    });

    it('should fail entire transaction if any condition fails', async () => {
      const user1 = createTestUser({ userId: 'user-1' });
      await userService.putItem(user1); // Pre-existing item

      const user2 = createTestUser({ userId: 'user-2' });

      // This should fail because user-1 already exists
      await expect(
        userService.transactWrite([
          {
            operation: 'put',
            item: user1,
            conditionExpression: 'attribute_not_exists(userId)',
          },
          {
            operation: 'put',
            item: user2,
            conditionExpression: 'attribute_not_exists(userId)',
          },
        ]),
      ).rejects.toThrow(DynamoDbConditionalCheckFailedError);

      // user-2 should not have been created
      const result = await userService.getItem({ userId: user2.userId });
      expect(result).toBeUndefined();
    });
  });

  describe('getItemCount', () => {
    it('should return correct count', async () => {
      const initialCount = await userService.getItemCount();

      const users = [
        createTestUser({ userId: 'user-1' }),
        createTestUser({ userId: 'user-2' }),
        createTestUser({ userId: 'user-3' }),
      ];

      for (const user of users) {
        await userService.putItem(user);
      }

      const finalCount = await userService.getItemCount();
      expect(finalCount).toBe(initialCount + 3);
    });
  });

  describe('type safety', () => {
    it('should enforce correct key types at compile time', () => {
      // These should compile
      const validUserKey: TestUserKey = { userId: 'user-123' };
      const validMessageKey: TestMessageKey = {
        chatId: 'chat-123',
        messageId: 'msg-123',
      };

      expect(validUserKey.userId).toBe('user-123');
      expect(validMessageKey.chatId).toBe('chat-123');

      // TypeScript should prevent these at compile time:
      // userService.getItem({ wrongKey: 'value' }); // ❌ Compile error
      // messageService.getItem({ userId: 'user-123' }); // ❌ Compile error
      // messageService.getItem({ chatId: 'chat-123' }); // ❌ Missing messageId
    });

    it('should enforce schema validation at runtime', async () => {
      const invalidUser = {
        userId: 'user-123',
        name: 'John',
        email: 'not-an-email',
        age: 'not-a-number',
        status: 'invalid-status',
        createdAt: 'not-a-timestamp',
      };

      await expect(userService.putItem(invalidUser as any)).rejects.toThrow(
        DynamoDbValidationError,
      );
    });
  });

  describe('error handling', () => {
    it('should throw appropriate errors for various scenarios', async () => {
      // Validation error
      await expect(userService.putItem({} as TestUser)).rejects.toThrow(
        DynamoDbValidationError,
      );

      // Not found error
      await expect(
        userService.updateItem(
          { userId: 'non-existent' },
          { updateExpression: 'SET #name = :name' },
        ),
      ).rejects.toThrow(DynamoDbNotFoundError);

      // Conditional check failed error
      const user = createTestUser();
      await userService.putItem(user);

      await expect(
        userService.putItem(user, {
          conditionExpression: 'attribute_not_exists(userId)',
        }),
      ).rejects.toThrow(DynamoDbConditionalCheckFailedError);
    });
  });
});
