/** Risco do objeto (RN09), que define o que é conferido no balcão. */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'DOCUMENT';

export const RISK_LABELS: Readonly<Record<RiskLevel, string>> = {
  LOW: 'Baixo',
  MEDIUM: 'Médio',
  HIGH: 'Alto',
  DOCUMENT: 'Documento',
};

/**
 * A escala do risco, do menor para o maior: o risco de um objeto só sobe em relação ao da categoria (RN04).
 * Documento fica fora dela: é entregue só ao titular, nunca muda e nenhum outro objeto vira documento.
 */
export const RISK_LEVELS: readonly RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH'];

/** Os riscos que um objeto pode ter, dado o risco padrão da categoria (inclui o próprio padrão). */
export function allowedRisks(defaultRisk: RiskLevel): RiskLevel[] {
  return defaultRisk === 'DOCUMENT'
    ? ['DOCUMENT']
    : RISK_LEVELS.slice(RISK_LEVELS.indexOf(defaultRisk));
}

/** Categoria de objeto (GET /categories). */
export interface Category {
  id: string;
  name: string;
  defaultRisk: RiskLevel;
  defaultRiskLabel: string;
  /** Perguntas de conferência, na ordem em que o funcionário as faz no balcão (RF44). */
  verificationQuestions?: string[];
}
