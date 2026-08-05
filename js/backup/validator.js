export async function computeSha256Hex(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export function validateBackupStructure(obj) {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Backup invalid: structură JSON invalidă.');
  }
  if (!Array.isArray(obj.transactions)) {
    throw new Error('Backup invalid: câmpul transactions lipsește sau nu este listă.');
  }
  if (!Array.isArray(obj.recurring)) {
    throw new Error('Backup invalid: câmpul recurring lipsește sau nu este listă.');
  }
  if (!Array.isArray(obj.goals)) {
    throw new Error('Backup invalid: câmpul goals lipsește sau nu este listă.');
  }
  if (!Array.isArray(obj.settings)) {
    throw new Error('Backup invalid: câmpul settings lipsește sau nu este listă.');
  }
  if (typeof obj.meta !== 'object' || !obj.meta) {
    throw new Error('Backup invalid: câmpul meta lipsește.');
  }
  if (typeof obj.meta.hash !== 'string' || !obj.meta.hash) {
    throw new Error('Backup invalid: hash lipsă.');
  }
  if (typeof obj.meta.version !== 'number') {
    throw new Error('Backup invalid: versiune lipsă.');
  }
}

