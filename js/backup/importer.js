import { BackupValidator } from './validator.js';
import { Haptics } from '../utils/haptics.js';

export class BackupImporter {
  constructor(db) {
    this.db = db;
  }

  async importFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        Haptics.error();
        return reject(new Error('No file provided.'));
      }

      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const rawText = e.target.result;
          const backupData = JSON.parse(rawText);

          const validation = await BackupValidator.validate(backupData);
          if (!validation.valid) {
            Haptics.error();
            return reject(new Error(validation.error));
          }

          await this.restorePayload(backupData.payload);
          Haptics.success();
          resolve(validation);
        } catch (err) {
          Haptics.error();
          reject(new Error(`Restore execution failed: ${err.message}`));
        }
      };

      reader.onerror = () => {
        Haptics.error();
        reject(new Error('Failed reading file from storage.'));
      };

      reader.readAsText(file);
    });
  }

  async restorePayload(payload) {
    const rawDb = await this.db.open();
    const storeNames = ['transactions', 'recurring', 'goals', 'settings'];

    return new Promise((resolve, reject) => {
      const tx = rawDb.transaction(storeNames, 'readwrite');

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error('Atomic restore transaction aborted.'));

      for (const storeName of storeNames) {
        const store = tx.objectStore(storeName);
        store.clear();

        const items = payload[storeName] || [];
        for (const item of items) {
          store.put(item);
        }
      }
    });
  }
}
