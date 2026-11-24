import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { IssuedSummons, Suggestion } from './suggestion';

/** Sugestões do cruzamento e as decisões do funcionário sobre elas (RF22 a RF24, RF26). */
@Injectable({ providedIn: 'root' })
export class SuggestionApi {
  private readonly api = inject(ApiClient);

  /** Sugestões de um objeto, da maior compatibilidade para a menor. */
  forFoundItem(foundItemId: string): Observable<Suggestion[]> {
    return this.api.get<Suggestion[]>(`/found-items/${foundItemId}/suggestions`);
  }

  find(id: string): Observable<Suggestion> {
    return this.api.get<Suggestion>(`/suggestions/${id}`);
  }

  /** Convoca o estudante: o objeto fica reservado e ele recebe o e-mail com local, horário e prazo. */
  summon(id: string): Observable<IssuedSummons> {
    return this.api.post<IssuedSummons>(`/suggestions/${id}/summon`);
  }

  requestInfo(id: string, reason: string): Observable<Suggestion> {
    return this.api.post<Suggestion>(`/suggestions/${id}/info-request`, { reason });
  }

  discard(id: string, reason: string): Observable<Suggestion> {
    return this.api.post<Suggestion>(`/suggestions/${id}/discard`, { reason });
  }
}
