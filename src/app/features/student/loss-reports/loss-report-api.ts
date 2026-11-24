import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { Category, LossReport, LossReportRequest } from './loss-report';

/** Chamadas da API para os registros de perda do estudante. */
@Injectable({ providedIn: 'root' })
export class LossReportApi {
  private readonly api = inject(ApiClient);

  categories(): Observable<Category[]> {
    return this.api.get<Category[]>('/categories');
  }

  /**
   * Registra uma perda (RF13). A API espera multipart, com os dados na parte `report` em JSON; a foto do objeto é
   * opcional e fica para depois.
   */
  register(report: LossReportRequest): Observable<LossReport> {
    const body = new FormData();
    body.append('report', new Blob([JSON.stringify(report)], { type: 'application/json' }));
    return this.api.post<LossReport>('/loss-reports', body);
  }
}
