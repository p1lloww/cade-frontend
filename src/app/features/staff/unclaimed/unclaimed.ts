/** Os não reclamados de uma caixa de mês, para retirar da sala de uma vez (RF39). */
export interface UnclaimedBox {
  storageBox: string;
  items: UnclaimedItem[];
}

export interface UnclaimedItem {
  id: string;
  categoryName: string;
  block: string;
  room: string;
  foundOn: string;
  internalDescription: string | null;
  /** Quando o objeto entrou na sala; daí contam os 90 dias (RN16). */
  registeredAt: string;
}

export type DisposalDestination = 'BAZAAR' | 'DISCARD' | 'OTHER';

export const DESTINATIONS: readonly { code: DisposalDestination; label: string }[] = [
  { code: 'BAZAAR', label: 'Bazar' },
  { code: 'DISCARD', label: 'Descarte' },
  { code: 'OTHER', label: 'Outro' },
];
