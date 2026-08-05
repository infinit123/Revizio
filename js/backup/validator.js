export class BackupValidator {
  static async computeHash(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  static async validate(backupData) {
    if (!backupData || typeof backupData !== 'object') {
      return { valid: false, error: 'Invalid JSON payload structure.' };
    }

    const { meta, payload, hash } = backupData;

    if (!meta || meta.app !== 'Finora') {
      return { valid: false, error: 'Unrecognized backup file header.' };
    }

    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Backup payload missing.' };
    }

    const requiredStores = ['transactions', 'recurring', 'goals', 'settings'];
    for (const store of requiredStores) {
      if (!Array.isArray(payload[store])) {
        return { valid: false, error: `Missing store array: ${store}` };
      }
    }

    if (hash) {
      const computedHash = await this.computeHash(JSON.stringify(payload));
      if (computedHash !== hash) {
        return { valid: false, error: 'Cryptographic integrity check failed (SHA-256 mismatch).' };
      }
    }

    return {
      valid: true,
      meta,
      recordCounts: {
        transactions: payload.transactions.length,
        recurring: payload.recurring.length,
        goals: payload.goals.length,
        settings: payload.settings.length
      }
    };
  }
}
