import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { ErrorMessage } from '../../shared/error-message/error-message';
import { formatDay } from '../../shared/format/dates';
import { ApiPhoto } from '../../shared/photo/api-photo';
import { FoundItem } from './found-items/found-item';
import { FoundItemApi } from './found-items/found-item-api';

/**
 * Início da área da sala: cadastrar objeto e os últimos objetos disponíveis, cada um levando às suas sugestões.
 * A busca completa, com filtros, é a tela da ACH-05.
 */
@Component({
  selector: 'app-staff-home',
  host: { class: 'page' },
  imports: [RouterLink, ErrorMessage, ApiPhoto],
  template: `
    <div class="top">
      <h1>Área da sala</h1>
      <a class="button button--large" routerLink="/staff/items/new">Cadastrar objeto</a>
    </div>

    <h2>Últimos objetos disponíveis</h2>
    @switch (state()) {
      @case ('loading') {
        <p class="muted" role="status">Carregando os objetos…</p>
      }
      @case ('error') {
        <app-error-message [error]="error()" />
        <button class="button button--secondary" type="button" (click)="load()">
          Tentar de novo
        </button>
      }
      @default {
        @if (items().length === 0) {
          <p class="muted">Nenhum objeto disponível. Cadastre o primeiro.</p>
        } @else {
          <ul class="items">
            @for (item of items(); track item.id) {
              <li>
                <a class="item" [routerLink]="['/staff/items', item.id, 'suggestions']">
                  <app-api-photo
                    class="item__photo"
                    [path]="item.photoPath"
                    [alt]="'Foto: ' + item.categoryName"
                  />
                  <span class="item__text">
                    <span class="item__title">{{
                      item.internalDescription || item.categoryName
                    }}</span>
                    <span class="muted">
                      {{ item.categoryName }} · {{ item.block }}, {{ item.room }} ·
                      {{ formatDay(item.foundOn) }}
                    </span>
                    <span class="item__cta">Ver sugestões</span>
                  </span>
                </a>
              </li>
            }
          </ul>
        }
      }
    }
  `,
  styles: `
    .top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      margin-bottom: var(--space-6);
    }

    .top h1 {
      margin: 0;
    }

    h2 {
      font-size: 1.25rem;
    }

    .items {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .item {
      display: flex;
      gap: var(--space-3);
      align-items: center;
      padding: var(--space-3);
      border: 1px solid var(--color-divider);
      border-radius: var(--radius-lg);
      color: inherit;
      text-decoration: none;
    }

    .item:hover {
      border-color: var(--color-primary);
      color: inherit;
    }

    .item__photo {
      flex-shrink: 0;
      width: 4rem;
      height: 4rem;
    }

    .item__text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      font-size: 0.9375rem;
    }

    .item__title {
      color: var(--color-heading);
      font-size: 1rem;
      font-weight: 700;
      overflow-wrap: anywhere;
    }

    .item__cta {
      color: var(--color-primary);
      font-weight: 700;
    }
  `,
})
export default class StaffHome {
  private readonly foundItemApi = inject(FoundItemApi);

  protected readonly formatDay = formatDay;
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal<ApiError | null>(null);
  protected readonly items = signal<FoundItem[]>([]);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.foundItemApi.recentAvailable().subscribe({
      next: (items) => {
        this.items.set(items);
        this.state.set('ready');
      },
      error: (error: ApiError) => {
        this.error.set(error);
        this.state.set('error');
      },
    });
  }
}
