/** Categoria de objeto (GET /categories). */
export interface Category {
  id: string;
  name: string;
}

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
  shiftLabel: string;
  status: string;
  statusLabel: string;
  statusDescription: string;
  registeredAt: string;
  expiresAt: string;
  version: number;
}
