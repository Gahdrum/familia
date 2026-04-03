import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import logger from '../utils/logger.js';
import pocketbaseClient from '../utils/pocketbaseClient.js';
import * as aiService from '../services/aiService.js';
import * as transactionService from '../services/transactionService.js';
import * as incomeService from '../services/incomeService.js';
import * as goalsService from '../services/goalsService.js';
import { validateWhatsAppWebhook } from '../middleware/messagingAuth.js';

const router = express.Router();
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_API_URL = 'https://graph.instagram.com/v18.0';

/**
 * Send message to WhatsApp user
 */
async function sendWhatsAppMessage(phoneNumber, text) {
  try {
    await axios.post(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    logger.info(`Message sent to WhatsApp ${phoneNumber}`);
  } catch (error) {
    logger.error('WhatsApp send error:', error.message);
    throw new Error(`Failed to send WhatsApp message: ${error.message}`);
  }
}

/**
 * Download audio file from WhatsApp
 */
async function downloadWhatsAppAudio(mediaId) {
  try {
    const mediaResponse = await axios.get(
      `${WHATSAPP_API_URL}/${mediaId}`,
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        },
      }
    );

    const audioUrl = mediaResponse.data.url;
    const audioResponse = await axios.get(audioUrl, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      },
      responseType: 'arraybuffer',
    });

    logger.info('Audio downloaded from WhatsApp');
    return Buffer.from(audioResponse.data);
  } catch (error) {
    logger.error('WhatsApp audio download error:', error.message);
    throw new Error(`Failed to download audio: ${error.message}`);
  }
}

/**
 * POST /whatsapp/webhook
 */
router.post('/webhook', async (req, res) => {
  const { entry } = req.body;

  if (!entry || !entry[0]) {
    return res.json({ ok: true });
  }

  const changes = entry[0].changes[0];
  const message = changes.value.messages?.[0];

  if (!message) {
    return res.json({ ok: true });
  }

  const phoneNumber = changes.value.contacts[0].wa_id;

  try {
    // Get user context
    const accounts = await pocketbaseClient.collection('userMessagingAccounts').getList(1, 1, {
      filter: `messagingId="${phoneNumber}"`,
    });

    if (accounts.items.length === 0) {
      await sendWhatsAppMessage(phoneNumber, '❌ Conta não vinculada. Use o comando /link para vincular sua conta.');
      return res.json({ ok: true });
    }

    const userId = accounts.items[0].userId;
    let text = '';
    let audioBuffer = null;

    if (message.type === 'text') {
      text = message.text.body;
    } else if (message.type === 'audio') {
      audioBuffer = await downloadWhatsAppAudio(message.audio.id);
      const transcription = await aiService.transcribeAudio(audioBuffer);
      text = transcription.text;
    } else {
      await sendWhatsAppMessage(phoneNumber, '📱 Tipo de mensagem não suportado. Use texto ou áudio.');
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

    await sendWhatsAppMessage(phoneNumber, response);
    logger.info(`WhatsApp action: ${action}`);

    res.json({ ok: true });
  } catch (error) {
    logger.error('Webhook error:', error.message);
    throw error;
  }
});

/**
 * POST /whatsapp/link-account
 */
router.post('/link-account', async (req, res) => {
  const { whatsappPhone, userId, profile } = req.body;

  if (!whatsappPhone || !userId || !profile) {
    return res.status(400).json({ error: 'Missing required fields: whatsappPhone, userId, profile' });
  }

  try {
    logger.info(`Linking WhatsApp account ${whatsappPhone} to user ${userId}`);

    // Check if already exists
    const existing = await pocketbaseClient.collection('userMessagingAccounts').getList(1, 1, {
      filter: `messagingId="${whatsappPhone}"`,
    });

    let result;
    if (existing.items.length > 0) {
      result = await pocketbaseClient.collection('userMessagingAccounts').update(existing.items[0].id, {
        userId,
        profile,
      });
    } else {
      result = await pocketbaseClient.collection('userMessagingAccounts').create({
        messagingId: whatsappPhone,
        userId,
        profile,
        platform: 'whatsapp',
      });
    }

    res.json({
      success: true,
      message: 'WhatsApp vinculado com sucesso',
      mapping: result,
    });
  } catch (error) {
    logger.error('Link account error:', error.message);
    throw error;
  }
});

/**
 * GET /whatsapp/status
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'connected',
    webhookUrl: process.env.WEBHOOK_URL || 'Not configured',
  });
});

export default router;
