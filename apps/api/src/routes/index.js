import { Router } from 'express';
import healthCheck from './health-check.js';
import telegramRoutes from './telegramRoutes.js';
import whatsappRoutes from './whatsappRoutes.js';
import aiRoutes from './aiRoutes.js';
import messagingAccountsRoutes from './messagingAccounts.js';

const router = Router();

export default () => {
    router.get('/health', healthCheck);
    router.use('/telegram', telegramRoutes);
    router.use('/whatsapp', whatsappRoutes);
    router.use('/ai', aiRoutes);
    router.use('/messaging-accounts', messagingAccountsRoutes);

    return router;
};
