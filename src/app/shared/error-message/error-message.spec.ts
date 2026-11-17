import { TestBed } from '@angular/core/testing';
import { ApiError } from '../../core/api/api-error';
import { ErrorMessage } from './error-message';

describe('ErrorMessage', () => {
  function render(error: ApiError | string | null): HTMLElement {
    const fixture = TestBed.createComponent(ErrorMessage);
    fixture.componentRef.setInput('error', error);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('mostra a mensagem do ApiError como alerta', () => {
    const alert = render(new ApiError('Algo deu errado.', 500)).querySelector('[role="alert"]');

    expect(alert?.textContent?.trim()).toBe('Algo deu errado.');
  });

  it('mostra um texto simples', () => {
    expect(render('Sessão expirada.').textContent).toContain('Sessão expirada.');
  });

  it('não mostra nada sem erro', () => {
    expect(render(null).querySelector('[role="alert"]')).toBeNull();
  });
});
