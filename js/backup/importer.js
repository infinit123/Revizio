import { validateBackupStructure, computeSha256Hex } from './validator.js';
import { dbBulkReplace } from '../db/database.js';

export async function importBackup(jsonText) {
  let obj;
  try {
    obj = JSON.parse(jsonText);
  } catch {
    throw new Error('Backup invalid: JSON corupt.');
  }

  validateBackupStructure(obj);

  const dataString = JSON.stringify({
    transactions: obj.transactions,
    recurring: obj.recurring,
    goals: obj.goals,
    settings: obj.settings
  });

  const hash = await computeSha256Hex(dataString);
  if (hash !== obj.meta.hash) {
    throw new Error('Backup invalid: hash SHA-256 nu corespunde.');
  }

  await dbBulkReplace({
    transactions: obj.transactions,
    recurring: obj.recurring,
    goals: obj.goals,
    settings: obj.settings
  });
}

