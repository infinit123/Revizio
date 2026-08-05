export function calculateSafeToSpend({ transactions = [], recurring = [], goals = [], monthlyBudget = 0, currentDate = new Date() }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = currentDate.getDate();
  const daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1);

  const monthTxs = transactions.filter((tx) => {
    if (!tx || !tx.date) return false;
    const d = new Date(tx.date);
    return !isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month && !tx.excludeFromAnalytics;
  });

  const spentSoFar = monthTxs
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const incomeSoFar = monthTxs
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const pendingRecurring = recurring
    .filter((rec) => {
      if (!rec || rec.status !== 'active' || !rec.nextDueDate) return false;
      const dueDate = new Date(rec.nextDueDate);
      return !isNaN(dueDate.getTime()) &&
             dueDate.getFullYear() === year &&
             dueDate.getMonth() === month &&
             dueDate.getDate() >= currentDay;
    })
    .reduce((sum, rec) => sum + (Number(rec.amount) || 0), 0);

  const monthlyGoalAllocations = goals
    .filter((g) => g && g.status !== 'completed' && g.targetDate)
    .reduce((sum, g) => {
      const target = new Date(g.targetDate);
      if (isNaN(target.getTime())) return sum;
      const monthsLeft = Math.max(1, (target.getFullYear() - year) * 12 + (target.getMonth() - month));
      const remainingAmount = Math.max(0, (Number(g.targetAmount) || 0) - (Number(g.currentAmount) || 0));
      return sum + (remainingAmount / monthsLeft);
    }, 0);

  const totalPool = monthlyBudget > 0 ? monthlyBudget : incomeSoFar;
  const safeToSpendTotal = Math.max(0, totalPool - spentSoFar - pendingRecurring - monthlyGoalAllocations);
  const dailySafeToSpend = safeToSpendTotal / daysRemaining;

  return {
    safeToSpendTotal: Number(safeToSpendTotal.toFixed(2)),
    dailySafeToSpend: Number(dailySafeToSpend.toFixed(2)),
    spentSoFar: Number(spentSoFar.toFixed(2)),
    pendingRecurring: Number(pendingRecurring.toFixed(2)),
    goalAllocations: Number(monthlyGoalAllocations.toFixed(2)),
    daysRemaining
  };
}
