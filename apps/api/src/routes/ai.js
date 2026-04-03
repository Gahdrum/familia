import 'dotenv/config';
import express from 'express';
import logger from '../utils/logger.js';
import * as aiService from '../services/aiService.js';
import * as transactionService from '../services/transactionService.js';
import * as incomeService from '../services/transactionService.js';
import * as goalsService from '../services/goalsService.js';
import * as userContextService from '../services/userContextService.js';

const router = express.Router();

/**
 * POST /ai/process-message
 * Process text message and execute appropriate action
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
  let actionResult = null;

  switch (intent) {
    case 'EXPENSE':
      if (entities.value) {
        actionResult = await transactionService.createTransaction(userId, {
          amount: entities.value,
          category: entities.category,
          description: entities.description,
          paymentMethod: entities.paymentMethod,
          creditCard: entities.creditCard,
        });
        action = 'EXPENSE_CREATED';
      }
      break;

    case 'INCOME':
      if (entities.value) {
        actionResult = await incomeService.createIncome(userId, {
          amount: entities.value,
          type: entities.type,
          description: entities.description,
        });
        action = 'INCOME_CREATED';
      }
      break;

    case 'GOAL':
      action = 'GOAL_HELP';
      break;

    case 'SPLIT':
      action = 'SPLIT_HELP';
      break;

    case 'CREDIT_CARD':
      if (entities.value) {
        actionResult = await transactionService.createTransaction(userId, {
          amount: entities.value,
          category: entities.category,
          description: entities.description,
          paymentMethod: 'credit',
          creditCard: entities.creditCard,
        });
        action = 'CREDIT_CARD_RECORDED';
      }
      break;

    default:
      action = 'QUERY_ANSWERED';
  }

  const response = await aiService.generateResponse(result);

  res.json({
    intent,
    entities,
    action,
    response,
    actionResult: actionResult || null,
  });
});

/**
 * POST /ai/process-audio
 * Process audio message (base64 encoded)
 */
router.post('/process-audio', async (req, res) => {
  const { audioBase64, userId } = req.body;

  if (!audioBase64 || !userId) {
    return res.status(400).json({ error: 'Missing required fields: audioBase64, userId' });
  }

  logger.info(`Processing audio for user ${userId}`);

  const audioBuffer = Buffer.from(audioBase64, 'base64');
  const transcribedText = await aiService.transcribeAudio(audioBuffer);

  logger.info(`Audio transcribed: ${transcribedText}`);

  // Process transcribed text as message
  const result = await aiService.processMessage(transcribedText, userId);
  const { intent, entities } = result;

  let action = null;
  let actionResult = null;

  switch (intent) {
    case 'EXPENSE':
      if (entities.value) {
        actionResult = await transactionService.createTransaction(userId, {
          amount: entities.value,
          category: entities.category,
          description: entities.description,
          paymentMethod: entities.paymentMethod,
          creditCard: entities.creditCard,
        });
        action = 'EXPENSE_CREATED';
      }
      break;

    case 'INCOME':
      if (entities.value) {
        actionResult = await incomeService.createIncome(userId, {
          amount: entities.value,
          type: entities.type,
          description: entities.description,
        });
        action = 'INCOME_CREATED';
      }
      break;

    default:
      action = 'QUERY_ANSWERED';
  }

  const response = await aiService.generateResponse(result);

  res.json({
    transcribedText,
    intent,
    entities,
    action,
    response,
    actionResult: actionResult || null,
  });
});

/**
 * POST /ai/link-account
 * Link messaging account (Telegram/WhatsApp) to user
 */
router.post('/link-account', async (req, res) => {
  const { messagingId, userId, profile } = req.body;

  if (!messagingId || !userId || !profile) {
    return res.status(400).json({ error: 'Missing required fields: messagingId, userId, profile' });
  }

  if (!['husband', 'wife'].includes(profile)) {
    return res.status(400).json({ error: 'Profile must be "husband" or "wife"' });
  }

  logger.info(`Linking account ${messagingId} to user ${userId}`);

  const result = await userContextService.linkAccount(messagingId, userId, profile);

  res.json({
    success: true,
    message: `Account linked successfully as ${profile}`,
    mapping: result,
  });
});

export default router;
