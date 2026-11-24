import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { Category, RiskLevel } from '../../../shared/categories/category';

export interface CategoryRequest {
  name: string;
  defaultRisk: RiskLevel;
  verificationQuestions: string[];
}

/** Categorias, só o administrador (RF44). Não há exclusão: objetos e perdas já apontam para elas. */
@Injectable({ providedIn: 'root' })
export class CategoryAdminApi {
  private readonly api = inject(ApiClient);

  create(request: CategoryRequest): Observable<Category> {
    return this.api.post<Category>('/categories', request);
  }

  update(id: string, request: CategoryRequest): Observable<Category> {
    return this.api.put<Category>(`/categories/${id}`, request);
  }
}
