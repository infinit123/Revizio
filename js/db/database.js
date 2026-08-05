import { DB_NAME, DB_VERSION, STORES } from '../config.js';

let dbPromise = null;

export function dbInit() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
        const store = db.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'id' });
        store.createIndex('byDate', 'date', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.RECURRING)) {
        db.createObjectStore(STORES.RECURRING, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.GOALS)) {
        db.createObjectStore(STORES.GOALS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
      };
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
  return dbPromise;
}

async function withStore(storeName, mode, fn) {
  const db = await dbInit();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);

    let completed = false;

    tx.oncomplete = () => {
      if (!completed) {
        completed = true;
        resolve();
      }
    };

    tx.onerror = () => {
      if (!completed) {
        completed = true;
        reject(tx.error);
      }
    };

    tx.onabort = () => {
      if (!completed) {
        completed = true;
        reject(tx.error || new Error('Transaction aborted'));
      }
    };

    Promise.resolve()
      .then(() => fn(store))
      .then(result => {
        if (!completed) {
          completed = true;
          resolve(result);
        }
      })
      .catch(error => {
        if (!completed) {
          completed = true;
          tx.abort();
          reject(error);
        }
      });
  });
}

export function dbGetAll(storeName) {
  return withStore(storeName, 'readonly', store => {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
}

export function dbAdd(storeName, value) {
  return withStore(storeName, 'readwrite', store => {
    return new Promise((resolve, reject) => {
      const request = store.put(value);
      request.onsuccess = () => resolve(value);
      request.onerror = () => reject(request.error);
    });
  });
}

export function dbBulkReplace(data) {
  return dbInit().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        [STORES.TRANSACTIONS, STORES.RECURRING, STORES.GOALS, STORES.SETTINGS],
        'readwrite'
      );

      const transactionsStore = tx.objectStore(STORES.TRANSACTIONS);
      const recurringStore = tx.objectStore(STORES.RECURRING);
      const goalsStore = tx.objectStore(STORES.GOALS);
      const settingsStore = tx.objectStore(STORES.SETTINGS);

      const clearRequest1 = transactionsStore.clear();
      const clearRequest2 = recurringStore.clear();
      const clearRequest3 = goalsStore.clear();
      const clearRequest4 = settingsStore.clear();

      const clearRequests = [clearRequest1, clearRequest2, clearRequest3, clearRequest4];

      clearRequests.forEach(req => {
        req.onerror = () => {
          tx.abort();
        };
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Bulk replace aborted'));

      clearRequest4.onsuccess = () => {
        try {
          (data.transactions || []).forEach(item => transactionsStore.put(item));
          (data.recurring || []).forEach(item => recurringStore.put(item));
          (data.goals || []).forEach(item => goalsStore.put(item));
          (data.settings || []).forEach(item => settingsStore.put(item));
        } catch (error) {
          tx.abort();
        }
      };
    });
  });
}

