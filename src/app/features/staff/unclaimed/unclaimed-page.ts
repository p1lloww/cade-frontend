import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiError } from '../../../core/api/api-error';
import { Session } from '../../../core/auth/session';
import { ErrorMessage } from '../../../shared/error-message/error-message';
import { formatDate, formatDay } from '../../../shared/format/dates';
import { ApiPhoto } from '../../../shared/photo/api-photo';
import { DESTINATIONS, DisposalDestination, UnclaimedBox, UnclaimedItem } from './unclaimed';
import { UnclaimedApi } from './unclaimed-api';

/**
 * Não reclamados agrupados por caixa de mês, para retirar da sala de uma vez (RF39). Eles ainda podem ser
 * retirados pelo dono até o destino ser registrado (RN17); registrar o destino é só do administrador (RF38).
 */
@Component({
  selector: 'app-unclaimed-page',
  host: { class: 'page' },
  imports: [ReactiveFormsModule, RouterLink, ErrorMessage, ApiPhoto],
  templateUrl: './unclaimed-page.html',
  styleUrl: './unclaimed-page.scss',
})
export default class UnclaimedPage {
  private readonly unclaimedApi = inject(UnclaimedApi);
  private readonly session = inject(Session);

  protected readonly formatDay = formatDay;
  protected readonly formatDate = formatDate;
  protected readonly destinations = DESTINATIONS;
  protected readonly isAdmin = computed(() => this.session.user()?.role === 'ADMIN');

  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly loadError = signal<ApiError | null>(null);
  protected readonly boxes = signal<UnclaimedBox[]>([]);
  protected readonly total = computed(() =>
    this.boxes().reduce((sum, box) => sum + box.items.length, 0),
  );

  /** Objeto com o destino aberto para escolher e confirmar. */
  protected readonly disposing = signal<UnclaimedItem | null>(null);
  protected readonly destination = new FormControl<DisposalDestination>('BAZAAR', {
    nonNullable: true,
  });
  protected readonly note = new FormControl('', { nonNullable: true });
  protected readonly noteError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly notice = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.unclaimedApi.byBox().subscribe({
      next: (boxes) => {
        this.boxes.set(boxes);
        this.state.set('ready');
      },
      error: (error: ApiError) => {
        this.loadError.set(error);
        this.state.set('error');
      },
    });
  }

  protected open(item: UnclaimedItem): void {
    this.disposing.set(item);
    this.destination.setValue('BAZAAR');
    this.note.reset();
    this.noteError.set(null);
    this.error.set(null);
    this.notice.set(null);
  }

  protected confirm(): void {
    const item = this.disposing();
    if (!item || this.saving()) {
      return;
    }
    const note = this.note.value.trim() || null;
    if (this.destination.value === 'OTHER' && !note) {
      this.noteError.set('Diga qual é o destino.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.unclaimedApi
      .dispose(item.id, this.destination.value, note)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          const label = DESTINATIONS.find(({ code }) => code === this.destination.value)!.label;
          this.notice.set(`Destino registrado: ${label.toLowerCase()}. O objeto saiu da lista.`);
          this.disposing.set(null);
          this.boxes.update((boxes) =>
            boxes
              .map((box) => ({ ...box, items: box.items.filter(({ id }) => id !== item.id) }))
              .filter((box) => box.items.length > 0),
          );
        },
        error: (error: ApiError) => {
          this.error.set(error);
          this.noteError.set(error.fieldErrors['note'] ?? null);
        },
      });
  }
}
