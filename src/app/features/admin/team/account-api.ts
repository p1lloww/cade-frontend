import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { Role } from '../../../core/auth/role';
import { Account } from './account';

/** Contas e perfis, só para o administrador (RF03). */
@Injectable({ providedIn: 'root' })
export class AccountApi {
  private readonly api = inject(ApiClient);

  /** Contas ordenadas por e-mail; `email` traz as que contêm o trecho. */
  search(filters: { role?: Role; email?: string }, size = 50): Observable<Account[]> {
    const params: Record<string, string | number> = { size };
    if (filters.role) {
      params['role'] = filters.role;
    }
    if (filters.email) {
      params['email'] = filters.email;
    }
    return this.api
      .get<{ content: Account[] }>('/users', params)
      .pipe(map(({ content }) => content));
  }

  /** `STAFF` dá o perfil de funcionário; `STUDENT` retira. O motivo vai para o histórico. */
  changeRole(id: string, role: 'STAFF' | 'STUDENT', reason: string): Observable<Account> {
    return this.api.put<Account>(`/users/${id}/role`, { role, reason });
  }
}
