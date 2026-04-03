import 'dotenv/config';
import pocketbaseClient from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const VALID_INCOME_TYPES = ['salary', 'business', 'proLabore'];

/**
 * Create income record
 * @param {string} userId - User ID
 * @param {Object} data - Income data
 * @returns {Promise<Object>} Created income
 */
export async function createIncome(userId, data) {
  try {
    logger.info(`Creating income for user ${userId}`);

    if (!VALID_INCOME_TYPES.includes(data.type)) {
      throw new Error(`Invalid income type. Must be one of: ${VALID_INCOME_TYPES.join(', ')}`);
    }

    const income = await pocketbaseClient.collection('incomes').create({
      userId,
      type: data.type,
      amount: data.amount,
      description: data.description || '',
      date: data.date || new Date().toISOString().split('T')[0],
      frequency: data.frequency || 'once',
    });

    logger.info(`Income created: ${income.id}`);
    return income;
  } catch (error) {
    logger.error('Income creation error:', error.message);
    throw new Error(`Failed to create income: ${error.message}`);
  }
}

/**
 * Get monthly income sum
 * @param {string} userId - User ID
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {Promise<Object>} {total: number, byType: {salary: number, business: number, proLabore: number}}
 */
export async function getMonthlyIncome(userId, month, year = new Date().getFullYear()) {
  try {
    logger.info(`Getting monthly income for user ${userId}`);

    const monthStr = String(month).padStart(2, '0');
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonthStr = String(nextMonth).padStart(2, '0');

    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${nextYear}-${nextMonthStr}-01`;

    const filter = `userId="${userId}" && date >= "${startDate}" && date < "${endDate}"`;

    const incomes = await pocketbaseClient.collection('incomes').getList(1, 500, {
      filter,
    });

    const byType = {
      salary: 0,
      business: 0,
      proLabore: 0,
    };
    let total = 0;

    incomes.items.forEach(i => {
      total += i.amount || 0;
      if (Object.prototype.hasOwnProperty.call(byType, i.type)) {
        byType[i.type] += i.amount || 0;
      }
    });

    logger.info(`Monthly income: R$ ${total}`);
    return { total, byType };
  } catch (error) {
    logger.error('Monthly income error:', error.message);
    throw new Error(`Failed to get monthly income: ${error.message}`);
  }
}

export default {
  createIncome,
  getMonthlyIncome,
};
