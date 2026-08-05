export function normalizeMerchant(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/(https?:\/\/)?(www\.)?/, '')
    .replace(/\b(inc|ltd|llc|corp|co|com|net|org)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

export function detectRecurringPatterns(transactions = []) {
  const merchantGroups = {};

  transactions
    .filter((tx) => tx && tx.type === 'expense' && tx.merchant)
    .forEach((tx) => {
      const key = normalizeMerchant(tx.merchant);
      if (!key) return;
      if (!merchantGroups[key]) merchantGroups[key] = [];
      const d = new Date(tx.date);
      if (isNaN(d.getTime())) return;

      merchantGroups[key].push({
        amount: Number(tx.amount) || 0,
        date: d.getTime(),
        rawMerchant: tx.merchant,
        category: tx.category || 'General'
      });
    });

  const candidates = [];

  for (const [key, items] of Object.entries(merchantGroups)) {
    if (items.length < 3) continue;

    items.sort((a, b) => a.date - b.date);

    const intervals = [];
    for (let i = 1; i < items.length; i++) {
      const diffDays = (items[i].date - items[i - 1].date) / (1000 * 60 * 60 * 24);
      intervals.push(diffDays);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (avgInterval <= 0) continue;

    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    const amounts = items.map((i) => i.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    if (avgAmount <= 0) continue;

    const maxAmountDiff = Math.max(...amounts.map((a) => Math.abs(a - avgAmount)));
    const amountVariancePercent = (maxAmountDiff / avgAmount) * 100;

    if (stdDev <= 4 && amountVariancePercent <= 15) {
      let frequency = 'custom';
      if (Math.abs(avgInterval - 7) <= 2) frequency = 'weekly';
      else if (Math.abs(avgInterval - 30) <= 4) frequency = 'monthly';
      else if (Math.abs(avgInterval - 365) <= 10) frequency = 'yearly';

      candidates.push({
        merchant: items[items.length - 1].rawMerchant,
        normalizedKey: key,
        avgAmount: Number(avgAmount.toFixed(2)),
        estimatedFrequency: frequency,
        confidenceScore: Math.min(100, Math.max(0, Math.round(100 - (stdDev * 10 + amountVariancePercent)))),
        category: items[items.length - 1].category
      });
    }
  }

  return candidates;
}
