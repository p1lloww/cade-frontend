import { LossReport } from '../app/features/student/loss-reports/loss-report';

/** Registro de perda de exemplo, como a API devolve ao dono. */
export function lossReportFixture(extra: Partial<LossReport> = {}): LossReport {
  return {
    id: 'r1',
    categoryName: 'Celular',
    description: 'iPhone com capa transparente',
    locationsLabel: 'Bloco 100, Sala 105',
    lostFrom: '2026-11-22',
    lostUntil: '2026-11-22',
    shift: null,
    shiftLabel: 'Turno não informado',
    status: 'OPEN',
    statusLabel: 'Aberto',
    statusDescription: 'Estamos de olho.',
    registeredAt: '2026-11-22T12:00:00Z',
    expiresAt: '2026-12-22T12:00:00Z',
    version: 0,
    infoRequestReason: null,
    infoAnswer: null,
    secretDetail: 'Arranhão na lateral',
    proofPath: null,
    proofSerialNumber: null,
    ...extra,
  };
}
