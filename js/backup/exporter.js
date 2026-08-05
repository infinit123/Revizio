import { CONFIG } from '../config.js';
import { BackupValidator } from './validator.js';
import { Haptics } from '../utils/haptics.js';

export class BackupExporter {
  constructor(db) {
    this.db = db;
  }

  async exportData() {
    try {
      const [transactions, recurring, goals, settings] = await Promise.all([
        this.db.getAll('transactions'),
        this.db.getAll('recurring'),
        this.db.getAll('goals'),
        this.db.getAll('settings')
      ]);

      const payload = { transactions, recurring, goals, settings };
      const hash = await BackupValidator.computeHash(JSON.stringify(payload));

      const backupPackage = {
        meta: {
          app: CONFIG.APP_NAME,
          version: CONFIG.VERSION,
          exportedAt: new Date().toISOString(),
          schemaVersion: CONFIG.DB_VERSION
        },
        payload,
        hash
      };

      const jsonString = JSON.stringify(backupPackage, null, 2);
      const filename = `Finora_Backup_${new Date().toISOString().slice(0, 10)}.json`;

      if (navigator.share && navigator.canShare) {
        const file = new File([jsonString], filename, { type: 'application/json' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Finora Data Backup',
            files: [file]
          });
          Haptics.success();
          return { success: true, method: 'share' };
        }
      }

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      Haptics.success();
      return { success: true, method: 'download' };
    } catch (error) {
      Haptics.error();
      console.error('Export failed:', error);
      throw error;
    }
  }
}
