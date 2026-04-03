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
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_API_URL = 'https://graph.instagram.com/v18.0';

/**
 * Send message to WhatsApp user
 * @param {string} phoneNumber - WhatsApp phone number
 * @param {string} text - Message text
 */
async function sendWhatsAppMessage(phoneNumber, text) {
  try {
    await axios.post(
      `${WHATSAPP_API_URL}/me/messages`,
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
 * @param {string} mediaId - WhatsApp media ID
 * @returns {Promise<Buffer>} Audio buffer
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
 * Process WhatsApp message and execute action
 */
async function processMessage(text, phoneNumber, userId) {
  try {
    logger.info(`Processing WhatsApp message: ${text}`);

    // Get user context
    const context = await userContextService.getContext(phoneNumber);
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
    await userContextService.storeConversationHistory(phoneNumber, text, response);

    // Send response
    await sendWhatsAppMessage(phoneNumber, response);

    return { success: true, action, intent };
  } catch (error) {
    logger.error('Message processing error:', error.message);
    throw error;
  }
}

/**
 * Process WhatsApp audio message
 */
async function processAudio(mediaId, phoneNumber, userId) {
  try {
    logger.info('Processing WhatsApp audio message');

    const audioBuffer = await downloadWhatsAppAudio(mediaId);
    const transcribedText = await aiService.transcribeAudio(audioBuffer);

    logger.info(`Audio transcribed: ${transcribedText}`);

    // Process as text message
    return processMessage(transcribedText, phoneNumber, userId);
  } catch (error) {
    logger.error('Audio processing error:', error.message);
    throw error;
  }
}

/**
 * POST /whatsapp/webhook - WhatsApp webhook handler
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
  const userId = phoneNumber;

  try {
    if (message.type === 'text') {
      await processMessage(message.text.body, phoneNumber, userId);
    } else if (message.type === 'audio') {
      await processAudio(message.audio.id, phoneNumber, userId);
    } else {
      await sendWhatsAppMessage(phoneNumber, '📱 Tipo de mensagem não suportado. Use texto ou áudio.');
    }

    res.json({ ok: true });
  } catch (error) {
    logger.error('Webhook error:', error.message);
    throw error;
  }
});

export default router;
