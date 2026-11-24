import { RiskLevel } from '../../../shared/categories/category';

/** Dados do cadastro de um objeto (POST /found-items, multipart). */
export interface FoundItemRequest {
  photo: Blob;
  categoryId: string;
  block: string;
  room: string;
  /** AAAA-MM-DD */
  foundOn: string;
  /** Vazio: a caixa do mês da data (RF05). */
  storageBox: string | null;
  /** Vazio: o risco padrão da categoria (RN04). */
  risk: RiskLevel | null;
  internalDescription: string | null;
  reservedDetails: string | null;
}

/** Objeto achado, com tudo o que o funcionário pode ver (RN03). */
export interface FoundItem {
  id: string;
  categoryName: string;
  block: string;
  room: string;
  foundOn: string;
  storageBox: string;
  risk: RiskLevel;
  riskLabel: string;
  status: FoundItemStatus;
  statusLabel: string;
  internalDescription: string | null;
  reservedDetails: string | null;
  photoPath: string;
  registeredAt: string;
  version: number;
}

/** Um bloco e as salas dele onde já se achou algum objeto (GET /found-items/search-options). */
export interface PlaceOption {
  block: string;
  rooms: string[];
}

export type FoundItemStatus = 'AVAILABLE' | 'RESERVED' | 'RETURNED' | 'UNCLAIMED' | 'DISPOSED';

/** Classe do selo de cada situação; o nome da situação sempre vai escrito (RNF10). */
export const STATUS_TAG: Readonly<Record<FoundItemStatus, string>> = {
  AVAILABLE: 'tag--info',
  RESERVED: 'tag--highlight',
  RETURNED: 'tag--success',
  UNCLAIMED: 'tag--warning',
  DISPOSED: 'tag--neutral',
};

/** Filtros da busca (GET /found-items); todos opcionais e combinados. */
export interface FoundItemFilters {
  q?: string;
  categoryId?: string;
  /** AAAA-MM */
  month?: string;
  block?: string;
  room?: string;
  status?: FoundItemStatus[];
}

/** Valores para os filtros: só o que tem algum objeto (GET /found-items/search-options). */
export interface SearchOptions {
  categories: { id: string; name: string }[];
  places: PlaceOption[];
  months: string[];
  statuses: { code: FoundItemStatus; label: string }[];
}

export interface FoundItemPage {
  content: FoundItem[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}
