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
  status: string;
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
