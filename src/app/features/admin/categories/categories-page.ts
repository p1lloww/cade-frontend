import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, Observable } from 'rxjs';
import { ApiError } from '../../../core/api/api-error';
import { Category } from '../../../shared/categories/category';
import { CategoryApi } from '../../../shared/categories/category-api';
import { ErrorMessage } from '../../../shared/error-message/error-message';
import { CategoryAdminApi, CategoryRequest } from './category-admin-api';
import { CategoryForm } from './category-form';

const RISK_TAG: Readonly<Record<string, string>> = {
  LOW: 'tag--success',
  MEDIUM: 'tag--warning',
  HIGH: 'tag--highlight',
  DOCUMENT: 'tag--info',
};

/**
 * Categorias (RF44): nome, risco padrão e perguntas de conferência. O risco novo vale para os próximos objetos; os
 * que já estão na sala guardam o que tinham (RN04). Não há exclusão.
 */
@Component({
  selector: 'app-categories-page',
  host: { class: 'page' },
  imports: [RouterLink, ErrorMessage, CategoryForm],
  template: `
    <a class="back" routerLink="/admin">Voltar à administração</a>
    <div class="top">
      <h1>Categorias</h1>
      @if (editing() !== 'new') {
        <button class="button" type="button" (click)="open('new')">Nova categoria</button>
      }
    </div>
    <p class="lead">
      O risco define o que o funcionário confere no balcão. Mudar o risco vale para os próximos
      objetos.
    </p>

    @if (notice(); as text) {
      <p class="alert alert--success" role="status">{{ text }}</p>
    }

    @if (editing() === 'new') {
      <section aria-label="Nova categoria" class="new">
        <h2>Nova categoria</h2>
        <app-category-form
          prefix="new"
          [saving]="saving()"
          [error]="error()"
          (saved)="create($event)"
          (cancelled)="editing.set(null)"
        />
      </section>
    }

    @switch (state()) {
      @case ('loading') {
        <p class="muted" role="status">Carregando as categorias…</p>
      }
      @case ('error') {
        <app-error-message [error]="loadError()" />
        <button class="button button--secondary" type="button" (click)="load()">
          Tentar de novo
        </button>
      }
      @default {
        <ul class="list">
          @for (category of categories(); track category.id) {
            <li class="category">
              <div class="category__row">
                <span class="category__name">{{ category.name }}</span>
                <span class="tag" [class]="riskTag[category.defaultRisk]"
                  >Risco {{ category.defaultRiskLabel.toLowerCase() }}</span
                >
                <span class="muted category__questions">
                  {{
                    (category.verificationQuestions ?? []).length === 1
                      ? '1 pergunta'
                      : (category.verificationQuestions ?? []).length + ' perguntas'
                  }}
                </span>
                @if (editing() !== category.id) {
                  <button
                    class="button--link category__edit"
                    type="button"
                    (click)="open(category.id)"
                    [attr.aria-label]="'Editar ' + category.name"
                  >
                    Editar
                  </button>
                }
              </div>
              @if (editing() === category.id) {
                <app-category-form
                  [category]="category"
                  [prefix]="'c' + $index"
                  [saving]="saving()"
                  [error]="error()"
                  (saved)="update(category, $event)"
                  (cancelled)="editing.set(null)"
                />
              }
            </li>
          }
        </ul>
      }
    }
  `,
  styles: `
    .back {
      display: inline-flex;
      align-items: center;
      min-height: var(--touch-target);
      font-weight: 600;
    }

    .top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .top h1 {
      margin: 0;
    }

    .lead {
      margin-top: var(--space-3);
    }

    .new {
      margin-bottom: var(--space-5);
    }

    .new h2 {
      font-size: 1.25rem;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .category {
      padding: var(--space-3) var(--space-4);
      border: 1px solid var(--color-divider);
      border-radius: var(--radius-lg);
    }

    .category__row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2) var(--space-3);
    }

    .category__name {
      color: var(--color-heading);
      font-weight: 700;
    }

    .category__questions {
      font-size: 0.875rem;
    }

    .category__edit {
      margin-left: auto;
    }
  `,
})
export default class CategoriesPage {
  private readonly categoryApi = inject(CategoryApi);
  private readonly categoryAdminApi = inject(CategoryAdminApi);

  protected readonly riskTag = RISK_TAG;
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly loadError = signal<ApiError | null>(null);
  protected readonly categories = signal<Category[]>([]);
  /** O que está aberto para editar: o id de uma categoria, ou 'new' para criar. */
  protected readonly editing = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly notice = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.categoryApi.list().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.state.set('ready');
      },
      error: (error: ApiError) => {
        this.loadError.set(error);
        this.state.set('error');
      },
    });
  }

  protected open(target: string): void {
    this.editing.set(target);
    this.error.set(null);
    this.notice.set(null);
  }

  protected create(request: CategoryRequest): void {
    this.save(this.categoryAdminApi.create(request), `Categoria "${request.name}" criada.`);
  }

  protected update(category: Category, request: CategoryRequest): void {
    this.save(
      this.categoryAdminApi.update(category.id, request),
      `Categoria "${request.name}" salva.`,
    );
  }

  private save(request: Observable<Category>, message: string): void {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => {
        this.categories.update((list) =>
          [...list.filter(({ id }) => id !== saved.id), saved].sort((a, b) =>
            a.name.localeCompare(b.name, 'pt-BR'),
          ),
        );
        this.editing.set(null);
        this.notice.set(message);
      },
      error: (error: ApiError) => this.error.set(error),
    });
  }
}
