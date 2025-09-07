import * as messageBasics from './messageBasics.js';
import * as messageFlags from './messageFlags.js';
import * as conversations from './conversations.js';
import * as adMessages from './adMessages.js';
import * as utils from './utils.js';

// Eksportuj wszystkie funkcje z modułów
export const {
  getMessages,
  getMessage,
  sendMessage
} = messageBasics;

export const {
  markAsRead,
  toggleStar,
  deleteMessage,
  archiveMessage,
  unarchiveMessage,
  unsendMessage,
  editMessage
} = messageFlags;

export const {
  getConversation,
  getConversationsList,
  replyToMessage,
  replyToConversation
} = conversations;

export const {
  sendMessageToUser,
  sendMessageToAd
} = adMessages;

export const {
  searchMessages,
  getUserSuggestions,
  saveDraft,
  getUnreadCount
} = utils;
