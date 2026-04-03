import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import logger from '../utils/logger.js';
import pocketbaseClient from '../utils/pocketbaseClient.js';
import * as aiService from '../services/aiService.js';
import * as transactionService from '../services/transactionService.js';
import * as incomeService from '../services/incomeService.js';
import * as goalsService from '../services/goalsService.js';
import { validateTelegramWebhook, identifyUser } from '../middleware/messagingAuth.js';

const router = express.Router();
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Send message to Telegram user
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
 * POST /telegram/webhook
 */
router.post('/webhook', validateTelegramWebhook, async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.json({ ok: true });
  }

  const chatId = message.chat.id;
  const telegramId = message.from.id.toString();

  try {
    // Get user context
    const accounts = await pocketbaseClient.collection('userMessagingAccounts').getList(1, 1, {
      filter: `messagingId="${telegramId}"`,
    });

    if (accounts.items.length === 0) {
      await sendTelegramMessage(chatId, '❌ Conta não vinculada. Use /link para vincular sua conta.');
      return res.json({ ok: true });
    }

    const userId = accounts.items[0].userId;
    let text = '';
    let audioBuffer = null;

    if (message.text) {
      text = message.text;
    } else if (message.voice) {
      audioBuffer = await downloadTelegramAudio(message.voice.file_id);
      const transcription = await aiService.transcribeAudio(audioBuffer);
      text = transcription.text;
    } else {
      await sendTelegramMessage(chatId, '📱 Tipo de mensagem não suportado. Use texto ou áudio.');
      return res.json({ ok: true });
    }

    // Process message
    const result = await aiService.processMessage(text, userId);
    const { intent, entities } = result;

    let response = '';
    let action = null;

    switch (intent) {
      case 'EXPENSE':
        if (entities.amount) {
          await transactionService.createTransaction(userId, {
            amount: entities.amount,
            category: entities.category,
            description: entities.description,
            paymentMethod: entities.paymentMethod,
          });
          response = await aiService.generateResponse(result, intent);
          action = 'EXPENSE_CREATED';
        } else {
          response = '❌ Não consegui identificar o valor da despesa. Tente novamente.';
        }
        break;

      case 'INCOME':
        if (entities.amount) {
          await incomeService.createIncome(userId, {
            amount: entities.amount,
            type: entities.type || 'salary',
            description: entities.description,
            frequency: entities.frequency,
          });
          response = await aiService.generateResponse(result, intent);
          action = 'INCOME_CREATED';
        } else {
          response = '❌ Não consegui identificar o valor da receita. Tente novamente.';
        }
        break;

      case 'GOAL':
        if (entities.title && entities.targetAmount) {
          await goalsService.createGoal(userId, {
            title: entities.title,
            targetAmount: entities.targetAmount,
            deadline: entities.deadline,
          });
          response = await aiService.generateResponse(result, intent);
          action = 'GOAL_CREATED';
        } else {
          response = '❌ Não consegui identificar os dados da meta. Tente novamente.';
        }
        break;

      case 'QUERY':
        response = await aiService.generateResponse(result, intent);
        action = 'QUERY_ANSWERED';
        break;

      default:
        response = await aiService.generateResponse(result, intent);
        action = 'MESSAGE_PROCESSED';
    }

    await sendTelegramMessage(chatId, response);
    logger.info(`Telegram action: ${action}`);

    res.json({ ok: true });
  } catch (error) {
    logger.error('Webhook error:', error.message);
    throw error;
  }
});

/**
 * POST /telegram/link-account
 */
router.post('/link-account', async (req, res) => {
  const { telegramId, userId, profile } = req.body;

  if (!telegramId || !userId || !profile) {
    return res.status(400).json({ error: 'Missing required fields: telegramId, userId, profile' });
  }

  try {
    logger.info(`Linking Telegram account ${telegramId} to user ${userId}`);

    // Check if already exists
    const existing = await pocketbaseClient.collection('userMessagingAccounts').getList(1, 1, {
      filter: `messagingId="${telegramId}"`,
    });

    let result;
    if (existing.items.length > 0) {
      result = await pocketbaseClient.collection('userMessagingAccounts').update(existing.items[0].id, {
        userId,
        profile,
      });
    } else {
      result = await pocketbaseClient.collection('userMessagingAccounts').create({
        messagingId: telegramId,
        userId,
        profile,
        platform: 'telegram',
      });
    }

    res.json({
      success: true,
      message: 'Conta Telegram vinculada com sucesso',
      mapping: result,
    });
  } catch (error) {
    logger.error('Link account error:', error.message);
    throw error;
  }
});

/**
 * GET /telegram/status
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'connected',
    botName: 'FinanceBot',
    webhookUrl: process.env.WEBHOOK_URL || 'Not configured',
  });
});

export default router;
