import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { FoundItem, FoundItemRequest, PlaceOption } from './found-item';

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
    };
    for (const [field, value] of Object.entries(optional)) {
      if (value) {
        body.append(field, value);
      }
    }
    return this.api.post<FoundItem>('/found-items', body);
  }

  /** Caixa do mês sugerida para a data (RF05). */
  suggestStorageBox(date: string): Observable<string> {
    return this.api
      .get<{ storageBox: string }>('/found-items/storage-box-suggestion', { date })
      .pipe(map(({ storageBox }) => storageBox));
  }

  /** Blocos e salas onde já se achou algum objeto, para sugerir no cadastro. */
  places(): Observable<PlaceOption[]> {
    return this.api
      .get<{ places: PlaceOption[] }>('/found-items/search-options')
      .pipe(map(({ places }) => places));
  }

  /** Foto do objeto como blob, pedida com o token (D09). */
  photo(path: string): Observable<Blob> {
    return this.api.getBlob(path);
  }
}
