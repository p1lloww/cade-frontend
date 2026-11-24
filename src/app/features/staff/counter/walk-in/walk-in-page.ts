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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin, merge } from 'rxjs';
import { ApiError } from '../../../../core/api/api-error';
import { ErrorMessage } from '../../../../shared/error-message/error-message';
import { formatDay } from '../../../../shared/format/dates';
import { ApiPhoto } from '../../../../shared/photo/api-photo';
import { FoundItem } from '../../found-items/found-item';
import { FoundItemApi } from '../../found-items/found-item-api';
import { checkErrors, CheckFields, newCheckForm } from '../check-fields/check-fields';
import { HolderType, IdDocumentType, WalkInCheck } from '../counter';
import { CounterApi } from '../counter-api';

/**
 * Atalho de balcão (RF32): entrega a quem veio direto à sala, sem registro de perda, inclusive a pessoa sem conta
 * (nome e documento). Confere o mesmo que a retirada com convocação, pelo risco do objeto (RF28).
 */
@Component({
  selector: 'app-walk-in-page',
  host: { class: 'page' },
  imports: [ReactiveFormsModule, RouterLink, ErrorMessage, ApiPhoto, CheckFields],
  templateUrl: './walk-in-page.html',
  styleUrl: './walk-in-page.scss',
})
export default class WalkInPage {
  private readonly counterApi = inject(CounterApi);
  private readonly foundItemApi = inject(FoundItemApi);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Id do objeto, da rota. */
  readonly id = input.required<string>();

  protected readonly formatDay = formatDay;
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly loadError = signal<ApiError | null>(null);
  protected readonly item = signal<FoundItem | null>(null);
  protected readonly check = signal<WalkInCheck | null>(null);

  protected readonly holderType = new FormControl<HolderType>('STUDENT', { nonNullable: true });
  protected readonly holderName = new FormControl('', { nonNullable: true });
  protected readonly checkForm = newCheckForm();
  protected readonly holder = toSignal(this.holderType.valueChanges, {
    initialValue: 'STUDENT',
  });

  protected readonly step = signal<'form' | 'confirm' | 'done'>('form');
  protected readonly fieldErrors = signal<Readonly<Record<string, string>>>({});
  protected readonly sending = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  private attempted = false;

  constructor() {
    effect(() => this.load(this.id()));
    merge(this.checkForm.valueChanges, this.holderName.valueChanges, this.holderType.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.attempted && this.fieldErrors.set(this.localErrors()));
  }

  protected load(id = this.id()): void {
    this.state.set('loading');
    forkJoin([this.foundItemApi.find(id), this.counterApi.walkInCheck(id)]).subscribe({
      next: ([item, check]) => {
        this.item.set(item);
        this.check.set(check);
        this.state.set('ready');
      },
      error: (error: ApiError) => {
        this.loadError.set(error);
        this.state.set('error');
      },
    });
  }

  protected review(): void {
    this.attempted = true;
    this.error.set(null);
    const errors = this.localErrors();
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      this.focus('[aria-invalid="true"]');
      return;
    }
    this.step.set('confirm');
    this.focus('#confirm-walk-in');
  }

  protected confirm(): void {
    if (this.sending()) {
      return;
    }
    const value = this.checkForm.getRawValue();
    const student = this.holderType.value === 'STUDENT';
    this.sending.set(true);
    this.error.set(null);
    this.counterApi
      .registerWalkIn({
        foundItemId: this.id(),
        holderType: this.holderType.value,
        holderName: this.holderName.value.trim(),
        documentType: value.documentType as IdDocumentType,
        documentNumber: value.documentNumber.trim(),
        enrollment: student ? value.enrollment.trim() : null,
        verification: value.verification,
        notes: value.notes.trim() || null,
      })
      .pipe(finalize(() => this.sending.set(false)))
      .subscribe({
        next: () => {
          this.step.set('done');
          this.focus('#result');
          // O objeto saiu da sala: recarrega para a situação mostrar "Devolvido".
          this.foundItemApi
            .find(this.id())
            .subscribe({ next: (item) => this.item.set(item), error: () => {} });
        },
        error: (error: ApiError) => {
          this.error.set(error);
          this.fieldErrors.set(error.fieldErrors);
          this.step.set('form');
          this.focus('[role="alert"]');
        },
      });
  }

  protected back(): void {
    this.step.set('form');
  }

  private localErrors(): Record<string, string> {
    const errors = checkErrors(this.checkForm, this.holderType.value === 'STUDENT');
    if (!this.holderName.value.trim()) {
      errors['holderName'] = 'Informe o nome de quem retira.';
    }
    return errors;
  }

  private focus(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
}
