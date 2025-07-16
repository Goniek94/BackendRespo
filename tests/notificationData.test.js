import test from 'node:test';
import assert from 'node:assert';
import { NotificationType, createNotificationData } from '../utils/notificationTypes.js';

test('createNotificationData returns expected object', () => {
  const data = createNotificationData('user1', NotificationType.NEW_MESSAGE, 'Tytuł', 'Wiadomość', '/link', 'ad123', { foo: 'bar' });
  assert.strictEqual(data.userId, 'user1');
  assert.strictEqual(data.type, NotificationType.NEW_MESSAGE);
  assert.strictEqual(data.title, 'Tytuł');
  assert.strictEqual(data.message, 'Wiadomość');
  assert.strictEqual(data.link, '/link');
  assert.strictEqual(data.adId, 'ad123');
  assert.deepStrictEqual(data.metadata, { foo: 'bar' });
  assert.strictEqual(data.isRead, false);
  assert.ok(data.createdAt instanceof Date);
});
