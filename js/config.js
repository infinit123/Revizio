export const APP_NAME = 'Finora';
export const DB_NAME = 'finora-db';
export const DB_VERSION = 1;

export const STORES = {
  TRANSACTIONS: 'transactions',
  RECURRING: 'recurring',
  GOALS: 'goals',
  SETTINGS: 'settings'
};

export const SECURITY = {
  INACTIVITY_MS: 5 * 60 * 1000
};

export const FORECASTING = {
  EWMA_ALPHA: 0.35,
  MIN_POINTS: 5
};

export const ANALYTICS = {
  MIN_DAILY_BUDGET: 0
};

export const BACKUP = {
  EXPORT_FILENAME_PREFIX: 'finora-backup',
  EXPORT_VERSION: 1
};

export const UI = {
  HAPTIC_SHORT: [10],
  HAPTIC_MEDIUM: [20, 30],
  HAPTIC_SUCCESS: [15, 40],
  HAPTIC_ERROR: [40, 80]
};

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./sw.js')
      .catch(() => {
        // silent failure; app remains functional online
      });
  }
}

