import pb from '@/lib/pocketbaseClient';
import { apiServerClient } from '@/lib/apiServerClient';

const DEFAULT_EXPAND = 'category';

function getCurrentUserId() {
  const userId = pb.authStore.model?.id;

  if (!userId) {
    throw new Error('Usuário não autenticado');
  }

  return userId;
}

function getMonthRange(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const monthIndex = referenceDate.getMonth();

  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function normalizeTransaction(record) {
  return {
    id: record.id,
    date: record.date,
    amount: Number(record.amount || 0),
    description: record.description || 'Sem descrição',
    type: record.type,
    paymentMethod: record.paymentMethod,
    expenseKind: record.expenseKind || 'variable',
    category: record.expand?.category?.name || record.category || 'Outros',
    categoryId: typeof record.category === 'string' ? record.category : record.category?.id || null,
    raw: record,
  };
}

function normalizeGoal(record) {
  return {
    id: record.id,
    name: record.title,
    description: record.description || '',
    targetAmount: Number(record.targetAmount || 0),
    currentAmount: Number(record.currentAmount || 0),
    deadline: record.deadline || null,
    color: record.color || null,
    icon: record.icon || null,
    raw: record,
  };
}

async function listCategories() {
  const records = await pb.collection('categories').getFullList({
    sort: 'name',
    $autoCancel: false,
  });

  return records.map((record) => ({
    id: record.id,
    name: record.name,
    color: record.color || '#6b7280',
  }));
}

async function listTransactionsByType(type) {
  const userId = getCurrentUserId();

  const records = await pb.collection('transactions').getFullList({
    filter: `userId = "${userId}" && type = "${type}"`,
    sort: '-date,-created',
    expand: DEFAULT_EXPAND,
    $autoCancel: false,
  });

  return records.map(normalizeTransaction);
}

async function createTransaction(data) {
  const userId = getCurrentUserId();

  const record = await pb.collection('transactions').create(
    {
      userId,
      type: data.type,
      category: data.categoryId,
      description: data.description?.trim() || '',
      amount: Number(data.amount),
      date: data.date,
      paymentMethod: data.paymentMethod || 'cash',
      expenseKind: data.expenseKind || 'variable',
    },
    { $autoCancel: false },
  );

  return pb.collection('transactions').getOne(record.id, {
    expand: DEFAULT_EXPAND,
    $autoCancel: false,
  }).then(normalizeTransaction);
}

async function deleteTransaction(transactionId) {
  await pb.collection('transactions').delete(transactionId, { $autoCancel: false });
}

async function listGoals() {
  const userId = getCurrentUserId();

  const records = await pb.collection('goals').getFullList({
    filter: `userId = "${userId}"`,
    sort: '-created',
    $autoCancel: false,
  });

  return records.map(normalizeGoal);
}

async function createGoal(data) {
  const userId = getCurrentUserId();

  const record = await pb.collection('goals').create(
    {
      userId,
      title: data.name.trim(),
      description: data.description?.trim() || '',
      targetAmount: Number(data.targetAmount),
      currentAmount: 0,
    },
    { $autoCancel: false },
  );

  return normalizeGoal(record);
}

async function allocateGoalAmount(goalId, amount) {
  const currentGoal = await pb.collection('goals').getOne(goalId, { $autoCancel: false });
  const nextAmount = Number(currentGoal.currentAmount || 0) + Number(amount);

  const updated = await pb.collection('goals').update(
    goalId,
    { currentAmount: nextAmount },
    { $autoCancel: false },
  );

  return normalizeGoal(updated);
}

async function deleteGoal(goalId) {
  await pb.collection('goals').delete(goalId, { $autoCancel: false });
}

async function getDashboardSnapshot(referenceDate = new Date()) {
  const userId = getCurrentUserId();
  const { start, end } = getMonthRange(referenceDate);

  const [transactions, goals, apiResponse] = await Promise.all([
    pb.collection('transactions').getFullList({
      filter: `userId = "${userId}" && date >= "${start}" && date < "${end}"`,
      sort: '-date,-created',
      expand: DEFAULT_EXPAND,
      $autoCancel: false,
    }),
    pb.collection('goals').getFullList({
      filter: `userId = "${userId}"`,
      sort: '-created',
      $autoCancel: false,
    }),
    Promise.allSettled([
      apiServerClient.fetch(`/health`),
      apiServerClient.fetch(`/messaging-accounts/${userId}`),
    ]),
  ]);

  const normalizedTransactions = transactions.map(normalizeTransaction);
  const normalizedGoals = goals.map(normalizeGoal);
  const jointTransactions = normalizedTransactions.filter((item) => item.type === 'joint');
  const individualTransactions = normalizedTransactions.filter((item) => item.type === 'individual');

  const totalExpenses = normalizedTransactions.reduce((sum, item) => sum + item.amount, 0);
  const jointExpenses = jointTransactions.reduce((sum, item) => sum + item.amount, 0);
  const individualExpenses = individualTransactions.reduce((sum, item) => sum + item.amount, 0);

  const expensesByCategory = normalizedTransactions.reduce((accumulator, item) => {
    const key = item.category || 'Outros';
    accumulator[key] = (accumulator[key] || 0) + item.amount;
    return accumulator;
  }, {});

  const upcomingBills = normalizedTransactions
    .filter((item) => item.date >= start)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      description: item.description,
      amount: item.amount,
      dueDate: item.date,
      category: item.category,
      type: item.type,
    }));

  const goalsProgress = normalizedGoals.map((goal) => ({
    id: goal.id,
    name: goal.name,
    progress: goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0,
    currentAmount: goal.currentAmount,
    targetAmount: goal.targetAmount,
  }));

  return {
    referenceMonth: start.slice(0, 7),
    transactions: normalizedTransactions,
    goals: normalizedGoals,
    summary: {
      totalExpenses,
      jointExpenses,
      individualExpenses,
      transactionCount: normalizedTransactions.length,
      goalsCount: normalizedGoals.length,
      savedInGoals: normalizedGoals.reduce((sum, goal) => sum + goal.currentAmount, 0),
    },
    expensesByCategory,
    upcomingBills,
    goalsProgress,
    integrations: {
      apiReachable: apiResponse[0]?.status === 'fulfilled' && apiResponse[0].value.ok,
      messagingReachable: apiResponse[1]?.status === 'fulfilled' && apiResponse[1].value.ok,
    },
  };
}

export {
  allocateGoalAmount,
  createGoal,
  createTransaction,
  deleteGoal,
  deleteTransaction,
  getDashboardSnapshot,
  listCategories,
  listGoals,
  listTransactionsByType,
};
