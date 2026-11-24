import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
import { Category } from './category';

/** Categorias, usadas no registro de perda (estudante) e no cadastro de objeto (funcionário). */
@Injectable({ providedIn: 'root' })
export class CategoryApi {
  private readonly api = inject(ApiClient);

  /** Em ordem alfabética, com o risco padrão de cada uma. */
  list(): Observable<Category[]> {
    return this.api.get<Category[]>('/categories');
  }
}
