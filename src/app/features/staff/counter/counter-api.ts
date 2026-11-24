import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { CounterCheck, CounterSummons, Refusal, WalkInCheck, WalkInPickupRequest } from './counter';

/** Balcão: convocações ativas, retirada, recusa e atalho sem registro de perda (RF28, RF29, RF31, RF32). */
@Injectable({ providedIn: 'root' })
export class CounterApi {
  private readonly api = inject(ApiClient);

  /** Convocações ativas, as que vencem primeiro no topo. */
  active(): Observable<CounterSummons[]> {
    return this.api.get<CounterSummons[]>('/summons');
  }

  find(id: string): Observable<CounterSummons> {
    return this.api.get<CounterSummons>(`/summons/${id}`);
  }

  registerPickup(id: string, check: CounterCheck): Observable<unknown> {
    return this.api.post(`/summons/${id}/pickup`, check);
  }

  refuse(id: string, reason: string): Observable<Refusal> {
    return this.api.post<Refusal>(`/summons/${id}/refusal`, { reason });
  }

  walkInCheck(foundItemId: string): Observable<WalkInCheck> {
    return this.api.get<WalkInCheck>(`/found-items/${foundItemId}/walk-in-check`);
  }

  registerWalkIn(request: WalkInPickupRequest): Observable<unknown> {
    return this.api.post('/walk-in-pickups', request);
  }
}
