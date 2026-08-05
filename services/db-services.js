// services/db-service.js
import { IdbWrapper } from "../utils/idb-wrapper.js";
import { defineSchema } from "../storage/schema.js";

export class DbService {
  constructor() {
    this.idb = new IdbWrapper("revizio-premium", 1);
  }

  async init() {
    await this.idb.open(defineSchema);
  }

  async getSetting(id) {
    const store = this.idb.tx("settings");
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async setSetting(setting) {
    const store = this.idb.tx("settings", "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.put(setting);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }
}

