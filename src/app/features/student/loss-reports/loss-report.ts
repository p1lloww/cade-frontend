export type Shift = 'MORNING' | 'AFTERNOON' | 'EVENING';

export const SHIFT_LABELS: Readonly<Record<Shift, string>> = {
  MORNING: 'Manhã',
  AFTERNOON: 'Tarde',
  EVENING: 'Noite',
};

export interface LossLocation {
  block: string;
  room: string | null;
}

/** Dados do registro de uma perda (parte `report` do POST /loss-reports). */
export interface LossReportRequest {
  categoryId: string;
  description: string;
  secretDetail: string | null;
  locations: LossLocation[];
  /** Data em que perdeu, ou o início do período (AAAA-MM-DD). */
  lostFrom: string;
  /** Fim do período; nulo quando é uma data só. */
  lostUntil: string | null;
  shift: Shift | null;
}

/** Registro de perda como a API devolve ao dono. */
export interface LossReport {
  id: string;
  categoryName: string;
  description: string;
  locationsLabel: string;
  lostFrom: string;
  lostUntil: string | null;
  shift: Shift | null;
  shiftLabel: string;
  status: LossReportStatus;
  statusLabel: string;
  statusDescription: string;
  registeredAt: string;
  expiresAt: string;
  version: number;
  /** O que o funcionário pediu para saber; nulo se nunca houve pedido. */
  infoRequestReason: string | null;
  /** A última resposta do estudante ao pedido; nula se não respondeu. */
  infoAnswer: string | null;
  secretDetail: string | null;
  /** Caminho da foto da prova, para pedir com o token; nulo quando não há (RF15). */
  proofPath: string | null;
  proofSerialNumber: string | null;
}

export type LossReportStatus =
  'OPEN' | 'AWAITING_INFO' | 'SUMMONED' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED' | 'REFUSED';

/** Situações em que o estudante ainda pode cancelar e renovar o registro (RF17, RN14). */
export const EDITABLE_STATUSES: readonly LossReportStatus[] = ['OPEN', 'AWAITING_INFO'];

/** Situações em que o registro ainda conta para o limite de 5 (RN05). */
export const ONGOING_STATUSES: readonly LossReportStatus[] = ['OPEN', 'AWAITING_INFO', 'SUMMONED'];

/** Convocação ativa do estudante (GET /summons/mine): onde, até quando e o que levar. Nada do objeto (RN03). */
export interface StudentSummons {
  id: string;
  lossReportId: string;
  summonedAt: string;
  expiresAt: string;
  place: string;
  hours: string;
  whatToBring: string;
}

/** Retirada registrada no balcão para o estudante (GET /pickups/mine). Nada do objeto (RN03). */
export interface StudentPickup {
  pickupId: string;
  handedOverAt: string;
  /** Se o estudante já confirmou no celular, no lugar da assinatura no papel (RF30). */
  confirmed: boolean;
  confirmedAt: string | null;
}
