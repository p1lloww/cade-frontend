import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiError } from '../../../../core/api/api-error';
import { ErrorMessage } from '../../../../shared/error-message/error-message';
import { Category, LossReport, LossReportRequest, Shift, SHIFT_LABELS } from '../loss-report';
import { LossReportApi } from '../loss-report-api';

const MAX_TEXT_LENGTH = 500;
const MAX_LOCATIONS = 5;
const MAX_PERIOD_DAYS = 30;

type LocationGroup = FormGroup<{ block: FormControl<string>; room: FormControl<string> }>;

/**
 * Registro de uma perda pelo estudante (RF13, RF14), pensado para levar menos de 3 minutos (RNF03): só categoria,
 * descrição e data são obrigatórias. As conferências daqui só ajudam a preencher; a regra (data no futuro, período
 * de até 30 dias, limite de 5 registros abertos) é do back-end, e a mensagem dele é a que aparece.
 */
@Component({
  selector: 'app-new-loss-report-page',
  host: { class: 'page' },
  imports: [ReactiveFormsModule, RouterLink, ErrorMessage],
  templateUrl: './new-loss-report-page.html',
  styleUrl: './new-loss-report-page.scss',
})
export default class NewLossReportPage {
  private readonly lossReportApi = inject(LossReportApi);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly maxTextLength = MAX_TEXT_LENGTH;
  protected readonly maxLocations = MAX_LOCATIONS;
  protected readonly shifts = Object.entries(SHIFT_LABELS) as [Shift, string][];
  protected readonly today = isoDate(new Date());
  protected readonly yesterday = isoDate(new Date(Date.now() - 86_400_000));

  protected readonly form = new FormGroup({
    categoryId: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    locations: new FormArray<LocationGroup>([newLocation()]),
    when: new FormControl<'day' | 'period'>('day', { nonNullable: true }),
    lostFrom: new FormControl('', { nonNullable: true }),
    lostUntil: new FormControl('', { nonNullable: true }),
    shift: new FormControl<Shift | ''>('', { nonNullable: true }),
    secretDetail: new FormControl('', { nonNullable: true }),
  });

  protected readonly categories = signal<Category[]>([]);
  protected readonly categoriesState = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly submitting = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  /** Mensagem de cada campo, pelo nome do campo no JSON (ex.: `locations[0].block`). */
  protected readonly fieldErrors = signal<Readonly<Record<string, string>>>({});
  protected readonly registered = signal<LossReport | null>(null);
  private attempted = false;

