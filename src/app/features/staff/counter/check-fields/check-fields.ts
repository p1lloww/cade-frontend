import { Component, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DOCUMENT_TYPES, IdDocumentType, VerificationOption } from '../counter';

export type CheckForm = FormGroup<{
  documentType: FormControl<IdDocumentType | ''>;
  documentNumber: FormControl<string>;
  enrollment: FormControl<string>;
  verification: FormControl<string>;
  notes: FormControl<string>;
}>;

export function newCheckForm(): CheckForm {
  return new FormGroup({
    documentType: new FormControl<IdDocumentType | ''>('', { nonNullable: true }),
    documentNumber: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(30)],
    }),
    enrollment: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(20)] }),
    verification: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });
}

/** As mesmas mensagens do back-end para o que é conferido no balcão (RN10). */
export function checkErrors(form: CheckForm, needsEnrollment: boolean): Record<string, string> {
  const value = form.getRawValue();
  const errors: Record<string, string> = {};
  if (!value.documentType) {
    errors['documentType'] = 'Informe o tipo do documento com foto.';
  }
  if (!value.documentNumber.trim()) {
    errors['documentNumber'] = 'Informe o número do documento.';
  }
  if (needsEnrollment && !value.enrollment.trim()) {
    errors['enrollment'] = 'Informe a matrícula.';
  }
  if (!value.verification) {
    errors['verification'] = 'Informe a verificação feita.';
  }
  return errors;
}

/**
 * Campos do que o funcionário confere antes de entregar: documento com foto, matrícula e uma das verificações que
 * bastam para o risco do objeto. Usados na retirada com convocação e no atalho de balcão.
 */
@Component({
  selector: 'app-check-fields',
  imports: [ReactiveFormsModule],
  template: `
    <ng-container [formGroup]="form()">
      <p class="field__label" id="documentType-label">Documento com foto</p>
      <div class="choices choices--compact" role="radiogroup" aria-labelledby="documentType-label">
        @for (type of documentTypes; track type.code; let first = $first) {
          <label class="choice">
            <input
              type="radio"
              formControlName="documentType"
              [value]="type.code"
              [id]="first ? 'documentType' : null"
              [attr.aria-invalid]="first && errors()['documentType'] ? true : null"
            />
            <span class="choice__box">{{ type.label }}</span>
          </label>
        }
      </div>
      @if (errors()['documentType']; as message) {
        <p id="documentType-error" class="field__error">{{ message }}</p>
      }

      <div class="pair">
        <div class="field">
          <label class="field__label" for="documentNumber">Número do documento</label>
          <input
            id="documentNumber"
            class="input"
            type="text"
            maxlength="30"
            autocomplete="off"
            formControlName="documentNumber"
            [attr.aria-invalid]="errors()['documentNumber'] ? true : null"
            [attr.aria-describedby]="errors()['documentNumber'] ? 'documentNumber-error' : null"
          />
          @if (errors()['documentNumber']; as message) {
            <span id="documentNumber-error" class="field__error">{{ message }}</span>
          }
        </div>
        @if (showEnrollment()) {
          <div class="field">
            <label class="field__label" for="enrollment">Matrícula</label>
            <input
              id="enrollment"
              class="input"
              type="text"
              inputmode="numeric"
              maxlength="20"
              autocomplete="off"
              formControlName="enrollment"
              [attr.aria-invalid]="errors()['enrollment'] ? true : null"
              [attr.aria-describedby]="errors()['enrollment'] ? 'enrollment-error' : null"
            />
            @if (errors()['enrollment']; as message) {
              <span id="enrollment-error" class="field__error">{{ message }}</span>
            }
          </div>
        }
      </div>

      <p class="field__label" id="verification-label">Verificação feita</p>
      <div class="options" role="radiogroup" aria-labelledby="verification-label">
        @for (option of verifications(); track option.code; let first = $first) {
          <label class="option">
            <input
              type="radio"
              formControlName="verification"
              [value]="option.code"
              [id]="first ? 'verification' : null"
              [attr.aria-invalid]="first && errors()['verification'] ? true : null"
            />
            <span>{{ option.label }}</span>
          </label>
        }
      </div>
      @if (errors()['verification']; as message) {
        <p id="verification-error" class="field__error">{{ message }}</p>
      }

      <div class="field notes">
        <label class="field__label" for="notes"
          >Observação <span class="optional">(opcional)</span></label
        >
        <textarea
          id="notes"
          class="input input--area"
          rows="2"
          maxlength="500"
          formControlName="notes"
        ></textarea>
      </div>
    </ng-container>
  `,
  styles: `
    .pair {
      display: grid;
      gap: 0 var(--space-3);
    }

    .options {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin: var(--space-2) 0 var(--space-2);
    }

    .option {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      min-height: var(--touch-target);
      padding: var(--space-3) var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      color: var(--color-heading);
      cursor: pointer;
    }

    .option:has(input:checked) {
      border: 2px solid var(--color-primary);
      background: var(--color-sky-soft);
    }

    .option input {
      width: 1.25rem;
      height: 1.25rem;
      margin: 0.125rem 0 0;
      accent-color: var(--color-primary);
    }

    .notes {
      margin-top: var(--space-4);
    }

    @media (min-width: 36rem) {
      .pair {
        grid-template-columns: 1fr 1fr;
      }
    }
  `,
})
export class CheckFields {
  readonly form = input.required<CheckForm>();
  readonly verifications = input.required<readonly VerificationOption[]>();
  readonly errors = input<Readonly<Record<string, string>>>({});
  /** Matrícula é registrada para estudantes (RN10); pessoa sem conta não tem. */
  readonly showEnrollment = input(true);

  protected readonly documentTypes = DOCUMENT_TYPES;
}
