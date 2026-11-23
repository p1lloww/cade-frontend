import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  template: `
    <footer class="footer">
      <div class="footer__inner">
        <p>
          <span class="footer__brand">Cadê<span class="footer__question">?</span></span>
          · Achados e Perdidos da UCSal
        </p>
        <p>Dúvidas? Pergunte a um funcionário da UCSal.</p>
      </div>
    </footer>
  `,
  styles: `
    .footer {
      border-top: 1px solid var(--color-divider);
      color: var(--color-muted);
      font-size: 0.9375rem;
    }

    .footer__inner {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--space-3);
      max-width: var(--page-width);
      margin-inline: auto;
      padding: var(--space-5) var(--space-4) var(--space-6);
    }

    p {
      margin: 0;
    }

    .footer__brand {
      color: var(--color-heading);
      font-weight: 800;
      letter-spacing: -0.03em;
    }

    .footer__question {
      color: var(--color-orange);
    }
  `,
})
export class Footer {}
