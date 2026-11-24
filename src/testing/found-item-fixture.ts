import { FoundItem } from '../app/features/staff/found-items/found-item';

/** Objeto achado de exemplo, como a API devolve ao funcionário. */
export function foundItemFixture(id = 'i1', extra: Partial<FoundItem> = {}): FoundItem {
  return {
    id,
    categoryId: 'c-fone',
    categoryName: 'Fone',
    block: 'Bloco 400',
    room: 'Sala 421',
    foundOn: '2026-11-20',
    storageBox: 'Caixa Novembro/2026',
    risk: 'MEDIUM',
    riskLabel: 'Médio',
    status: 'AVAILABLE',
    statusLabel: 'Disponível',
    internalDescription: `Fone ${id}`,
    reservedDetails: null,
    photoPath: `/found-items/${id}/photo`,
    registeredAt: '2026-11-20T12:00:00Z',
    broughtBy: null,
    identified: false,
    identifiedName: null,
    identifiedEmail: null,
    identifiedDocument: null,
    version: 0,
    ...extra,
  };
}
