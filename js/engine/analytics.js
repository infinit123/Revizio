export function calculateSafeToSpend({ transactions, recurring, goals, monthlyBudget, currentDate = new Date() }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = currentDate.getDate();
  const daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1);

  const monthTxs = transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getFullYear() === year && d.getMonth() === month && !tx.excludeFromAnalytics;
  });

  const spentSoFar = monthTxs
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const incomeSoFar = monthTxs
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const pendingRecurring = recurring
    .filter(rec => {
      if (rec.status !== 'active') return false;
      const dueDate = new Date(rec.nextDueDate);
      return dueDate.getFullYear() === year && 
             dueDate.getMonth() === month && 
             dueDate.getDate() >= currentDay;
    })
    .reduce((sum, rec) => sum + Number(rec.amount), 0);

  const monthlyGoalAllocations = goals
    .filter(g => g.status !== 'completed' && g.targetDate)
    .reduce((sum, g) => {
      const target = new Date(g.targetDate);
      const monthsLeft = Math.max(1, (target.getFullYear() - year) * 12 + (target.getMonth() - month));
      const remainingAmount = Math.max(0, g.targetAmount - g.currentAmount);
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
