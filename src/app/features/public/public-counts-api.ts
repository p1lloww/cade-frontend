import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';

/** Objetos disponíveis de um mês, por categoria. Só contagens: nada de foto, descrição ou local (RF41, RN03). */
export interface MonthCounts {
  month: string;
  label: string;
  total: number;
  categories: { category: string; count: number }[];
}

@Injectable({ providedIn: 'root' })
export class PublicCountsApi {
  private readonly api = inject(ApiClient);

  /** Do mês mais recente para o mais antigo; rota pública, sem login. */
  byMonth(): Observable<MonthCounts[]> {
    return this.api
      .get<{ months: MonthCounts[] }>('/public/found-item-counts')
      .pipe(map(({ months }) => months));
  }
}
