import { Haptics } from '../../utils/haptics.js';

export class FnButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupInteractions();
  }

  static get observedAttributes() {
    return ['variant', 'disabled', 'full-width'];
  }

  attributeChangedCallback() {
    this.render();
  }

  setupInteractions() {
    const btn = this.shadowRoot.querySelector('button');
    if (!btn) return;

    btn.addEventListener('touchstart', () => Haptics.selection(), { passive: true });
    btn.addEventListener('click', (e) => {
      if (this.hasAttribute('disabled')) {
        e.stopImmediatePropagation();
      }
    });
  }

  render() {
    const variant = this.getAttribute('variant') || 'primary';
    const isFullWidth = this.hasAttribute('full-width');
    const isDisabled = this.hasAttribute('disabled');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: ${isFullWidth ? 'block' : 'inline-block'};
          width: ${isFullWidth ? '100%' : 'auto'};
        }

        button {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 14px 20px;
          border-radius: var(--fn-radius-m, 12px);
          font-family: inherit;
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -0.4px;
          border: none;
          outline: none;
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.15s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.15s ease, background-color 0.2s ease;
        }

        button:active:not(:disabled) {
          transform: scale(0.96);
          opacity: 0.82;
        }

        button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .variant-primary {
          background-color: var(--fn-color-primary, #007AFF);
          color: #FFFFFF;
        }

        .variant-secondary {
          background-color: var(--fn-bg-surface-secondary, #E5E5EA);
          color: var(--fn-color-primary, #007AFF);
        }

        .variant-plain {
          background-color: transparent;
          color: var(--fn-color-primary, #007AFF);
          padding: 8px 12px;
        }

        .variant-danger {
          background-color: var(--fn-color-danger, #FF3B30);
          color: #FFFFFF;
        }
      </style>
      <button class="variant-${variant}" ${isDisabled ? 'disabled' : ''}>
        <slot></slot>
      </button>
    `;
  }
}

customElements.define('fn-button', FnButton);
