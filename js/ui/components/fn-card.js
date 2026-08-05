const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
    }
    .card {
      background-color: var(--color-bg-elevated);
      border-radius: var(--radius-card);
      padding: 12px 14px;
      box-shadow: var(--shadow-soft);
      border: 1px solid var(--color-border-subtle);
    }
    .header {
      margin-bottom: 8px;
    }
    .header ::slotted(h2),
    .header ::slotted(h3) {
      margin: 0;
      font-size: 1rem;
    }
    .body {
      font-size: 0.9rem;
    }
  </style>
  <div class="card">
    <div class="header">
      <slot name="header"></slot>
    </div>
    <div class="body">
      <slot name="body"></slot>
    </div>
  </div>
`;

export class FnCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }
}

customElements.define('fn-card', FnCard);

