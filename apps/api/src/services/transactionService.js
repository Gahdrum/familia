import 'dotenv/config';
import pocketbaseClient from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

/**
 * Create a transaction (expense)
 * @param {string} userId - User ID
 * @param {Object} data - Transaction data
 * @returns {Promise<Object>} Created transaction
 */
export async function createTransaction(userId, data) {
  try {
    logger.info(`Creating transaction for user ${userId}`);

    const transaction = await pocketbaseClient.collection('transactions').create({
      userId,
      amount: data.amount,
      category: data.category || 'Outros',
      description: data.description || '',
      type: data.type || 'expense',
      paymentMethod: data.paymentMethod || 'dinheiro',
      creditCard: data.creditCard || null,
      date: data.date || new Date().toISOString().split('T')[0],
      status: 'completed',
    });

    logger.info(`Transaction created: ${transaction.id}`);
    return transaction;
  } catch (error) {
    logger.error('Transaction creation error:', error.message);
    throw new Error(`Failed to create transaction: ${error.message}`);
  }
}

/**
 * Get monthly expenses sum
 * @param {string} userId - User ID
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {Promise<Object>} {total: number, byCategory: {[category]: amount}}
 */
export async function getMonthlyExpenses(userId, month, year = new Date().getFullYear()) {
  try {
    logger.info(`Getting monthly expenses for user ${userId}`);

    const monthStr = String(month).padStart(2, '0');
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonthStr = String(nextMonth).padStart(2, '0');

    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${nextYear}-${nextMonthStr}-01`;

    const filter = `userId="${userId}" && date >= "${startDate}" && date < "${endDate}"`;

    const transactions = await pocketbaseClient.collection('transactions').getList(1, 500, {
      filter,
    });

    const byCategory = {};
    let total = 0;

    transactions.items.forEach(t => {
      total += t.amount || 0;
      const category = t.category || 'Outros';
      byCategory[category] = (byCategory[category] || 0) + (t.amount || 0);
    });

    logger.info(`Monthly expenses: R$ ${total}`);
    return { total, byCategory };
  } catch (error) {
    logger.error('Monthly expenses error:', error.message);
    throw new Error(`Failed to get monthly expenses: ${error.message}`);
  }
}

/**
 * Get wallet balance
 * @param {string} userId - User ID
 * @returns {Promise<Object>} {balance: number, walletId: string}
 */
export async function getWalletBalance(userId) {
  try {
    logger.info(`Getting wallet balance for user ${userId}`);

    const wallet = await pocketbaseClient.collection('wallets').getFirstListItem(`userId="${userId}"`);

    logger.info(`Wallet balance: R$ ${wallet.balance}`);
    return {
      balance: wallet.balance || 0,
      walletId: wallet.id,
    };
  } catch (error) {
    logger.error('Wallet balance error:', error.message);
    throw new Error(`Failed to get wallet balance: ${error.message}`);
  }
}

/**
 * Get upcoming bills (due in next N days)
 * @param {string} userId - User ID
 * @param {number} days - Number of days to look ahead
 * @returns {Promise<Array>} List of upcoming transactions
 */
export async function getUpcomingBills(userId, days = 7) {
  try {
    logger.info(`Getting upcoming bills for user ${userId}`);

    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

    const todayStr = today.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];

    const filter = `userId="${userId}" && date >= "${todayStr}" && date <= "${futureStr}"`;

    const bills = await pocketbaseClient.collection('transactions').getList(1, 500, {
      filter,
      sort: 'date',
    });

    logger.info(`Found ${bills.items.length} upcoming bills`);
    return bills.items.map(b => ({
      id: b.id,
      description: b.description,
      amount: b.amount,
      dueDate: b.date,
      category: b.category,
    }));
  } catch (error) {
    logger.error('Upcoming bills error:', error.message);
    throw new Error(`Failed to get upcoming bills: ${error.message}`);
  }
}

/**
 * Split expense among multiple people
 * @param {string} transactionId - Transaction ID to split
 * @param {string} method - Split method ('equal' or 'proportional')
 * @returns {Promise<Object>} {husbandAmount, wifeAmount}
 */
export async function splitExpense(transactionId, method = 'equal') {
  try {
    logger.info(`Splitting expense ${transactionId}`);

    const transaction = await pocketbaseClient.collection('transactions').getOne(transactionId);

    let husbandAmount = 0;
    let wifeAmount = 0;

    if (method === 'equal') {
      husbandAmount = transaction.amount / 2;
      wifeAmount = transaction.amount / 2;
    } else if (method === 'proportional') {
      // Default 50/50 if no income ratio available
      husbandAmount = transaction.amount / 2;
      wifeAmount = transaction.amount / 2;
    }

    const split = await pocketbaseClient.collection('splitRecords').create({
      transactionId,
      husbandAmount,
      wifeAmount,
      splitMethod: method,
      createdAt: new Date().toISOString(),
    });

    logger.info(`Expense split: husband R$ ${husbandAmount}, wife R$ ${wifeAmount}`);
    return {
      husbandAmount,
      wifeAmount,
      splitId: split.id,
    };
  } catch (error) {
    logger.error('Split expense error:', error.message);
    throw new Error(`Failed to split expense: ${error.message}`);
  }
}

export default {
  createTransaction,
  getMonthlyExpenses,
  getWalletBalance,
  getUpcomingBills,
  splitExpense,
};
