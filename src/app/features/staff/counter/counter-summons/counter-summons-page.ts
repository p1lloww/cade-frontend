import {
  afterNextRender,
  Component,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, map, Observable, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/api/api-error';
import { ErrorMessage } from '../../../../shared/error-message/error-message';
import { formatDate } from '../../../../shared/format/dates';
import { ApiPhoto } from '../../../../shared/photo/api-photo';
import { Suggestion } from '../../suggestions/suggestion';
import { SuggestionApi } from '../../suggestions/suggestion-api';
import { checkErrors, CheckFields, newCheckForm } from '../check-fields/check-fields';
import { CounterSummons, IdDocumentType, Refusal } from '../counter';
import { CounterApi } from '../counter-api';

/** Máximo de recusas antes de bloquear o estudante (RN12); a regra é do back-end, aqui só se informa. */
const MAX_REFUSALS = 3;

/**
 * Atendimento de um convocado no balcão (RF28, RF29, RF31): onde pegar o objeto, o que conferir pelo risco, o que o
 * estudante disse ao lado do detalhe reservado, e o registro da retirada ou da recusa, ambos com confirmação.
 */
@Component({
  selector: 'app-counter-summons-page',
  host: { class: 'page' },
  imports: [ReactiveFormsModule, RouterLink, ErrorMessage, ApiPhoto, CheckFields],
  templateUrl: './counter-summons-page.html',
  styleUrl: './counter-summons-page.scss',
})
export default class CounterSummonsPage {
  private readonly counterApi = inject(CounterApi);
  private readonly suggestionApi = inject(SuggestionApi);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Id da convocação, da rota. */
  readonly id = input.required<string>();

  protected readonly formatDate = formatDate;
  protected readonly maxRefusals = MAX_REFUSALS;
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly loadError = signal<ApiError | null>(null);
  protected readonly summons = signal<CounterSummons | null>(null);
  protected readonly suggestion = signal<Suggestion | null>(null);

  protected readonly checkForm = newCheckForm();
  protected readonly reason = new FormControl('', { nonNullable: true });
  /** Passo do atendimento: conferir, confirmar a entrega, escrever e confirmar a recusa, ou concluído. */
  protected readonly step = signal<'check' | 'confirm-pickup' | 'refuse' | 'picked-up' | 'refused'>(
    'check',
  );
  protected readonly fieldErrors = signal<Readonly<Record<string, string>>>({});
  protected readonly sending = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly refusal = signal<Refusal | null>(null);
  private attempted = false;

  constructor() {
    effect(() => this.load(this.id()));
    this.checkForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.attempted && this.fieldErrors.set(checkErrors(this.checkForm, true)));
  }

  protected load(id = this.id()): void {
    this.state.set('loading');
    this.counterApi
      .find(id)
      .pipe(
        switchMap((summons) =>
          this.suggestionApi
            .find(summons.suggestionId)
            .pipe(map((suggestion) => ({ summons, suggestion }))),
        ),
      )
      .subscribe({
        next: ({ summons, suggestion }) => {
          this.summons.set(summons);
          this.suggestion.set(suggestion);
          this.state.set('ready');
        },
        error: (error: ApiError) => {
          this.loadError.set(error);
          this.state.set('error');
        },
      });
  }

  /** Confere os campos e pede a confirmação da entrega. */
  protected reviewPickup(): void {
    this.attempted = true;
    this.error.set(null);
    const errors = checkErrors(this.checkForm, true);
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      this.focus('[aria-invalid="true"]');
      return;
    }
    this.step.set('confirm-pickup');
    this.focus('#confirm-pickup');
  }

  protected confirmPickup(): void {
    const value = this.checkForm.getRawValue();
    this.send(
      this.counterApi.registerPickup(this.id(), {
        documentType: value.documentType as IdDocumentType,
        documentNumber: value.documentNumber.trim(),
        enrollment: value.enrollment.trim(),
        verification: value.verification,
        notes: value.notes.trim() || null,
      }),
      () => this.step.set('picked-up'),
    );
  }

  protected startRefusal(): void {
    this.reason.reset();
    this.fieldErrors.set({});
    this.error.set(null);
    this.step.set('refuse');
    this.focus('#refusal-reason');
  }

  protected confirmRefusal(): void {
    const reason = this.reason.value.trim();
    if (!reason) {
      this.fieldErrors.set({ reason: 'Informe o motivo.' });
      this.focus('#refusal-reason');
      return;
    }
    this.send(this.counterApi.refuse(this.id(), reason), (refusal) => {
      this.refusal.set(refusal as Refusal);
      this.step.set('refused');
    });
  }

  protected backToCheck(): void {
    this.step.set('check');
    this.error.set(null);
  }

  private send<T>(request: Observable<T>, onDone: (result: T) => void): void {
    if (this.sending()) {
      return;
    }
    this.sending.set(true);
    this.error.set(null);
    request.pipe(finalize(() => this.sending.set(false))).subscribe({
      next: (result) => {
        onDone(result);
        this.focus('#result');
      },
      error: (error: ApiError) => {
        this.error.set(error);
        this.fieldErrors.set(error.fieldErrors);
        if (this.step() === 'confirm-pickup' && Object.keys(error.fieldErrors).length > 0) {
          this.step.set('check');
        }
        this.focus('[role="alert"]');
      },
    });
  }

  private focus(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
}
