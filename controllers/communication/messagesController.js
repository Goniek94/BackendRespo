// Importuj wszystkie funkcje z poszczególnych modułów
import * as messageBasics from './messageBasics.js';
import * as messageFlags from './messageFlags.js';
import * as conversations from './conversations.js';
import * as adMessages from './adMessages.js';
import * as utils from './utils.js';

// Reeksportuj wszystkie funkcje
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
  unarchiveMessage
} = messageFlags;

export const {
  getConversation,
  getConversationsList,
  replyToMessage
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
