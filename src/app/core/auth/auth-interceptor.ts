import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { isApiUrl } from '../api/api-url';
import { Session } from './session';

/**
 * Envia o token de acesso no header Authorization das chamadas à API (D02, D09). Se o back-end recusar o token
 * (401: vencido ou inválido), a sessão acaba e a pessoa volta ao login.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(Session);
  const token = isApiUrl(request.url) ? session.token() : null;
  if (!token) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        session.expire();
      }
      return throwError(() => error);
    }),
  );
};
