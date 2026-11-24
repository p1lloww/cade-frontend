import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import {
  FoundItem,
  FoundItemFilters,
  FoundItemPage,
  FoundItemRequest,
  FoundItemUpdate,
  Identification,
  PlaceOption,
  SearchOptions,
} from './found-item';

/** Chamadas da API para os objetos achados (só funcionário e administrador). */
@Injectable({ providedIn: 'root' })
export class FoundItemApi {
  private readonly api = inject(ApiClient);

  /** Cadastra um objeto (RF04). Campos opcionais vazios não são enviados, para valerem os padrões do back-end. */
  register(item: FoundItemRequest): Observable<FoundItem> {
    const body = new FormData();
    body.append('photo', item.photo, 'objeto.jpg');
    body.append('categoryId', item.categoryId);
    body.append('block', item.block);
    body.append('room', item.room);
    body.append('foundOn', item.foundOn);
    const optional = {
      storageBox: item.storageBox,
      risk: item.risk,
      internalDescription: item.internalDescription,
      reservedDetails: item.reservedDetails,
      broughtBy: item.broughtBy,
    };
    for (const [field, value] of Object.entries(optional)) {
      if (value) {
        body.append(field, value);
      }
    }
    return this.api.post<FoundItem>('/found-items', body);
  }

  find(id: string): Observable<FoundItem> {
    return this.api.get<FoundItem>(`/found-items/${id}`);
  }

  /** Corrige os dados (RF11): só Disponível ou Não reclamado, e recusa com 409 se a versão estiver velha. */
  update(id: string, update: FoundItemUpdate): Observable<FoundItem> {
    return this.api.put<FoundItem>(`/found-items/${id}`, update);
  }

  /** Quem trouxe o objeto (RF07); vazio apaga. */
  recordBroughtBy(id: string, broughtBy: string | null): Observable<FoundItem> {
    return this.api.put<FoundItem>(`/found-items/${id}/brought-by`, { broughtBy });
  }

  /** Marca o objeto como identificado (RF08); marcar de novo troca o que estava. */
  identify(id: string, identification: Identification): Observable<FoundItem> {
    return this.api.put<FoundItem>(`/found-items/${id}/identification`, identification);
  }

  clearIdentification(id: string): Observable<FoundItem> {
    return this.api.delete<FoundItem>(`/found-items/${id}/identification`);
  }

  /**
   * Busca (RF10). Com texto, os mais relevantes primeiro; sem texto, os achados mais recentemente. Filtros vazios
   * não são enviados.
   */
  search(filters: FoundItemFilters, page = 0, size = 20): Observable<FoundItemPage> {
    const params: Record<string, string | number | string[]> = { page, size };
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value) ? value.length > 0 : value) {
        params[key] = value;
      }
    }
    return this.api.get<FoundItemPage>('/found-items', params);
  }

  searchOptions(): Observable<SearchOptions> {
    return this.api.get<SearchOptions>('/found-items/search-options');
  }

  /** Caixa do mês sugerida para a data (RF05). */
  suggestStorageBox(date: string): Observable<string> {
    return this.api
      .get<{ storageBox: string }>('/found-items/storage-box-suggestion', { date })
      .pipe(map(({ storageBox }) => storageBox));
  }

  /** Blocos e salas onde já se achou algum objeto, para sugerir no cadastro. */
  places(): Observable<PlaceOption[]> {
    return this.searchOptions().pipe(map(({ places }) => places));
  }
}
