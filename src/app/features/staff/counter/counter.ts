import { RiskLevel } from '../../../shared/categories/category';

export type IdDocumentType = 'RG' | 'CNH' | 'STUDENT_CARD' | 'PASSPORT' | 'OTHER';

export const DOCUMENT_TYPES: readonly { code: IdDocumentType; label: string }[] = [
  { code: 'STUDENT_CARD', label: 'Carteirinha da UCSal' },
  { code: 'RG', label: 'RG' },
  { code: 'CNH', label: 'CNH' },
  { code: 'PASSPORT', label: 'Passaporte' },
  { code: 'OTHER', label: 'Outro com foto' },
];

export type HolderType = 'STUDENT' | 'VISITOR';

export interface VerificationOption {
  code: string;
  label: string;
}

/** Convocação como o funcionário a vê no balcão, com o que conferir pelo risco (RF28, RN09). */
export interface CounterSummons {
  id: string;
  suggestionId: string;
  foundItemId: string;
  lossReportId: string;
  status: string;
  statusLabel: string;
  risk: RiskLevel;
  riskLabel: string;
  summonedAt: string;
  expiresAt: string;
  /** Na ordem: sempre o documento com foto e a matrícula primeiro (RN10). */
  checklist: string[];
  /** As verificações que bastam para entregar; o funcionário registra uma delas. */
  acceptedVerifications: VerificationOption[];
}

/** O que o funcionário conferiu antes de entregar (RF29). */
export interface CounterCheck {
  documentType: IdDocumentType;
  documentNumber: string;
  enrollment: string | null;
  verification: string;
  notes: string | null;
}

export interface Refusal {
  /** Recusas do estudante, contando esta (RN12). */
  studentRefusals: number;
  /** Com 3 recusas, o estudante não abre novos registros até o administrador liberar. */
  studentBlocked: boolean;
}

/** O que conferir para entregar sem registro de perda (RF32). */
export interface WalkInCheck {
  foundItemId: string;
  statusLabel: string;
  /** Só Disponível ou Não reclamado saem pelo atalho; Reservado está prometido a um convocado (RN18). */
  canHandOver: boolean;
  risk: RiskLevel;
  riskLabel: string;
  checklist: string[];
  acceptedVerifications: VerificationOption[];
}

export interface WalkInPickupRequest extends CounterCheck {
  foundItemId: string;
  holderType: HolderType;
  holderName: string;
}
