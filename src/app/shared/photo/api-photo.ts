import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { ApiClient } from '../../core/api/api-client';

/**
 * Foto protegida da API (objeto achado, prova do estudante). Nunca vai por `<img src>` com o endereço da API: é
 * baixada com o token e exibida como blob (D09), e o endereço local é liberado ao trocar de foto ou sair da tela.
 */
@Component({
  selector: 'app-api-photo',
  template: `
    @if (url(); as src) {
      <img [src]="src" [alt]="alt()" />
    } @else {
      <span
        class="placeholder"
        role="img"
        [attr.aria-label]="failed() ? 'Foto indisponível' : 'Carregando a foto'"
      >
        {{ failed() ? 'Sem foto' : '' }}
      </span>
    }
  `,
  styles: `
    :host {
      display: block;
      overflow: hidden;
      border-radius: var(--radius);
      background: var(--color-surface-soft);
    }

    img,
    .placeholder {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-muted);
      font-size: 0.875rem;
    }
  `,
})
export class ApiPhoto {
  private readonly api = inject(ApiClient);

  /** Caminho da foto na API, como vem nos campos `photoPath` e `proofPath`. */
  readonly path = input.required<string>();
  readonly alt = input.required<string>();

  protected readonly url = signal<string | null>(null);
  protected readonly failed = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.release());
    effect((onCleanup) => {
      const subscription = this.api.getBlob(this.path()).subscribe({
        next: (blob) => {
          this.release();
          this.url.set(URL.createObjectURL(blob));
        },
        error: () => this.failed.set(true),
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  private release(): void {
    const url = this.url();
    if (url) {
      URL.revokeObjectURL(url);
      this.url.set(null);
    }
  }
}
