import 'dotenv/config';
import pocketbaseClient from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

/**
 * Create a financial goal
 * @param {string} userId - User ID
 * @param {Object} data - Goal data
 * @returns {Promise<Object>} Created goal
 */
export async function createGoal(userId, data) {
  try {
    logger.info(`Creating goal for user ${userId}`);

    const goal = await pocketbaseClient.collection('goals').create({
      userId,
      title: data.title,
      targetAmount: data.targetAmount,
      currentAmount: 0,
      deadline: data.deadline,
      icon: data.icon || '🎯',
      color: data.color || '#3B82F6',
    });

    logger.info(`Goal created: ${goal.id}`);
    return goal;
  } catch (error) {
    logger.error('Goal creation error:', error.message);
    throw new Error(`Failed to create goal: ${error.message}`);
  }
}

/**
 * Update goal progress
 * @param {string} goalId - Goal ID
 * @param {number} amount - Amount to add to current progress
 * @returns {Promise<Object>} Updated goal
 */
export async function updateGoalProgress(goalId, amount) {
  try {
    logger.info(`Updating progress for goal ${goalId}`);

    const goal = await pocketbaseClient.collection('goals').getOne(goalId);
    const newAmount = (goal.currentAmount || 0) + amount;

    const updated = await pocketbaseClient.collection('goals').update(goalId, {
      currentAmount: newAmount,
    });

    logger.info(`Goal progress updated: R$ ${newAmount}`);
    return updated;
  } catch (error) {
    logger.error('Goal progress update error:', error.message);
    throw new Error(`Failed to update goal progress: ${error.message}`);
  }
}

/**
 * Get all goals for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of goals
 */
export async function getGoals(userId) {
  try {
    logger.info(`Getting goals for user ${userId}`);

    const goals = await pocketbaseClient.collection('goals').getList(1, 100, {
      filter: `userId="${userId}"`,
      sort: 'deadline',
    });

    logger.info(`Found ${goals.items.length} goals`);
    return goals.items;
  } catch (error) {
    logger.error('Get goals error:', error.message);
    throw new Error(`Failed to get goals: ${error.message}`);
  }
}

/**
 * Get goal progress details
 * @param {string} goalId - Goal ID
 * @returns {Promise<Object>} Goal progress information
 */
export async function getGoalProgress(goalId) {
  try {
    logger.info(`Getting progress for goal ${goalId}`);

    const goal = await pocketbaseClient.collection('goals').getOne(goalId);

    const targetAmount = goal.targetAmount || 0;
    const currentAmount = goal.currentAmount || 0;
    const percentage = targetAmount > 0 ? Math.round((currentAmount / targetAmount) * 100) : 0;

    const deadline = new Date(goal.deadline);
    const today = new Date();
    const daysRemaining = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    const progress = {
      goalId,
      title: goal.title,
      targetAmount,
      currentAmount,
      percentage,
      daysRemaining: Math.max(0, daysRemaining),
      icon: goal.icon,
      color: goal.color,
    };

    logger.info(`Goal progress: ${percentage}% complete`);
    return progress;
  } catch (error) {
    logger.error('Get goal progress error:', error.message);
    throw new Error(`Failed to get goal progress: ${error.message}`);
  }
}

export default {
  createGoal,
  updateGoalProgress,
  getGoals,
  getGoalProgress,
};
