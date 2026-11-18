import { HttpInterceptorFn } from '@angular/common/http';
import { isApiUrl } from './api-url';

export const NGROK_HEADER = 'ngrok-skip-browser-warning';

/**
 * Sem este header, o túnel do ngrok responde com uma página de aviso no lugar da API (D08, D09). Vai só nas
 * chamadas à API; em desenvolvimento é inofensivo.
 */
export const ngrokInterceptor: HttpInterceptorFn = (request, next) =>
  isApiUrl(request.url)
    ? next(request.clone({ setHeaders: { [NGROK_HEADER]: 'true' } }))
    : next(request);
