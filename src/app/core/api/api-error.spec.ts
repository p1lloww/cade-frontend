import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ApiError, OFFLINE_MESSAGE, UNAVAILABLE_MESSAGE, UNEXPECTED_MESSAGE } from './api-error';

function httpError(
  status: number,
  error: unknown,
  headers?: Record<string, string>,
): HttpErrorResponse {
  return new HttpErrorResponse({ status, error, headers: new HttpHeaders(headers) });
}

describe('ApiError', () => {
  it('usa a mensagem do problem detail devolvido pelo back-end', () => {
    const error = ApiError.from(
      httpError(400, { status: 400, detail: 'Use o seu e-mail institucional @ucsal.edu.br.' }),
    );

    expect(error.status).toBe(400);
    expect(error.message).toBe('Use o seu e-mail institucional @ucsal.edu.br.');
  });

  it('traz as mensagens de cada campo inválido', () => {
    const error = ApiError.from(
      httpError(400, {
        detail: 'Confira os campos enviados.',
        errors: { code: 'O código tem 6 dígitos.' },
      }),
    );

    expect(error.fieldErrors).toEqual({ code: 'O código tem 6 dígitos.' });
  });

  it('lê o problem detail que chega como texto', () => {
    const error = ApiError.from(
      httpError(403, '{"detail":"Você não tem permissão para fazer isso."}'),
    );

    expect(error.message).toBe('Você não tem permissão para fazer isso.');
  });

  it('lê os segundos de espera do header Retry-After', () => {
    const error = ApiError.from(httpError(429, { detail: 'Aguarde.' }, { 'Retry-After': '42' }));

    expect(error.retryAfterSeconds).toBe(42);
  });

  it('não inventa espera quando não há Retry-After', () => {
    expect(ApiError.from(httpError(429, { detail: 'Aguarde.' })).retryAfterSeconds).toBeNull();
  });

  it('avisa que o servidor não respondeu quando a requisição não chega', () => {
    const error = ApiError.from(httpError(0, new ProgressEvent('error')));

    expect(error.status).toBe(0);
    expect(error.message).toBe(OFFLINE_MESSAGE);
  });

  it('avisa que o sistema está fora do ar quando a resposta não é um problem detail', () => {
    expect(ApiError.from(httpError(502, '<html>ngrok</html>')).message).toBe(UNAVAILABLE_MESSAGE);
    expect(ApiError.from(httpError(404, null)).message).toBe(UNAVAILABLE_MESSAGE);
  });

  it('usa uma mensagem neutra para falhas que não são de HTTP', () => {
    expect(ApiError.from(new TypeError('boom')).message).toBe(UNEXPECTED_MESSAGE);
  });

  it('devolve o mesmo erro quando ele já foi convertido', () => {
    const error = new ApiError('Mensagem', 409);

    expect(ApiError.from(error)).toBe(error);
  });
});
