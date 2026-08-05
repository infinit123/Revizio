// storage/schema.js
export function defineSchema(db) {
  // Etapa 1: doar store-uri de infrastructură, fără modele financiare
  if (!db.objectStoreNames.contains("meta")) {
    const meta = db.createObjectStore("meta", { keyPath: "key" });
    meta.createIndex("key", "key", { unique: true });
  }

  if (!db.objectStoreNames.contains("settings")) {
    const settings = db.createObjectStore("settings", { keyPath: "id" });
    settings.createIndex("id", "id", { unique: true });
  }
}

