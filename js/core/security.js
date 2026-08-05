import { SECURITY } from '../config.js';

let inactivityTimer = null;
let lockCallback = null;
let unlockCallback = null;
let locked = false;

export function securityInit(onLock, onUnlock) {
  lockCallback = onLock;
  unlockCallback = onUnlock;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      triggerLock();
    }
  });

  securityRegisterActivity();
}

export function securityRegisterActivity() {
  if (locked) return;
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }
  inactivityTimer = setTimeout(() => {
    triggerLock();
  }, SECURITY.INACTIVITY_MS);
}

function triggerLock() {
  if (locked) return;
  locked = true;
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
  if (typeof lockCallback === 'function') {
    lockCallback();
  }
  const unlockBtn = document.getElementById('security-unlock-btn');
  if (unlockBtn) {
    unlockBtn.addEventListener(
      'click',
      () => {
        triggerUnlock();
      },
      { once: true }
    );
  }
}

function triggerUnlock() {
  if (!locked) return;
  locked = false;
  if (typeof unlockCallback === 'function') {
    unlockCallback();
  }
  securityRegisterActivity();
}

