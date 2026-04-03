import 'dotenv/config';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

/**
 * Link a messaging account (Telegram/WhatsApp) to a PocketBase user
 * @param {string} messagingId - Telegram ID or WhatsApp phone number
 * @param {string} userId - PocketBase user ID
 * @param {string} profile - User profile type ('husband' or 'wife')
 * @returns {Promise<Object>} Created or updated mapping
 */
export async function linkAccount(messagingId, userId, profile) {
  try {
    logger.info(`Linking account ${messagingId} to user ${userId}`);

    // Check if mapping already exists
    const existing = await pb.collection('userMessagingAccounts').getFullList({
      filter: `messagingId = "${messagingId}"`,
    });

    let result;
    if (existing.length > 0) {
      // Update existing mapping
      result = await pb.collection('userMessagingAccounts').update(existing[0].id, {
        userId,
        profile,
        updatedAt: new Date().toISOString(),
      });
      logger.info(`Account mapping updated: ${existing[0].id}`);
    } else {
      // Create new mapping
      result = await pb.collection('userMessagingAccounts').create({
        messagingId,
        userId,
        profile,
        conversationHistory: [],
        createdAt: new Date().toISOString(),
      });
      logger.info(`Account mapping created: ${result.id}`);
    }

    return result;
  } catch (error) {
    logger.error('Link account error:', error.message);
    throw new Error(`Failed to link account: ${error.message}`);
  }
}

/**
 * Get user context by messaging ID
 * @param {string} messagingId - Telegram ID or WhatsApp phone number
 * @returns {Promise<Object>} User context with userId and profile
 */
export async function getContext(messagingId) {
  try {
    logger.info(`Getting context for messaging ID ${messagingId}`);

    const mapping = await pb.collection('userMessagingAccounts').getFullList({
      filter: `messagingId = "${messagingId}"`,
    });

    if (mapping.length === 0) {
      logger.warn(`No context found for messaging ID ${messagingId}`);
      return null;
    }

    const account = mapping[0];
    const user = await pb.collection('users').getOne(account.userId);

    const context = {
      messagingId,
      userId: account.userId,
      profile: account.profile,
      userName: user.name || user.email,
      conversationHistory: account.conversationHistory || [],
    };

    logger.info(`Context retrieved for user ${account.userId}`);
    return context;
  } catch (error) {
    logger.error('Get context error:', error.message);
    throw new Error(`Failed to get context: ${error.message}`);
  }
}

/**
 * Store conversation message in history (keep last 10 messages)
 * @param {string} messagingId - Telegram ID or WhatsApp phone number
 * @param {string} message - User message
 * @param {string} response - Bot response
 * @returns {Promise<Object>} Updated mapping
 */
export async function storeConversationHistory(messagingId, message, response) {
  try {
    logger.info(`Storing conversation for messaging ID ${messagingId}`);

    const mapping = await pb.collection('userMessagingAccounts').getFullList({
      filter: `messagingId = "${messagingId}"`,
    });

    if (mapping.length === 0) {
      logger.warn(`No account found for messaging ID ${messagingId}`);
      return null;
    }

    const account = mapping[0];
    const history = account.conversationHistory || [];

    // Add new message pair
    history.push({
      timestamp: new Date().toISOString(),
      message,
      response,
    });

    // Keep only last 10 messages
    const trimmedHistory = history.slice(-10);

    const updated = await pb.collection('userMessagingAccounts').update(account.id, {
      conversationHistory: trimmedHistory,
    });

    logger.info(`Conversation stored (${trimmedHistory.length} messages)`);
    return updated;
  } catch (error) {
    logger.error('Store conversation error:', error.message);
    throw new Error(`Failed to store conversation: ${error.message}`);
  }
}

export default {
  linkAccount,
  getContext,
  storeConversationHistory,
};
