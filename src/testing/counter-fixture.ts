import { CounterSummons } from '../app/features/staff/counter/counter';

/** Convocação de exemplo no balcão, de um objeto de risco médio. */
export function counterSummonsFixture(extra: Partial<CounterSummons> = {}): CounterSummons {
  return {
    id: 'c1',
    suggestionId: 's1',
    foundItemId: 'i1',
    lossReportId: 'r1',
    status: 'ACTIVE',
    statusLabel: 'Ativa',
    risk: 'MEDIUM',
    riskLabel: 'Médio',
    summonedAt: '2026-11-23T12:00:00Z',
    expiresAt: '2026-11-30T12:00:00Z',
    checklist: [
      'Documento com foto: a foto confere com quem está retirando, e a matrícula foi anotada.',
      'O estudante descreve um detalhe que não aparece na foto, ou o detalhe reservado do objeto.',
    ],
    acceptedVerifications: [
      {
        code: 'DETAIL_CONFIRMED',
        label: 'Detalhe que não aparece na foto, ou o detalhe reservado',
      },
      { code: 'PROOF_OF_OWNERSHIP', label: 'Prova de que o objeto é dele' },
    ],
    ...extra,
  };
}
