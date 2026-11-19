import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api/api-client';

/** Resposta de `POST /auth/token`. */
export interface TokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  /** Segundos até o token vencer. */
  expiresIn: number;
}

/** Login sem senha (RF01, D02): pede o código pelo e-mail e troca o código pelo token. */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly api = inject(ApiClient);

  /** O back-end responde 202 quando o código foi gerado; o e-mail chega logo depois. */
  requestCode(email: string): Observable<void> {
    return this.api.post<void>('/auth/login-code', { email });
  }

  issueToken(email: string, code: string): Observable<TokenResponse> {
    return this.api.post<TokenResponse>('/auth/token', { email, code });
  }
}
