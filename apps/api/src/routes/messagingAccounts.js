import 'dotenv/config';
import express from 'express';
import logger from '../utils/logger.js';
import pb from '../utils/pocketbaseClient.js';

const router = express.Router();

/**
 * GET /messaging-accounts/status
 * Fetch current user's Telegram and WhatsApp connection status
 */
router.get('/status', async (req, res) => {
  const userId = req.auth?.id;

  if (!userId) {
    return res.status(400).json({ error: 'User not authenticated' });
  }

  logger.info(`Fetching messaging account status for user ${userId}`);

  const accounts = await pb.collection('userMessagingAccounts').getFullList({
    filter: `userId = "${userId}"`,
  });

  const status = {
    telegram: {
      connected: false,
      telegramId: null,
      profile: null,
    },
    whatsapp: {
      connected: false,
      whatsappPhone: null,
      profile: null,
    },
  };

  accounts.forEach(account => {
    if (account.telegramId) {
      status.telegram = {
        connected: true,
        telegramId: account.telegramId,
        profile: account.profile || null,
      };
    }
    if (account.whatsappPhone) {
      status.whatsapp = {
        connected: true,
        whatsappPhone: account.whatsappPhone,
        profile: account.profile || null,
      };
    }
  });

  logger.info(`Messaging account status retrieved for user ${userId}`);
  res.json(status);
});

/**
 * POST /telegram/link-account
 * Link Telegram account to current user
 */
router.post('/telegram/link-account', async (req, res) => {
  const userId = req.auth?.id;
  const { telegramId, profile } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User not authenticated' });
  }

  if (!telegramId || typeof telegramId !== 'number') {
    return res.status(400).json({ error: 'telegramId must be a number' });
  }

  if (!profile || !['husband', 'wife'].includes(profile)) {
    return res.status(400).json({ error: 'profile must be "husband" or "wife"' });
  }

  logger.info(`Linking Telegram account ${telegramId} to user ${userId}`);

  // Check if Telegram account already exists for this user
  const existing = await pb.collection('userMessagingAccounts').getFullList({
    filter: `userId = "${userId}" && telegramId != null`,
  });

  let result;
  if (existing.length > 0) {
    // Update existing Telegram account
    result = await pb.collection('userMessagingAccounts').update(existing[0].id, {
      telegramId,
      profile,
    });
    logger.info(`Telegram account updated for user ${userId}`);
  } else {
    // Create new account mapping
    result = await pb.collection('userMessagingAccounts').create({
      userId,
      telegramId,
      profile,
    });
    logger.info(`Telegram account created for user ${userId}`);
  }

  res.json({
    success: true,
    message: 'Telegram linked successfully',
    telegramId: result.telegramId,
  });
});

/**
 * POST /whatsapp/link-account
 * Link WhatsApp account to current user
 */
router.post('/whatsapp/link-account', async (req, res) => {
  const userId = req.auth?.id;
  const { whatsappPhone, profile } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User not authenticated' });
  }

  if (!whatsappPhone || typeof whatsappPhone !== 'string') {
    return res.status(400).json({ error: 'whatsappPhone must be a string' });
  }

  // Validate WhatsApp phone format: 55XXXXXXXXXXX (Brazil country code + 11 digits)
  const phoneRegex = /^55\d{11}$/;
  if (!phoneRegex.test(whatsappPhone)) {
    return res.status(400).json({ error: 'whatsappPhone must match format 55XXXXXXXXXXX' });
  }

  if (!profile || !['husband', 'wife'].includes(profile)) {
    return res.status(400).json({ error: 'profile must be "husband" or "wife"' });
  }

  logger.info(`Linking WhatsApp account ${whatsappPhone} to user ${userId}`);

  // Check if WhatsApp account already exists for this user
  const existing = await pb.collection('userMessagingAccounts').getFullList({
    filter: `userId = "${userId}" && whatsappPhone != null`,
  });

  let result;
  if (existing.length > 0) {
    // Update existing WhatsApp account
    result = await pb.collection('userMessagingAccounts').update(existing[0].id, {
      whatsappPhone,
      profile,
    });
    logger.info(`WhatsApp account updated for user ${userId}`);
  } else {
    // Create new account mapping
    result = await pb.collection('userMessagingAccounts').create({
      userId,
      whatsappPhone,
      profile,
    });
    logger.info(`WhatsApp account created for user ${userId}`);
  }

  res.json({
    success: true,
    message: 'WhatsApp linked successfully',
    whatsappPhone: result.whatsappPhone,
  });
});

/**
 * DELETE /telegram/unlink-account
 * Remove Telegram connection for current user
 */
router.delete('/telegram/unlink-account', async (req, res) => {
  const userId = req.auth?.id;

  if (!userId) {
    return res.status(400).json({ error: 'User not authenticated' });
  }

  logger.info(`Unlinking Telegram account for user ${userId}`);

  const accounts = await pb.collection('userMessagingAccounts').getFullList({
    filter: `userId = "${userId}" && telegramId != null`,
  });

  if (accounts.length === 0) {
    return res.status(400).json({ error: 'No Telegram account linked' });
  }

  await pb.collection('userMessagingAccounts').delete(accounts[0].id);

  logger.info(`Telegram account unlinked for user ${userId}`);
  res.json({
    success: true,
    message: 'Telegram unlinked successfully',
  });
});

/**
 * DELETE /whatsapp/unlink-account
 * Remove WhatsApp connection for current user
 */
router.delete('/whatsapp/unlink-account', async (req, res) => {
  const userId = req.auth?.id;

  if (!userId) {
    return res.status(400).json({ error: 'User not authenticated' });
  }

  logger.info(`Unlinking WhatsApp account for user ${userId}`);

  const accounts = await pb.collection('userMessagingAccounts').getFullList({
    filter: `userId = "${userId}" && whatsappPhone != null`,
  });

  if (accounts.length === 0) {
    return res.status(400).json({ error: 'No WhatsApp account linked' });
  }

  await pb.collection('userMessagingAccounts').delete(accounts[0].id);

  logger.info(`WhatsApp account unlinked for user ${userId}`);
  res.json({
    success: true,
    message: 'WhatsApp unlinked successfully',
  });
});

export default router;
