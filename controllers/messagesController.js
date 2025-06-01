// Importuj wszystkie funkcje z poszczególnych modułów
import * as messageBasics from './messages/messageBasics.js';
import * as messageFlags from './messages/messageFlags.js';
import * as conversations from './messages/conversations.js';
import * as adMessages from './messages/adMessages.js';
import * as utils from './messages/utils.js';

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
  saveDraft
} = utils;