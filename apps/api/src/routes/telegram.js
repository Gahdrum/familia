import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import logger from '../utils/logger.js';
import * as aiService from '../services/aiService.js';
import * as transactionService from '../services/transactionService.js';
import * as incomeService from '../services/transactionService.js';
import * as goalsService from '../services/goalsService.js';
import * as userContextService from '../services/userContextService.js';

const router = express.Router();
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Send message to Telegram user
 * @param {number} chatId - Telegram chat ID
 * @param {string} text - Message text
 */
async function sendTelegramMessage(chatId, text) {
  try {
    await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
    logger.info(`Message sent to Telegram chat ${chatId}`);
  } catch (error) {
    logger.error('Telegram send error:', error.message);
    throw new Error(`Failed to send Telegram message: ${error.message}`);
  }
}

/**
 * Download audio file from Telegram
 * @param {string} fileId - Telegram file ID
 * @returns {Promise<Buffer>} Audio buffer
 */
async function downloadTelegramAudio(fileId) {
  try {
    const fileResponse = await axios.get(`${TELEGRAM_API_URL}/getFile`, {
      params: { file_id: fileId },
    });

    const filePath = fileResponse.data.result.file_path;
    const audioResponse = await axios.get(
      `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`,
      { responseType: 'arraybuffer' }
    );

    logger.info('Audio downloaded from Telegram');
    return Buffer.from(audioResponse.data);
  } catch (error) {
    logger.error('Telegram audio download error:', error.message);
    throw new Error(`Failed to download audio: ${error.message}`);
  }
}

/**
 * Process Telegram message and execute action
 */
async function processMessage(message, chatId, userId) {
  try {
    const text = message.text || '';
    logger.info(`Processing Telegram message: ${text}`);

    // Get user context
    const context = await userContextService.getContext(chatId.toString());
    const actualUserId = context?.userId || userId;

    // Process message with AI
    const result = await aiService.processMessage(text, actualUserId);
    const { intent, entities } = result;

    let response = '';
    let action = null;

    switch (intent) {
      case 'EXPENSE':
        if (entities.value) {
          await transactionService.createTransaction(actualUserId, {
            amount: entities.value,
            category: entities.category,
            description: entities.description,
            paymentMethod: entities.paymentMethod,
            creditCard: entities.creditCard,
          });
          response = await aiService.generateResponse(result);
          action = 'EXPENSE_CREATED';
        } else {
          response = '❌ Não consegui identificar o valor da despesa. Tente novamente.';
        }
        break;

      case 'INCOME':
        if (entities.value) {
          await incomeService.createIncome(actualUserId, {
            amount: entities.value,
            type: entities.type,
            description: entities.description,
          });
          response = await aiService.generateResponse(result);
          action = 'INCOME_CREATED';
        } else {
          response = '❌ Não consegui identificar o valor da renda. Tente novamente.';
        }
        break;

      case 'QUERY':
        response = await aiService.generateResponse(result);
        action = 'QUERY_ANSWERED';
        break;

      case 'GOAL':
        response = 'Para criar uma meta, use o comando: /goal <título> <valor> <data>';
        action = 'GOAL_HELP';
        break;

      default:
        response = await aiService.generateResponse(result);
        action = 'MESSAGE_PROCESSED';
    }

    // Store conversation history
    await userContextService.storeConversationHistory(chatId.toString(), text, response);

    // Send response
    await sendTelegramMessage(chatId, response);

    return { success: true, action, intent };
  } catch (error) {
    logger.error('Message processing error:', error.message);
    throw error;
  }
}

/**
 * Process Telegram audio message
 */
async function processAudio(message, chatId, userId) {
  try {
    logger.info('Processing Telegram audio message');

    const audioBuffer = await downloadTelegramAudio(message.voice.file_id);
    const transcribedText = await aiService.transcribeAudio(audioBuffer);

    logger.info(`Audio transcribed: ${transcribedText}`);

    // Process as text message
    const textMessage = { text: transcribedText };
    return processMessage(textMessage, chatId, userId);
  } catch (error) {
    logger.error('Audio processing error:', error.message);
    throw error;
  }
}

/**
 * POST /telegram/webhook - Telegram webhook handler
 */
router.post('/webhook', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.json({ ok: true });
  }

  const chatId = message.chat.id;
  const userId = message.from.id.toString();

  try {
    if (message.text) {
      await processMessage(message, chatId, userId);
    } else if (message.voice) {
      await processAudio(message, chatId, userId);
    } else {
      await sendTelegramMessage(chatId, '📱 Tipo de mensagem não suportado. Use texto ou áudio.');
    }

    res.json({ ok: true });
  } catch (error) {
    logger.error('Webhook error:', error.message);
    throw error;
  }
});

export default router;
