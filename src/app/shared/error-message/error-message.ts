import { Component, computed, input } from '@angular/core';
import { ApiError } from '../../core/api/api-error';

/**
 * Caixa de erro padrão das telas. Recebe um {@link ApiError} ou um texto e é anunciada pelos leitores de tela
 * assim que aparece. Erros de campo ficam ao lado de cada campo, no próprio formulário.
 */
@Component({
  selector: 'app-error-message',
  template: `
    @if (message(); as text) {
      <p class="alert alert--error" role="alert">{{ text }}</p>
    }
  `,
})
export class ErrorMessage {
  readonly error = input<ApiError | string | null | undefined>(null);

  protected readonly message = computed(() => {
    const error = this.error();
    return error instanceof ApiError ? error.message : error || null;
  });
}
