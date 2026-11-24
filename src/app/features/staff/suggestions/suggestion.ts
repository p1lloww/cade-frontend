import { RiskLevel } from '../../../shared/categories/category';

export type CompatibilityBand = 'HIGH' | 'MEDIUM' | 'LOW';

export type SuggestionStatus =
  'NEW' | 'ON_HOLD' | 'SUMMONED' | 'COMPLETED' | 'DISCARDED' | 'REFUSED' | 'EXPIRED' | 'CLOSED';

/** Sugestão do cruzamento com o objeto e a perda lado a lado (RF22, RF23). Só funcionários recebem (RN03). */
export interface Suggestion {
  id: string;
  /** Compatibilidade de 0 a 100 (RN07). */
  score: number;
  band: CompatibilityBand;
  bandLabel: string;
  status: SuggestionStatus;
  statusLabel: string;
  createdAt: string;
  foundItem: {
    id: string;
    categoryName: string;
    foundOn: string;
    block: string;
    room: string;
    storageBox: string;
    risk: RiskLevel;
    riskLabel: string;
    statusLabel: string;
    internalDescription: string | null;
    reservedDetails: string | null;
    photoPath: string;
  };
  lossReport: {
    id: string;
    categoryName: string;
    lostFrom: string;
    lostUntil: string | null;
    /** Nome do turno; nulo quando o estudante não lembra. */
    shift: string | null;
    locations: { block: string; room: string | null }[];
    description: string;
    secretDetail: string | null;
    statusLabel: string;
    registeredAt: string;
    proofSerialNumber: string | null;
    proofPath: string | null;
  };
}

/** Convocação criada (POST /suggestions/{id}/summon), com o que o estudante recebe (RF26). */
export interface IssuedSummons {
  id: string;
  expiresAt: string;
  place: string;
  hours: string;
  whatToBring: string;
}

/** Classe do selo de cada faixa; o nome da faixa sempre vai escrito (RNF10). */
export const BAND_TAG: Readonly<Record<CompatibilityBand, string>> = {
  HIGH: 'tag--success',
  MEDIUM: 'tag--warning',
  LOW: 'tag--neutral',
};
