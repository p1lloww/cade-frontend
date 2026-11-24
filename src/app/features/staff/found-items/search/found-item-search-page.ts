import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../../core/api/api-error';
import { ErrorMessage } from '../../../../shared/error-message/error-message';
import { formatDay } from '../../../../shared/format/dates';
import { ApiPhoto } from '../../../../shared/photo/api-photo';
import {
  FoundItem,
  FoundItemFilters,
  FoundItemStatus,
  SearchOptions,
  STATUS_TAG,
} from '../found-item';
import { FoundItemApi } from '../found-item-api';

const PAGE_SIZE = 20;

/** Situações que ainda podem sair pelo atalho de balcão (RF32). */
const HANDOVER_STATUSES: readonly FoundItemStatus[] = ['AVAILABLE', 'UNCLAIMED'];

/**
 * Início da área da sala: cadastrar, balcão e a busca de objetos (RF10) por texto, categoria, mês, local e
 * situação, com miniatura da foto (baixada com o token, D09). Os filtros vivem no endereço da página, para o
 * "voltar" do navegador manter a busca.
 */
@Component({
  selector: 'app-found-item-search-page',
  host: { class: 'page page--wide' },
  imports: [ReactiveFormsModule, RouterLink, ErrorMessage, ApiPhoto],
  templateUrl: './found-item-search-page.html',
  styleUrl: './found-item-search-page.scss',
})
export default class FoundItemSearchPage {
  private readonly foundItemApi = inject(FoundItemApi);
  private readonly router = inject(Router);

  // Filtros vindos do endereço (?q=…&status=…), ligados pelo roteador.
  readonly q = input<string>();
  readonly categoryId = input<string>();
  readonly month = input<string>();
  readonly block = input<string>();
  readonly room = input<string>();
  readonly status = input<string | string[]>();

  protected readonly formatDay = formatDay;
  protected readonly statusTag = STATUS_TAG;

  protected readonly form = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    categoryId: new FormControl('', { nonNullable: true }),
    month: new FormControl('', { nonNullable: true }),
    block: new FormControl('', { nonNullable: true }),
    room: new FormControl('', { nonNullable: true }),
    status: new FormControl<FoundItemStatus[]>([], { nonNullable: true }),
  });

  protected readonly options = signal<SearchOptions | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal<ApiError | null>(null);
  protected readonly items = signal<FoundItem[]>([]);
  protected readonly total = signal(0);
  protected readonly loadingMore = signal(false);
  private page = 0;

  private readonly filters = computed<FoundItemFilters>(() => ({
    q: this.q()?.trim() || undefined,
    categoryId: this.categoryId() || undefined,
    month: this.month() || undefined,
    block: this.block() || undefined,
    room: this.room() || undefined,
    status: toList(this.status()) as FoundItemStatus[],
  }));
  /** Quantos filtros, além do texto, estão em uso; abre o "Mais filtros" quando há algum. */
  protected readonly activeFilters = computed(() => {
    const { categoryId, month, block, room, status } = this.filters();
    return [categoryId, month, block, room].filter(Boolean).length + (status?.length ?? 0);
  });

  private readonly selectedBlock = toSignal(this.form.controls.block.valueChanges, {
    initialValue: '',
  });
  protected readonly rooms = computed(
    () => this.options()?.places.find(({ block }) => block === this.selectedBlock())?.rooms ?? [],
  );
  protected readonly hasMore = computed(() => this.items().length < this.total());

  constructor() {
    this.foundItemApi
      .searchOptions()
      .subscribe({ next: (options) => this.options.set(options), error: () => {} });
    this.form.controls.block.valueChanges.subscribe(() => this.form.controls.room.setValue(''));
    // A cada mudança no endereço, o formulário mostra os filtros e a busca recomeça da primeira página.
    effect(() => {
      const filters = this.filters();
      untracked(() => {
        this.form.setValue(
          {
            q: filters.q ?? '',
            categoryId: filters.categoryId ?? '',
            month: filters.month ?? '',
            block: '',
            room: '',
            status: filters.status ?? [],
          },
          { emitEvent: false },
        );
        // O bloco é posto à parte, emitindo, para a lista de salas acompanhar; a sala vem depois dele.
        this.form.controls.block.setValue(filters.block ?? '');
        this.form.controls.room.setValue(filters.room ?? '', { emitEvent: false });
        this.search(filters);
      });
    });
  }

  /** Leva os filtros para o endereço; a busca roda pelo efeito acima. */
  protected submit(): void {
    const value = this.form.getRawValue();
    void this.router.navigate([], {
      queryParams: {
        q: value.q.trim() || null,
        categoryId: value.categoryId || null,
        month: value.month || null,
        block: value.block || null,
        room: value.room || null,
        status: value.status.length > 0 ? value.status : null,
      },
    });
  }

  protected clear(): void {
    void this.router.navigate([], { queryParams: {} });
  }

  protected toggleStatus(code: FoundItemStatus, checked: boolean): void {
    const current = this.form.controls.status.value;
    this.form.controls.status.setValue(
      checked ? [...current, code] : current.filter((status) => status !== code),
    );
  }

  protected loadMore(): void {
    if (this.loadingMore()) {
      return;
    }
    this.loadingMore.set(true);
    this.foundItemApi.search(this.filters(), this.page + 1, PAGE_SIZE).subscribe({
      next: ({ content, page }) => {
        this.page = page.number;
        this.items.update((items) => [...items, ...content]);
        this.total.set(page.totalElements);
        this.loadingMore.set(false);
      },
      error: (error: ApiError) => {
        this.error.set(error);
        this.loadingMore.set(false);
      },
    });
  }

  protected retry(): void {
    this.search(this.filters());
  }

  protected canHandOver(item: FoundItem): boolean {
    return HANDOVER_STATUSES.includes(item.status);
  }

  protected monthLabel(month: string): string {
    const [year, number] = month.split('-').map(Number);
    return new Date(year, number - 1, 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
  }

  private search(filters: FoundItemFilters): void {
    this.state.set('loading');
    this.error.set(null);
    this.foundItemApi.search(filters, 0, PAGE_SIZE).subscribe({
      next: ({ content, page }) => {
        this.page = 0;
        this.items.set(content);
        this.total.set(page.totalElements);
        this.state.set('ready');
      },
      error: (error: ApiError) => {
        this.error.set(error);
        this.state.set('error');
      },
    });
  }
}

function toList(value: string | string[] | undefined): string[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}
