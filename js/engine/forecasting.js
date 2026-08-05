export function forecastMonthlySpend(transactions = [], monthlyBudget = 0, currentDate = new Date()) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const currentDay = currentDate.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dailySpendMap = {};
  for (let d = 1; d <= currentDay; d++) {
    dailySpendMap[d] = 0;
  }

  transactions.forEach((tx) => {
    if (!tx || !tx.date || tx.type !== 'expense' || tx.excludeFromAnalytics) return;
    const d = new Date(tx.date);
    if (!isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (dailySpendMap[day] !== undefined) {
        dailySpendMap[day] += Number(tx.amount) || 0;
      }
    }
  });

  const dailySpendArray = Object.values(dailySpendMap);
  const spentSoFar = dailySpendArray.reduce((a, b) => a + b, 0);

  const alpha = 0.3;
  let ewma = dailySpendArray[0] || 0;
  for (let i = 1; i < dailySpendArray.length; i++) {
    ewma = alpha * dailySpendArray[i] + (1 - alpha) * ewma;
  }

  const daysRemaining = daysInMonth - currentDay;
  const projectedRemainingSpend = ewma * daysRemaining;
  const projectedTotalSpend = spentSoFar + projectedRemainingSpend;

  const budgetDelta = monthlyBudget > 0 ? monthlyBudget - projectedTotalSpend : 0;
  const status = monthlyBudget > 0 && projectedTotalSpend > monthlyBudget ? 'over_budget' : 'on_track';

  return {
    spentSoFar: Number(spentSoFar.toFixed(2)),
    dailyVelocity: Number(ewma.toFixed(2)),
    projectedTotalSpend: Number(projectedTotalSpend.toFixed(2)),
    projectedRemainingSpend: Number(projectedRemainingSpend.toFixed(2)),
    budgetDelta: Number(budgetDelta.toFixed(2)),
    status
  };
}
