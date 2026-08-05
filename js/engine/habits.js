function normalizeMerchantName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '');
}

function computeIntervals(dates) {
  const sorted = dates.slice().sort((a, b) => a - b);
  const intervals = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(sorted[i] - sorted[i - 1]);
  }
  return intervals;
}

function classifyRecurring(intervals) {
  if (!intervals.length) return { isRecurring: false, confidence: 0, periodDays: 0 };
  const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const avgDays = avgMs / (1000 * 60 * 60 * 24);

  const monthlyRange = { min: 25, max: 35 };
  const weeklyRange = { min: 5, max: 9 };

  let confidence = 0;
  let periodDays = 0;

  if (avgDays >= monthlyRange.min && avgDays <= monthlyRange.max) {
    periodDays = 30;
    confidence = 0.7;
  } else if (avgDays >= weeklyRange.min && avgDays <= weeklyRange.max) {
    periodDays = 7;
    confidence = 0.6;
  }

  const variance = intervals.reduce((acc, v) => {
    const diff = v - avgMs;
    return acc + diff * diff;
  }, 0) / intervals.length;

  const stabilityFactor = 1 / (1 + variance / (avgMs || 1));
  confidence *= stabilityFactor;

  return {
    isRecurring: confidence > 0.5,
    confidence,
    periodDays
  };
}

export function detectHabits(transactions) {
  const groups = new Map();

  (transactions || []).forEach(tx => {
    if (tx.type !== 'expense') return;
    const normalized = normalizeMerchantName(tx.merchant);
    if (!normalized) return;
    const date = new Date(tx.date);
    const amount = Number.isFinite(tx.amount) ? tx.amount : 0;
    if (!groups.has(normalized)) {
      groups.set(normalized, []);
    }
    groups.get(normalized).push({ date, amount, original: tx });
  });

  const recurring = [];

  groups.forEach((entries, merchantKey) => {
    if (entries.length < 3) return;
    const dates = entries.map(e => e.date.getTime());
    const intervals = computeIntervals(dates);
    const classification = classifyRecurring(intervals);
    if (!classification.isRecurring) return;

    const avgAmount =
      entries.reduce((sum, e) => sum + e.amount, 0) / entries.length;

    recurring.push({
      id: merchantKey,
      merchantKey,
      merchantDisplay: entries[entries.length - 1].original.merchant,
      amount: avgAmount,
      periodDays: classification.periodDays,
      confidence: classification.confidence
    });
  });

  return {
    recurring
  };
}

