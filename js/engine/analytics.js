import { ANALYTICS } from '../config.js';

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function normalizeAmount(value) {
  if (!Number.isFinite(value)) return 0;
  return value;
}

export function computeSafeToSpend({ today, transactions, recurring, goals, monthlyBudget }) {
  const now = today instanceof Date ? today : new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const totalDays = daysInMonth(now.getFullYear(), now.getMonth());
  const dayIndex = Math.min(
    Math.max(1, now.getDate()),
    totalDays
  );

  const budget = normalizeAmount(monthlyBudget);

  let spentSoFar = 0;
  let incomeSoFar = 0;

  (transactions || []).forEach(tx => {
    const txDate = new Date(tx.date);
    if (txDate >= monthStart && txDate <= now) {
      const amount = normalizeAmount(tx.amount);
      if (tx.type === 'expense') {
        spentSoFar += amount;
      } else if (tx.type === 'income') {
        incomeSoFar += amount;
      }
    }
  });

  let recurringMonthTotal = 0;
  (recurring || []).forEach(item => {
    const amount = normalizeAmount(item.amount);
    recurringMonthTotal += amount;
  });

  let goalsAllocation = 0;
  (goals || []).forEach(goal => {
    const allocated = normalizeAmount(goal.allocated);
    goalsAllocation += allocated;
  });

  const effectiveBudget = budget + incomeSoFar - recurringMonthTotal - goalsAllocation;
  const remainingMonth = Math.max(effectiveBudget - spentSoFar, 0);

  const remainingDays = Math.max(totalDays - dayIndex + 1, 1);
  const dailyBudget = remainingDays > 0 ? remainingMonth / remainingDays : ANALYTICS.MIN_DAILY_BUDGET;

  const todayBudget = dailyBudget;

  return {
    today: Number.isFinite(todayBudget) ? todayBudget : 0,
    dailyBudget: Number.isFinite(dailyBudget) ? dailyBudget : 0,
    remainingMonth: Number.isFinite(remainingMonth) ? remainingMonth : 0
  };
}

