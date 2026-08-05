import { Haptics } from '../utils/haptics.js';

export class SecurityController {
  constructor() {
    this.overlay = document.getElementById('security-overlay');
    this.unlockBtn = document.getElementById('btn-unlock');
    this.isLocked = false;
    
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
  }

  lock() {
    this.isLocked = true;
    if (this.overlay) {
      this.overlay.classList.remove('hidden');
    }
  }

  async authenticate() {
    if (window.PublicKeyCredential) {
      try {
        Haptics.success();
        this.isLocked = false;
        if (this.overlay) this.overlay.classList.add('hidden');
      } catch (e) {
        Haptics.error();
      }
    } else {
      this.isLocked = false;
      if (this.overlay) this.overlay.classList.add('hidden');
    }
  }
}
