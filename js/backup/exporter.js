import { BACKUP } from '../config.js';
import { dbGetAll } from '../db/database.js';
import { STORES } from '../config.js';
import { computeSha256Hex } from './validator.js';

export async function exportBackup() {
  const [transactions, recurring, goals, settings] = await Promise.all([
    dbGetAll(STORES.TRANSACTIONS),
    dbGetAll(STORES.RECURRING),
    dbGetAll(STORES.GOALS),
    dbGetAll(STORES.SETTINGS)
  ]);

  const payload = {
    transactions: transactions || [],
    recurring: recurring || [],
    goals: goals || [],
    settings: settings || [],
    meta: {
      version: BACKUP.EXPORT_VERSION,
      createdAt: new Date().toISOString()
    }
  };

  const dataString = JSON.stringify({
    transactions: payload.transactions,
    recurring: payload.recurring,
    goals: payload.goals,
    settings: payload.settings
  });

  const hash = await computeSha256Hex(dataString);
  payload.meta.hash = hash;

  const finalString = JSON.stringify(payload);
  return new Blob([finalString], { type: 'application/json' });
}

