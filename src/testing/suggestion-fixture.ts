import { Suggestion } from '../app/features/staff/suggestions/suggestion';

/** Sugestão de exemplo para os testes, com o objeto e a perda lado a lado. */
export function suggestionFixture(extra: Partial<Suggestion> = {}): Suggestion {
  return {
    id: 's1',
    score: 90,
    band: 'HIGH',
    bandLabel: 'Alta',
    status: 'NEW',
    statusLabel: 'Nova',
    createdAt: '2026-11-23T12:00:00Z',
    foundItem: {
      id: 'i1',
      categoryName: 'Garrafa',
      foundOn: '2026-11-20',
      block: 'Bloco 300',
      room: 'Sala 310',
      storageBox: 'Caixa Novembro/2026',
      risk: 'LOW',
      riskLabel: 'Baixo',
      statusLabel: 'Disponível',
      internalDescription: 'Garrafa térmica azul',
      reservedDetails: 'Nome gravado na tampa',
      photoPath: '/found-items/i1/photo',
    },
    lossReport: {
      id: 'r1',
      categoryName: 'Garrafa',
      lostFrom: '2026-11-20',
      lostUntil: '2026-11-20',
      shift: 'Noite',
      locations: [{ block: 'Bloco 300', room: 'Sala 310' }],
      description: 'Garrafa térmica azul',
      secretDetail: 'Meu nome gravado na tampa',
      statusLabel: 'Aberto',
      registeredAt: '2026-11-21T12:00:00Z',
      proofSerialNumber: null,
      proofPath: null,
    },
    ...extra,
  };
}
