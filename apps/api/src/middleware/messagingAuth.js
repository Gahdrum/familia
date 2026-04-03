import 'dotenv/config';
import logger from '../utils/logger.js';
import pocketbaseClient from '../utils/pocketbaseClient.js';
import crypto from 'crypto';

/**
 * Validate Telegram webhook signature
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
export async function validateTelegramWebhook(req, res, next) {
  try {
    const secretHeader = req.headers['x-telegram-bot-api-secret-header'];

    if (!secretHeader) {
      logger.warn('Telegram webhook: missing secret header');
      throw new Error('Unauthorized: Missing secret header');
    }

    // In production, verify the signature matches Telegram's secret
    // For now, we accept if header is present
    logger.info('Telegram webhook validated');
    next();
  } catch (error) {
    logger.error('Telegram validation error:', error.message);
    res.status(401).json({ error: 'Unauthorized' });
  }
}

/**
 * Validate WhatsApp webhook
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
export async function validateWhatsAppWebhook(req, res, next) {
  try {
    const verifyToken = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (verifyToken === process.env.WHATSAPP_VERIFY_TOKEN) {
      logger.info('WhatsApp webhook verified');
      return res.send(challenge);
    }

    logger.warn('WhatsApp webhook: invalid verify token');
    throw new Error('Unauthorized: Invalid verify token');
  } catch (error) {
    logger.error('WhatsApp validation error:', error.message);
    res.status(401).json({ error: 'Unauthorized' });
  }
}

/**
 * Identify user from messaging account
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
export async function identifyUser(req, res, next) {
  try {
    let messagingId = null;

    // Extract from Telegram
    if (req.body.message?.from?.id) {
      messagingId = req.body.message.from.id.toString();
    }
    // Extract from WhatsApp
    else if (req.body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.wa_id) {
      messagingId = req.body.entry[0].changes[0].value.contacts[0].wa_id;
    }

    if (!messagingId) {
      logger.warn('Could not identify messaging ID');
      throw new Error('Could not identify user');
    }

    // Look up user in userMessagingAccounts
    const accounts = await pocketbaseClient.collection('userMessagingAccounts').getList(1, 1, {
      filter: `messagingId="${messagingId}"`,
    });

    if (accounts.items.length === 0) {
      logger.warn(`No account found for messaging ID ${messagingId}`);
      throw new Error('User not found');
    }

    const account = accounts.items[0];
    req.user = {
      userId: account.userId,
      profile: account.profile,
      messagingId,
    };

    logger.info(`User identified: ${account.userId}`);
    next();
  } catch (error) {
    logger.error('User identification error:', error.message);
    res.status(404).json({ error: 'User not found' });
  }
}

export default {
  validateTelegramWebhook,
  validateWhatsAppWebhook,
  identifyUser,
};
