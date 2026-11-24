/** Risco do objeto (RN09), que define o que é conferido no balcão. */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export const RISK_LABELS: Readonly<Record<RiskLevel, string>> = {
  LOW: 'Baixo',
  MEDIUM: 'Médio',
  HIGH: 'Alto',
};

/** Do menor para o maior: o risco de um objeto só pode subir em relação ao da categoria (RN04). */
export const RISK_LEVELS: readonly RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH'];

/** Categoria de objeto (GET /categories). */
export interface Category {
  id: string;
  name: string;
  defaultRisk: RiskLevel;
  defaultRiskLabel: string;
}