  constructor() {
    this.loadCategories();
    // Depois da primeira tentativa, as mensagens acompanham o que a pessoa corrige.
    this.form.valueChanges
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.attempted && this.fieldErrors.set(this.localErrors()));
  }

  protected get locations(): FormArray<LocationGroup> {
    return this.form.controls.locations;
  }

  protected loadCategories(): void {
    this.categoriesState.set('loading');
    this.lossReportApi.categories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.categoriesState.set('ready');
      },
      error: () => this.categoriesState.set('error'),
    });
  }

  protected addLocation(): void {
    if (this.locations.length < MAX_LOCATIONS) {
      this.locations.push(newLocation());
      this.focus(`#block-${this.locations.length - 1}`);
    }
  }

  protected removeLocation(index: number): void {
    this.locations.removeAt(index);
    if (this.locations.length === 0) {
      this.locations.push(newLocation());
    }
  }

  protected setDay(date: string): void {
    this.form.patchValue({ when: 'day', lostFrom: date, lostUntil: '' });
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    this.attempted = true;
    this.error.set(null);
    const errors = this.localErrors();
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      this.focusFirstInvalid();
      return;
    }
    this.submitting.set(true);
    this.lossReportApi
      .register(this.request())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (report) => {
          this.registered.set(report);
          this.focus('#done-title');
        },
        error: (error: ApiError) => {
          this.error.set(error);
          this.fieldErrors.set(error.fieldErrors);
          if (Object.keys(error.fieldErrors).length > 0) {
            this.focusFirstInvalid();
          } else {
            this.focus('#form-title');
          }
        },
      });
  }

  /** Limpa o formulário para registrar outra perda. */
  protected startOver(): void {
    this.attempted = false;
    this.form.reset();
    this.locations.clear();
    this.locations.push(newLocation());
    this.fieldErrors.set({});
    this.error.set(null);
    this.registered.set(null);
    this.focus('#form-title');
  }

  protected fieldError(field: string): string | null {
    return this.fieldErrors()[field] ?? null;
  }

  protected describedBy(field: string, hint?: string): string | null {
    const ids = [hint, this.fieldError(field) ? `${cssId(field)}-error` : null].filter(Boolean);
    return ids.length > 0 ? ids.join(' ') : null;
  }

  protected errorId(field: string): string {
    return `${cssId(field)}-error`;
  }

  protected formatDate(value: string): string {
    return new Date(value).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  }

  private request(): LossReportRequest {
    const value = this.form.getRawValue();
    const period = value.when === 'period' && value.lostUntil !== '';
    return {
      categoryId: value.categoryId,
      description: value.description.trim(),
      secretDetail: value.secretDetail.trim() || null,
      locations: value.locations
        .map(({ block, room }) => ({ block: block.trim(), room: room.trim() || null }))
        .filter(({ block, room }) => block !== '' || room !== null),
      lostFrom: value.lostFrom,
      lostUntil: period ? value.lostUntil : null,
      shift: value.shift || null,
    };
  }

  /** As mesmas mensagens do back-end, para a pessoa corrigir antes de enviar. */
  private localErrors(): Record<string, string> {
    const value = this.form.getRawValue();
    const errors: Record<string, string> = {};
    if (!value.categoryId) {
      errors['categoryId'] = 'Escolha a categoria.';
    }
    if (!value.description.trim()) {
      errors['description'] = 'Descreva o objeto.';
    } else if (value.description.length > MAX_TEXT_LENGTH) {
      errors['description'] = 'A descrição pode ter no máximo 500 caracteres.';
    }
    value.locations.forEach(({ block, room }, index) => {
      if (!block.trim() && room.trim()) {
        errors[`locations[${index}].block`] = 'Informe o bloco.';
      }
    });
    if (!value.lostFrom) {
      errors['lostFrom'] = 'Informe quando perdeu o objeto.';
    } else if (value.lostFrom > this.today) {
      errors['lostFrom'] = 'A data não pode estar no futuro.';
    }
    if (value.when === 'period' && value.lostFrom) {
      if (!value.lostUntil) {
        errors['lostUntil'] = 'Informe até quando.';
      } else if (value.lostUntil < value.lostFrom) {
        errors['lostUntil'] = 'O fim vem depois do início.';
      } else if (value.lostUntil > this.today) {
        errors['lostUntil'] = 'A data não pode estar no futuro.';
      } else if (daysBetween(value.lostFrom, value.lostUntil) > MAX_PERIOD_DAYS) {
        errors['lostUntil'] = 'O período pode ter no máximo 30 dias.';
      }
    }
    if (value.secretDetail.length > MAX_TEXT_LENGTH) {
      errors['secretDetail'] = 'O detalhe pode ter no máximo 500 caracteres.';
    }
    return errors;
  }

  private focusFirstInvalid(): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      { injector: this.injector },
    );
  }

  private focus(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
}

function newLocation(): LocationGroup {
  return new FormGroup({
    block: new FormControl('', { nonNullable: true }),
    room: new FormControl('', { nonNullable: true }),
  });
}

/** Data local no formato AAAA-MM-DD (o `toISOString` usa UTC e erra a data à noite). */
function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysBetween(from: string, until: string): number {
  return Math.round((Date.parse(until) - Date.parse(from)) / 86_400_000);
}

/** `locations[0].block` → `locations-0-block`, para usar como id no HTML. */
function cssId(field: string): string {
  return field.replace(/[^a-zA-Z0-9]+/g, '-').replace(/-$/, '');
}
