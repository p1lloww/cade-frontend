import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { LossReport, LossReportRequest, StudentPickup, StudentSummons } from './loss-report';

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

  /** Retiradas registradas no balcão para o estudante, as mais recentes primeiro. */
  myPickups(): Observable<StudentPickup[]> {
    return this.api.get<StudentPickup[]>('/pickups/mine');
  }

  /** O estudante confirma a retirada no próprio celular (RF30). */
  confirmPickup(pickupId: string): Observable<StudentPickup> {
    return this.api.post<StudentPickup>(`/pickups/${pickupId}/confirmation`);
  }

  cancel(id: string): Observable<LossReport> {
    return this.api.post<LossReport>(`/loss-reports/${id}/cancel`);
  }

  /** Responde ao pedido de mais informações; o registro volta a Aberto (RF18). */
  answer(id: string, answer: string): Observable<LossReport> {
    return this.api.post<LossReport>(`/loss-reports/${id}/info-response`, { answer });
  }

  /** A validade passa a ser 30 dias a partir de agora (RN14). */
  renew(id: string): Observable<LossReport> {
    return this.api.post<LossReport>(`/loss-reports/${id}/renew`);
  }

  /** Anexa ou troca a prova: foto antiga ou nota fiscal e/ou número de série (RF15). O que não vier fica como está. */
  attachProof(
    id: string,
    proof: { photo: Blob | null; serialNumber: string | null },
  ): Observable<LossReport> {
    const body = new FormData();
    if (proof.serialNumber) {
      body.append(
        'proof',
        new Blob([JSON.stringify({ serialNumber: proof.serialNumber })], {
          type: 'application/json',
        }),
      );
    }
    if (proof.photo) {
      body.append('file', proof.photo, 'prova.jpg');
    }
    return this.api.post<LossReport>(`/loss-reports/${id}/proof`, body);
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
