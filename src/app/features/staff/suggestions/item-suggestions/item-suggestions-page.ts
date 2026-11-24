import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiError } from '../../../../core/api/api-error';
import { ErrorMessage } from '../../../../shared/error-message/error-message';
import { formatDay, formatPeriod } from '../../../../shared/format/dates';
import { ApiPhoto } from '../../../../shared/photo/api-photo';
import { FoundItem } from '../../found-items/found-item';
import { FoundItemApi } from '../../found-items/found-item-api';
import { BAND_TAG, Suggestion } from '../suggestion';
import { SuggestionApi } from '../suggestion-api';

/**
 * Sugestões de um objeto achado, da maior compatibilidade para a menor (RF22). A faixa vai escrita ("alta",
 * "média"), não só na cor (RNF10). Cada uma leva à comparação lado a lado, onde o funcionário decide.
 */
@Component({
  selector: 'app-item-suggestions-page',
  host: { class: 'page' },
  imports: [RouterLink, ErrorMessage, ApiPhoto],
  templateUrl: './item-suggestions-page.html',
  styleUrl: './item-suggestions-page.scss',
})
export default class ItemSuggestionsPage {
  private readonly foundItemApi = inject(FoundItemApi);
  private readonly suggestionApi = inject(SuggestionApi);

  /** Id do objeto, da rota. */
  readonly id = input.required<string>();

  protected readonly bandTag = BAND_TAG;
  protected readonly formatDay = formatDay;
  protected readonly formatPeriod = formatPeriod;
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal<ApiError | null>(null);
  protected readonly item = signal<FoundItem | null>(null);
  protected readonly suggestions = signal<Suggestion[]>([]);

  constructor() {
    effect(() => this.load(this.id()));
  }

  protected load(id = this.id()): void {
    this.state.set('loading');
    forkJoin([this.foundItemApi.find(id), this.suggestionApi.forFoundItem(id)]).subscribe({
      next: ([item, suggestions]) => {
        this.item.set(item);
        this.suggestions.set(suggestions);
        this.state.set('ready');
      },
      error: (error: ApiError) => {
        this.error.set(error);
        this.state.set('error');
      },
    });
  }

  protected places(suggestion: Suggestion): string {
    const locations = suggestion.lossReport.locations;
    return locations.length === 0
      ? 'Local não informado'
      : locations.map(({ block, room }) => (room ? `${block}, ${room}` : block)).join('; ');
  }
}
