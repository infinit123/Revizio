const DB_NAME = 'finora_db';
const DB_VERSION = 1;

export class Database {
    static async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (e) => reject(`IndexedDB error: ${e.target.error?.message}`);
            
            request.onsuccess = (e) => resolve(e.target.result);
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('transactions')) {
                    const store = db.createObjectStore('transactions', { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    static async addTransaction(transaction) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('transactions', 'readwrite');
            const store = tx.objectStore('transactions');
            
            const payload = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                ...transaction
            };

            const request = store.add(payload);
            
            request.onsuccess = () => resolve(payload);
            request.onerror = (e) => reject(`Insert failed: ${e.target.error?.message}`);
        });
    }

    static async getAllTransactions() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('transactions', 'readonly');
            const store = tx.objectStore('transactions');
            const index = store.index('timestamp');
            const request = index.getAll();
            
            request.onsuccess = () => {
                // Sort descending (newest first)
                const data = request.result.sort((a, b) => b.timestamp - a.timestamp);
                resolve(data);
            };
            request.onerror = (e) => reject(`Read failed: ${e.target.error?.message}`);
        });
    }
}
