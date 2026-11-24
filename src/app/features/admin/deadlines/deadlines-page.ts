import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { ApiError } from '../../../core/api/api-error';
import { ErrorMessage } from '../../../shared/error-message/error-message';

interface Deadlines {
  storageDays: number;
  summonsDays: number;
  reportValidityDays: number;
}

type DeadlineKey = keyof Deadlines;

/** Os três prazos, com os limites aceitos pelo back-end e o que cada um controla. */
const FIELDS: readonly {
  key: DeadlineKey;
  label: string;
  hint: string;
  min: number;
  max: number;
}[] = [
  {
    key: 'storageDays',
    label: 'Guarda na sala',
    hint: 'Depois disso, o objeto vira não reclamado e espera o destino.',
    min: 30,
    max: 365,
  },
  {
    key: 'summonsDays',
    label: 'Prazo para retirar depois da convocação',
    hint: 'Sem retirada, a convocação vence e o objeto volta a disponível.',
    min: 1,
    max: 30,
  },
  {
    key: 'reportValidityDays',
    label: 'Validade do registro de perda',
    hint: 'O estudante é avisado antes e pode renovar.',
    min: 7,
    max: 90,
  },
];

/**
 * Prazos (RF45): guarda, retirada depois da convocação e validade do registro, sem mudar código. Uma mudança vale
 * para o que vem depois; convocações e registros já criados guardam o prazo com que nasceram.
 */
@Component({
  selector: 'app-deadlines-page',
  host: { class: 'page' },
  imports: [ReactiveFormsModule, RouterLink, ErrorMessage],
  template: `
    <a class="back" routerLink="/admin">Voltar à administração</a>
    <h1>Prazos</h1>
    <p class="lead">
      Uma mudança vale para o que vier depois. O que já existe guarda o prazo com que começou.
    </p>

    @switch (state()) {
      @case ('loading') {
        <p class="muted" role="status">Carregando os prazos…</p>
      }
      @case ('error') {
        <app-error-message [error]="loadError()" />
        <button class="button button--secondary" type="button" (click)="load()">
          Tentar de novo
        </button>
      }
      @default {
        <form class="group" [formGroup]="form" (ngSubmit)="save()" novalidate>
          @for (field of fields; track field.key) {
            <div class="field deadline">
              <label class="field__label" [for]="field.key">{{ field.label }}</label>
              <span class="field__hint" [id]="field.key + '-hint'">
                {{ field.hint }} De {{ field.min }} a {{ field.max }} dias.
              </span>
              <div class="deadline__input">
                <input
                  [id]="field.key"
                  class="input"
                  type="number"
                  inputmode="numeric"
                  [min]="field.min"
                  [max]="field.max"
                  [formControlName]="field.key"
                  [attr.aria-invalid]="errors()[field.key] ? true : null"
                  [attr.aria-describedby]="
                    field.key + '-hint' + (errors()[field.key] ? ' ' + field.key + '-error' : '')
                  "
                />
                <span aria-hidden="true">dias</span>
              </div>
              @if (errors()[field.key]; as message) {
                <span [id]="field.key + '-error'" class="field__error">{{ message }}</span>
              }
            </div>
          }
          <app-error-message [error]="error()" />
          @if (notice(); as text) {
            <p class="alert alert--success" role="status">{{ text }}</p>
          }
          <button class="button" type="submit" [disabled]="saving()">
            {{ saving() ? 'Salvando…' : 'Salvar prazos' }}
          </button>
        </form>
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

    .deadline__input {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      color: var(--color-heading);
      font-weight: 600;
    }

    .deadline__input .input {
      max-width: 8rem;
    }
  `,
})
export default class DeadlinesPage {
  private readonly api = inject(ApiClient);

  protected readonly fields = FIELDS;
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly loadError = signal<ApiError | null>(null);
  protected readonly form = new FormGroup({
    storageDays: new FormControl<number | null>(null),
    summonsDays: new FormControl<number | null>(null),
    reportValidityDays: new FormControl<number | null>(null),
  });
  protected readonly saving = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly errors = signal<Readonly<Record<string, string>>>({});
  protected readonly notice = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.api.get<Deadlines>('/settings/deadlines').subscribe({
      next: (deadlines) => {
        this.form.setValue(deadlines);
        this.state.set('ready');
      },
      error: (error: ApiError) => {
        this.loadError.set(error);
        this.state.set('error');
      },
    });
  }

  protected save(): void {
    const value = this.form.getRawValue();
    const errors: Record<string, string> = {};
    for (const field of FIELDS) {
      const days = value[field.key];
      if (days === null || !Number.isInteger(days) || days < field.min || days > field.max) {
        errors[field.key] = `Use um número inteiro de ${field.min} a ${field.max}.`;
      }
    }
    this.errors.set(errors);
    this.notice.set(null);
    if (Object.keys(errors).length > 0 || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api
      .put<Deadlines>('/settings/deadlines', value)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (deadlines) => {
          this.form.setValue(deadlines);
          this.notice.set('Prazos salvos. Valem a partir de agora para o que vier depois.');
        },
        error: (error: ApiError) => {
          this.error.set(error);
          this.errors.set(error.fieldErrors);
        },
      });
  }
}
