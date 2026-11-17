import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetail } from './problem-detail';

export const OFFLINE_MESSAGE =
  'Não foi possível falar com o servidor. Confira a sua conexão e tente de novo.';
export const UNAVAILABLE_MESSAGE =
  'O sistema está fora do ar no momento. Tente de novo em instantes.';
export const UNEXPECTED_MESSAGE = 'Algo deu errado. Tente de novo em instantes.';

/**
 * Erro de uma chamada à API, pronto para mostrar na tela. A mensagem vem do back-end sempre que ele manda uma
 * (toda regra fica lá); as mensagens daqui só cobrem o que o back-end não consegue responder.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    /** Status HTTP; 0 quando a requisição nem chegou ao servidor e -1 quando a falha não foi de HTTP. */
    readonly status: number,
    /** Mensagem de cada campo inválido, pelo nome do campo no JSON enviado. */
    readonly fieldErrors: Readonly<Record<string, string>> = {},
    /** Segundos de espera pedidos pelo back-end no header Retry-After (ex.: novo código de login). */
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }
    if (!(error instanceof HttpErrorResponse)) {
      return new ApiError(UNEXPECTED_MESSAGE, -1);
    }
    if (error.status === 0) {
      return new ApiError(OFFLINE_MESSAGE, 0);
    }
    const problem = asProblemDetail(error.error);
    const retryAfter = Number.parseInt(error.headers?.get('Retry-After') ?? '', 10);
    return new ApiError(
      problem?.detail ?? fallbackMessage(error.status),
      error.status,
      problem?.errors ?? {},
      Number.isNaN(retryAfter) ? null : retryAfter,
    );
  }
}

/** Um corpo que não é problem detail (ex.: página de erro do ngrok com o back-end desligado) é ignorado. */
function asProblemDetail(body: unknown): ProblemDetail | null {
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  if (body === null || typeof body !== 'object') {
    return null;
  }
  const problem = body as ProblemDetail;
  return typeof problem.detail === 'string' ? problem : null;
}

function fallbackMessage(status: number): string {
  return status >= 500 || status === 404 ? UNAVAILABLE_MESSAGE : UNEXPECTED_MESSAGE;
}
