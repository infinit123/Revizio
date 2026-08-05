function groupExpensesByDay(transactions) {
  const map = new Map();
  (transactions || []).forEach(tx => {
    if (tx.type !== 'expense') return;
    const date = new Date(tx.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
    const amount = Number.isFinite(tx.amount) ? tx.amount : 0;
    map.set(key, (map.get(key) || 0) + amount);
  });
  const entries = Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  return entries.map(([date, total]) => ({ date, total }));
}

function ewma(points, alpha) {
  if (!points.length) return [];
  const result = [];
  let prev = points[0].total;
  result.push({ date: points[0].date, value: prev });
  for (let i = 1; i < points.length; i++) {
    const x = points[i].total;
    const value = alpha * x + (1 - alpha) * prev;
    result.push({ date: points[i].date, value });
    prev = value;
  }
  return result;
}

function daysInMonthFromDate(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function computeForecast({ transactions, alpha, minPoints }) {
  const grouped = groupExpensesByDay(transactions || []);
  if (grouped.length < (minPoints || 5)) {
    return {
      dailyRate: 0,
      monthTotal: 0,
      confidence: 0,
      points: []
    };
  }

  const ewmaSeries = ewma(grouped, alpha || 0.35);
  const lastPoint = ewmaSeries[ewmaSeries.length - 1];
  const dailyRate = Number.isFinite(lastPoint.value) ? lastPoint.value : 0;

  const lastDateParts = lastPoint.date.split('-');
  const year = parseInt(lastDateParts[0], 10);
  const monthIndex = parseInt(lastDateParts[1], 10) - 1;
  const day = parseInt(lastDateParts[2], 10);
  const totalDays = daysInMonthFromDate(new Date(year, monthIndex, day));
  const remainingDays = Math.max(totalDays - day + 1, 1);

  const monthTotal = dailyRate * remainingDays;

  const variance = ewmaSeries.reduce((acc, p) => {
    const diff = p.value - dailyRate;
    return acc + diff * diff;
  }, 0) / ewmaSeries.length;

  const confidence = Math.max(0, Math.min(1, 1 / (1 + variance / (dailyRate || 1 || 1))));

  return {
    dailyRate,
    monthTotal,
    confidence,
    points: ewmaSeries
  };
}

