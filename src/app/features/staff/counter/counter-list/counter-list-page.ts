import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/api/api-error';
import { ErrorMessage } from '../../../../shared/error-message/error-message';
import { formatDate } from '../../../../shared/format/dates';
import { ApiPhoto } from '../../../../shared/photo/api-photo';
import { Suggestion } from '../../suggestions/suggestion';
import { SuggestionApi } from '../../suggestions/suggestion-api';
import { CounterSummons } from '../counter';
import { CounterApi } from '../counter-api';

interface Waiting {
  summons: CounterSummons;
  suggestion: Suggestion;
}

/**
 * Balcão: as convocações ativas, as que vencem primeiro no topo, com a foto e a caixa de cada objeto para o
 * funcionário achá-lo rápido. Cada uma abre o atendimento (RF28).
 */
@Component({
  selector: 'app-counter-list-page',
  host: { class: 'page' },
  imports: [RouterLink, ErrorMessage, ApiPhoto],
  template: `
    <a class="back" routerLink="/staff">Voltar à área da sala</a>
    <h1>Balcão</h1>
    <p class="lead">Quem foi convocado e ainda não retirou. Toque no objeto para atender.</p>

    @switch (state()) {
      @case ('loading') {
        <p class="muted" role="status">Carregando as convocações…</p>
      }
      @case ('error') {
        <app-error-message [error]="error()" />
        <button class="button button--secondary" type="button" (click)="load()">
          Tentar de novo
        </button>
      }
      @default {
        @if (waiting().length === 0) {
          <p class="empty">Ninguém esperando para retirar agora.</p>
        } @else {
          <ul class="list">
            @for (entry of waiting(); track entry.summons.id) {
              <li>
                <a class="entry" [routerLink]="['/staff/counter', entry.summons.id]">
                  <app-api-photo
                    class="entry__photo"
                    [path]="entry.suggestion.foundItem.photoPath"
                    [alt]="'Foto: ' + entry.suggestion.foundItem.categoryName"
                  />
                  <span class="entry__text">
                    <span class="entry__title">
                      {{
                        entry.suggestion.foundItem.internalDescription ||
                          entry.suggestion.foundItem.categoryName
                      }}
                    </span>
                    <span class="muted"
                      >{{ entry.suggestion.foundItem.storageBox }} · risco
                      {{ entry.summons.riskLabel.toLowerCase() }}</span
                    >
                    <span class="entry__deadline"
                      >Reservado até {{ formatDate(entry.summons.expiresAt) }}</span
                    >
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
    .back {
      display: inline-flex;
      align-items: center;
      min-height: var(--touch-target);
      font-weight: 600;
    }

    .empty {
      padding: var(--space-5) var(--space-4);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
      color: var(--color-muted);
      text-align: center;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .entry {
      display: flex;
      gap: var(--space-3);
      align-items: center;
      padding: var(--space-3);
      border: 2px solid var(--color-orange);
      border-radius: var(--radius-lg);
      background: #fffaf0;
      color: inherit;
      text-decoration: none;
    }

    .entry:hover {
      border-color: var(--color-primary);
      color: inherit;
    }

    .entry__photo {
      flex-shrink: 0;
      width: 4.5rem;
      height: 4.5rem;
    }

    .entry__text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      font-size: 0.9375rem;
    }

    .entry__title {
      color: var(--color-heading);
      font-size: 1.0625rem;
      font-weight: 700;
      overflow-wrap: anywhere;
    }

    .entry__deadline {
      color: var(--color-orange-text);
      font-weight: 700;
    }
  `,
})
export default class CounterListPage {
  private readonly counterApi = inject(CounterApi);
  private readonly suggestionApi = inject(SuggestionApi);

  protected readonly formatDate = formatDate;
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal<ApiError | null>(null);
  protected readonly waiting = signal<Waiting[]>([]);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.counterApi
      .active()
      .pipe(
        switchMap((list) =>
          list.length === 0
            ? of([])
            : forkJoin(
                list.map((summons) =>
                  this.suggestionApi
                    .find(summons.suggestionId)
                    .pipe(map((suggestion) => ({ summons, suggestion }))),
                ),
              ),
        ),
      )
      .subscribe({
        next: (waiting) => {
          this.waiting.set(waiting);
          this.state.set('ready');
        },
        error: (error: ApiError) => {
          this.error.set(error);
          this.state.set('error');
        },
      });
  }
}
