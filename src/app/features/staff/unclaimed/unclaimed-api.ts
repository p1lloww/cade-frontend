import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { DisposalDestination, UnclaimedBox } from './unclaimed';

/** Não reclamados (RF38, RF39). */
@Injectable({ providedIn: 'root' })
export class UnclaimedApi {
  private readonly api = inject(ApiClient);

  /** Agrupados por caixa de mês; funcionário e administrador. */
  byBox(): Observable<UnclaimedBox[]> {
    return this.api.get<UnclaimedBox[]>('/unclaimed-items');
  }

  /** Destino do objeto, só o administrador: bazar (padrão), descarte ou outro, com observação. */
  dispose(id: string, destination: DisposalDestination, note: string | null): Observable<unknown> {
    return this.api.post(`/unclaimed-items/${id}/disposal`, { destination, note });
  }
}
