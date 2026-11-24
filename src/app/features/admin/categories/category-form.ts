import { Component, computed, input, OnInit, output, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ApiError } from '../../../core/api/api-error';
import { Category, RISK_LEVELS, RiskLevel } from '../../../shared/categories/category';
import { ErrorMessage } from '../../../shared/error-message/error-message';
import { CategoryRequest } from './category-admin-api';

const MAX_QUESTIONS = 10;

/** O que cada risco exige no balcão (RN09), para o administrador escolher sabendo o efeito. */
const RISK_HINTS: Readonly<Record<RiskLevel, { label: string; hint: string }>> = {
  LOW: {
    label: 'Baixo',
    hint: 'Documento com foto e descrição coerente. Ex.: garrafa, guarda-chuva.',
  },
  MEDIUM: {
    label: 'Médio',
    hint: 'Documento e um detalhe que não aparece na foto. Ex.: fone, mochila.',
  },
  HIGH: {
    label: 'Alto',
    hint: 'Documento e desbloqueio na frente do funcionário, ou prova. Ex.: celular.',
  },
  DOCUMENT: {
    label: 'Documento',
    hint: 'Entregue só ao titular, conferindo a foto. Ex.: RG, carteirinha.',
  },
};

/** Todos os riscos que uma categoria pode ter como padrão, inclusive o de documento. */
const CATEGORY_RISKS: readonly RiskLevel[] = [...RISK_LEVELS, 'DOCUMENT'];

/** Formulário de uma categoria: nome, risco padrão e perguntas de conferência. Serve para criar e para editar. */
@Component({
  selector: 'app-category-form',
  imports: [ReactiveFormsModule, ErrorMessage],
  template: `
    <form class="form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="field">
        <label class="field__label" [for]="prefix() + '-name'">Nome</label>
        <input
          [id]="prefix() + '-name'"
          class="input"
          type="text"
          maxlength="60"
          formControlName="name"
          [attr.aria-invalid]="errors()['name'] ? true : null"
          [attr.aria-describedby]="errors()['name'] ? prefix() + '-name-error' : null"
        />
        @if (errors()['name']; as message) {
          <span [id]="prefix() + '-name-error'" class="field__error">{{ message }}</span>
        }
      </div>

      <p class="field__label" [id]="prefix() + '-risk-label'">Risco padrão</p>
      <div class="risks" role="radiogroup" [attr.aria-labelledby]="prefix() + '-risk-label'">
        @for (level of levels; track level) {
          <label class="risk">
            <input type="radio" formControlName="defaultRisk" [value]="level" />
            <span>
              <strong>{{ hints[level].label }}</strong>
              <span class="risk__hint">{{ hints[level].hint }}</span>
            </span>
          </label>
        }
      </div>

      <p class="field__label">
        Perguntas de conferência <span class="optional">(até {{ maxQuestions }})</span>
      </p>
      <p class="field__hint">O funcionário faz essas perguntas no balcão, nesta ordem.</p>
      <ol class="questions" formArrayName="questions">
        @for (question of questions.controls; track question; let i = $index) {
          <li class="question">
            <label class="visually-hidden" [for]="prefix() + '-q' + i">Pergunta {{ i + 1 }}</label>
            <input
              [id]="prefix() + '-q' + i"
              class="input"
              type="text"
              maxlength="200"
              placeholder="Ex.: qual é a cor da capa?"
              [formControlName]="i"
            />
            <button
              class="button--link"
              type="button"
              (click)="questions.removeAt(i)"
              [attr.aria-label]="'Remover a pergunta ' + (i + 1)"
            >
              Remover
            </button>
          </li>
        }
      </ol>
      @if (errors()['verificationQuestions']; as message) {
        <p class="field__error">{{ message }}</p>
      }
      @if (questions.length < maxQuestions) {
        <button
          class="button button--secondary button--small"
          type="button"
          (click)="addQuestion()"
        >
          + Pergunta
        </button>
      }

      <app-error-message [error]="error()" />
      <div class="actions">
        <button class="button" type="submit" [disabled]="saving()">
          {{ saving() ? 'Salvando…' : category() ? 'Salvar categoria' : 'Criar categoria' }}
        </button>
        <button class="button button--secondary" type="button" (click)="cancelled.emit()">
          Cancelar
        </button>
      </div>
    </form>
  `,
  styles: `
    .form {
      margin-top: var(--space-3);
      padding: var(--space-4);
      border-radius: var(--radius-lg);
      background: var(--color-sky-soft);
    }

    .risks {
      display: grid;
      gap: var(--space-2);
      margin: var(--space-2) 0 var(--space-4);
    }

    .risk {
      display: flex;
      gap: var(--space-3);
      align-items: flex-start;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-heading);
      cursor: pointer;
    }

    .risk:has(input:checked) {
      border: 2px solid var(--color-primary);
    }

    .risk input {
      width: 1.25rem;
      height: 1.25rem;
      margin: 0.125rem 0 0;
      accent-color: var(--color-primary);
    }

    .risk__hint {
      display: block;
      color: var(--color-muted);
      font-size: 0.875rem;
    }

    .questions {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin: var(--space-2) 0 var(--space-3);
      padding-left: var(--space-5);
    }

    .question {
      display: flex;
      gap: var(--space-3);
      align-items: center;
    }

    .question .input {
      flex: 1;
      min-width: 0;
    }

    .button--small {
      min-height: var(--touch-target);
      padding-inline: var(--space-4);
      font-size: 0.9375rem;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      margin-top: var(--space-4);
    }
  `,
})
export class CategoryForm implements OnInit {
  /** Categoria a editar; sem ela, o formulário cria uma nova. */
  readonly category = input<Category | null>(null);
  /** Prefixo dos ids, para vários formulários convivirem na mesma página. */
  readonly prefix = input('new');
  readonly saving = input(false);
  readonly error = input<ApiError | null>(null);
  readonly saved = output<CategoryRequest>();
  readonly cancelled = output<void>();

  protected readonly levels = CATEGORY_RISKS;
  protected readonly hints = RISK_HINTS;
  protected readonly maxQuestions = MAX_QUESTIONS;
  private readonly localErrors = signal<Readonly<Record<string, string>>>({});
  /** Mensagens de campo: as do back-end (do último envio) e as daqui. */
  protected readonly errors = computed(() => ({
    ...(this.error()?.fieldErrors ?? {}),
    ...this.localErrors(),
  }));

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    defaultRisk: new FormControl<RiskLevel>('LOW', { nonNullable: true }),
    questions: new FormArray<FormControl<string>>([]),
  });

  protected get questions(): FormArray<FormControl<string>> {
    return this.form.controls.questions;
  }

  ngOnInit(): void {
    const category = this.category();
    if (category) {
      this.form.patchValue({ name: category.name, defaultRisk: category.defaultRisk });
      for (const question of category.verificationQuestions ?? []) {
        this.questions.push(new FormControl(question, { nonNullable: true }));
      }
    }
  }

  protected addQuestion(): void {
    this.questions.push(new FormControl('', { nonNullable: true }));
  }

  protected submit(): void {
    const value = this.form.getRawValue();
    const name = value.name.trim();
    if (!name) {
      this.localErrors.set({ name: 'Informe o nome da categoria.' });
      return;
    }
    this.localErrors.set({});
    this.saved.emit({
      name,
      defaultRisk: value.defaultRisk,
      verificationQuestions: value.questions.map((q) => q.trim()).filter(Boolean),
    });
  }
}
