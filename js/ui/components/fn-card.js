export class FnCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  static get observedAttributes() {
    return ['title', 'subtitle'];
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const title = this.getAttribute('title');
    const subtitle = this.getAttribute('subtitle');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          margin-bottom: 16px;
        }

        .card {
          background: var(--fn-bg-surface, #FFFFFF);
          border-radius: var(--fn-radius-l, 16px);
          padding: 18px;
          border: 1px solid var(--fn-border-color, rgba(60,60,67,0.12));
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: ${title || subtitle ? '12px' : '0'};
        }

        .title {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.2px;
          color: var(--fn-text-secondary, #8E8E93);
        }

        .subtitle {
          font-size: 12px;
          color: var(--fn-text-tertiary, #C7C7CC);
        }
      </style>
      <div class="card">
        ${title || subtitle ? `
          <div class="header">
            ${title ? `<div class="title">${title}</div>` : ''}
            ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
          </div>
        ` : ''}
        <div class="content">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

customElements.define('fn-card', FnCard);
