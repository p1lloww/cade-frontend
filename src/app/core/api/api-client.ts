import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { ApiError } from './api-error';
import { apiUrl } from './api-url';

type QueryParams = Record<
  string,
  string | number | boolean | readonly (string | number | boolean)[]
>;

/**
 * Porta de entrada para a API do back-end. Monta o endereço a partir do environment e transforma toda falha num
 * {@link ApiError}, para as telas tratarem os erros sempre do mesmo jeito.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);

  get<T>(path: string, params?: QueryParams): Observable<T> {
    return this.handle(this.http.get<T>(apiUrl(path), { params: toParams(params) }));
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.handle(this.http.post<T>(apiUrl(path), body ?? null));
  }

  put<T>(path: string, body?: unknown): Observable<T> {
    return this.handle(this.http.put<T>(apiUrl(path), body ?? null));
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.handle(this.http.patch<T>(apiUrl(path), body ?? null));
  }

  delete<T>(path: string): Observable<T> {
    return this.handle(this.http.delete<T>(apiUrl(path)));
  }

  /**
   * Baixa um arquivo com o token, por exemplo a foto de um objeto (D09): nunca use `<img src>` com o endereço da
   * API. Exiba com `URL.createObjectURL` e libere com `URL.revokeObjectURL` ao sair da tela.
   */
  getBlob(path: string): Observable<Blob> {
    return this.handle(this.http.get(apiUrl(path), { responseType: 'blob' }));
  }

  private handle<T>(request: Observable<T>): Observable<T> {
    return request.pipe(catchError((error: unknown) => throwError(() => ApiError.from(error))));
  }
}

function toParams(params?: QueryParams): HttpParams | undefined {
  return params ? new HttpParams({ fromObject: params }) : undefined;
}
