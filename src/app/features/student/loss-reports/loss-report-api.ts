import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { LossReport, LossReportRequest, StudentSummons } from './loss-report';

/** Chamadas da API para os registros de perda do estudante. */
@Injectable({ providedIn: 'root' })
export class LossReportApi {
  private readonly api = inject(ApiClient);

  /** Registros do estudante logado, do mais recente para o mais antigo (RF16). */
  mine(): Observable<LossReport[]> {
    return this.api.get<LossReport[]>('/loss-reports/mine');
  }

  /** Convocações ativas do estudante logado, para saber onde e até quando retirar. */
  mySummons(): Observable<StudentSummons[]> {
    return this.api.get<StudentSummons[]>('/summons/mine');
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
