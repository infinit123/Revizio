import { Haptics } from '../../utils/haptics.js';

export class FnSheet extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupEvents();
  }

  static get observedAttributes() {
    return ['open', 'title'];
  }

  attributeChangedCallback(name) {
    if (name === 'open') {
      const isOpen = this.hasAttribute('open');
      if (isOpen) {
        Haptics.selection();
      }
      this.updateState();
    } else {
      this.render();
    }
  }

  setupEvents() {
    const backdrop = this.shadowRoot.querySelector('.backdrop');
    const closeBtn = this.shadowRoot.querySelector('.close-btn');

    if (backdrop) {
      backdrop.addEventListener('click', () => this.close());
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
  }

  close() {
    this.removeAttribute('open');
    this.dispatchEvent(new CustomEvent('fn-sheet-closed', { bubbles: true, composed: true }));
  }

  updateState() {
    const sheetEl = this.shadowRoot.querySelector('.sheet-container');
    if (!sheetEl) return;
    if (this.hasAttribute('open')) {
      sheetEl.classList.add('open');
    } else {
      sheetEl.classList.remove('open');
    }
  }

  render() {
    const title = this.getAttribute('title') || '';
    const isOpen = this.hasAttribute('open');

    this.shadowRoot.innerHTML = `
      <style>
        .sheet-container {
          position: fixed;
          inset: 0;
          z-index: 9000;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .sheet-container.open {
          opacity: 1;
          pointer-events: auto;
        }

        .backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }

        .sheet {
          position: relative;
          background: var(--fn-bg-surface, #FFFFFF);
          border-radius: var(--fn-radius-xl, 28px) var(--fn-radius-xl, 28px) 0 0;
          padding: 12px 20px calc(var(--fn-safe-area-bottom, 20px) + 20px) 20px;
          max-height: 85vh;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          transform: translateY(100%);
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.175);
          box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.15);
        }

        .sheet-container.open .sheet {
          transform: translateY(0);
        }

        .handle-bar {
          width: 36px;
          height: 5px;
          background-color: var(--fn-bg-surface-secondary, #E5E5EA);
          border-radius: 3px;
          margin: 0 auto 16px auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .title {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.4px;
        }

        .close-btn {
          background: var(--fn-bg-surface-secondary, #E5E5EA);
          border: none;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          font-size: 16px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--fn-text-secondary, #8E8E93);
          cursor: pointer;
        }
      </style>
      <div class="sheet-container ${isOpen ? 'open' : ''}">
        <div class="backdrop"></div>
        <div class="sheet">
          <div class="handle-bar"></div>
          ${title ? `
            <div class="header">
              <div class="title">${title}</div>
              <button class="close-btn" aria-label="Close">✕</button>
            </div>
          ` : ''}
          <div class="body">
            <slot></slot>
          </div>
        </div>
      </div>
    `;
    this.setupEvents();
  }
}

customElements.define('fn-sheet', FnSheet);
