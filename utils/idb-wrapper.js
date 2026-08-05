// utils/idb-wrapper.js
export class IdbWrapper {
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this.db = null;
  }

  open(onUpgrade) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, this.version);

      request.onupgradeneeded = event => {
        const db = event.target.result;
        onUpgrade(db);
      };

      request.onsuccess = event => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  tx(storeName, mode = "readonly") {
    if (!this.db) throw new Error("DB not initialized");
    return this.db.transaction(storeName, mode).objectStore(storeName);
  }
}

