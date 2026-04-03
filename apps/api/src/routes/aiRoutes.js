import 'dotenv/config';
import express from 'express';
import logger from '../utils/logger.js';
import pocketbaseClient from '../utils/pocketbaseClient.js';
import * as aiService from '../services/aiService.js';
import * as transactionService from '../services/transactionService.js';
import * as incomeService from '../services/incomeService.js';
import * as goalsService from '../services/goalsService.js';

const router = express.Router();

/**
 * POST /ai/process-message
 */
router.post('/process-message', async (req, res) => {
  const { text, userId } = req.body;

  if (!text || !userId) {
    return res.status(400).json({ error: 'Missing required fields: text, userId' });
  }

  logger.info(`Processing message for user ${userId}`);

  const result = await aiService.processMessage(text, userId);
  const { intent, entities } = result;

  let action = null;
  let data = null;

  switch (intent) {
    case 'EXPENSE':
      if (entities.amount) {
        data = await transactionService.createTransaction(userId, {
          amount: entities.amount,
          category: entities.category,
          description: entities.description,
          paymentMethod: entities.paymentMethod,
        });
        action = 'EXPENSE_CREATED';
      }
      break;

    case 'INCOME':
      if (entities.amount) {
        data = await incomeService.createIncome(userId, {
          amount: entities.amount,
          type: entities.type || 'salary',
          description: entities.description,
          frequency: entities.frequency,
        });
        action = 'INCOME_CREATED';
      }
      break;

    case 'GOAL':
      if (entities.title && entities.targetAmount) {
        data = await goalsService.createGoal(userId, {
          title: entities.title,
          targetAmount: entities.targetAmount,
          deadline: entities.deadline,
        });
        action = 'GOAL_CREATED';
      }
      break;

    case 'QUERY':
      action = 'QUERY_ANSWERED';
      break;

    case 'SPLIT':
      action = 'SPLIT_HELP';
      break;

    case 'CREDIT_CARD':
      if (entities.amount) {
        data = await transactionService.createTransaction(userId, {
          amount: entities.amount,
          category: entities.category,
          description: entities.description,
          paymentMethod: 'crédito',
        });
        action = 'CREDIT_CARD_RECORDED';
      }
      break;

    default:
      action = 'MESSAGE_PROCESSED';
  }

  const response = await aiService.generateResponse(result, intent);

  res.json({
    intent,
    entities,
    action,
    response,
    data: data || null,
  });
});

/**
 * POST /ai/process-audio
 */
router.post('/process-audio', async (req, res) => {
  const { audioBase64, userId } = req.body;

  if (!audioBase64 || !userId) {
    return res.status(400).json({ error: 'Missing required fields: audioBase64, userId' });
  }

  logger.info(`Processing audio for user ${userId}`);

  const audioBuffer = Buffer.from(audioBase64, 'base64');
  const transcription = await aiService.transcribeAudio(audioBuffer);
  const { text: transcribedText } = transcription;

  logger.info(`Audio transcribed: ${transcribedText}`);

  // Process transcribed text as message
  const result = await aiService.processMessage(transcribedText, userId);
  const { intent, entities } = result;

  let action = null;
  let data = null;

  switch (intent) {
    case 'EXPENSE':
      if (entities.amount) {
        data = await transactionService.createTransaction(userId, {
          amount: entities.amount,
          category: entities.category,
          description: entities.description,
          paymentMethod: entities.paymentMethod,
        });
        action = 'EXPENSE_CREATED';
      }
      break;

    case 'INCOME':
      if (entities.amount) {
        data = await incomeService.createIncome(userId, {
          amount: entities.amount,
          type: entities.type || 'salary',
          description: entities.description,
          frequency: entities.frequency,
        });
        action = 'INCOME_CREATED';
      }
      break;

    default:
      action = 'QUERY_ANSWERED';
  }

  const response = await aiService.generateResponse(result, intent);

  res.json({
    transcribedText,
    intent,
    entities,
    action,
    response,
    data: data || null,
  });
});

/**
 * GET /ai/user-context/:userId
 */
router.get('/user-context/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  try {
    logger.info(`Getting user context for ${userId}`);

    const accounts = await pocketbaseClient.collection('userMessagingAccounts').getList(1, 10, {
      filter: `userId="${userId}"`,
    });

    const linkedAccounts = {
      telegram: null,
      whatsapp: null,
    };

    accounts.items.forEach(account => {
      if (account.platform === 'telegram') {
        linkedAccounts.telegram = account.messagingId;
      } else if (account.platform === 'whatsapp') {
        linkedAccounts.whatsapp = account.messagingId;
      }
    });

    res.json({
      userId,
      linkedAccounts,
      preferences: {
        language: 'pt-BR',
        currency: 'BRL',
      },
    });
  } catch (error) {
    logger.error('Get user context error:', error.message);
    throw error;
  }
});

export default router;
