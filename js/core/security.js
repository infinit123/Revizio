import { CONFIG } from '../config.js';
import { Haptics } from '../utils/haptics.js';

export class SecurityController {
  constructor() {
    this.overlay = document.getElementById('security-overlay');
    this.unlockBtn = document.getElementById('btn-unlock');
    this.isLocked = false;
    this.idleTimer = null;

    this.initListeners();
  }

  initListeners() {
    if (this.unlockBtn) {
      this.unlockBtn.addEventListener('click', () => this.authenticate());
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.lock();
      }
    });

    ['touchstart', 'mousedown', 'keydown'].forEach((evt) => {
      window.addEventListener(evt, () => this.resetIdleTimer(), { passive: true });
    });

    this.resetIdleTimer();
  }

  resetIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.lock(), CONFIG.AUTO_LOCK_IDLE_TIMEOUT_MS);
  }

  lock() {
    this.isLocked = true;
    if (this.overlay) {
      this.overlay.classList.remove('hidden');
      this.overlay.setAttribute('aria-hidden', 'false');
    }
  }

  async authenticate() {
    Haptics.success();
    this.isLocked = false;
    if (this.overlay) {
      this.overlay.classList.add('hidden');
      this.overlay.setAttribute('aria-hidden', 'true');
    }
    this.resetIdleTimer();
  }
}
