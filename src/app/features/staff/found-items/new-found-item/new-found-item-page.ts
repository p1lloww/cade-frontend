import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/api/api-error';
import {
  Category,
  RISK_LABELS,
  allowedRisks,
  RiskLevel,
} from '../../../../shared/categories/category';
import { CategoryApi } from '../../../../shared/categories/category-api';
import { ErrorMessage } from '../../../../shared/error-message/error-message';
import { formatDay, recentDays } from '../../../../shared/format/dates';
import { shrinkPhoto } from '../../../../shared/photo/shrink-photo';
import { FoundItem, PlaceOption } from '../found-item';
import { FoundItemApi } from '../found-item-api';

const MAX_TEXT_LENGTH = 500;

/**
 * Cadastro rápido de um objeto achado pelo celular (RF04 a RF06), com meta de menos de 1 minuto (RNF01): foto pela
 * câmera, categoria em um toque, local e data. A caixa vem sugerida pela data (RF05) e o resto fica recolhido. Depois
 * de cadastrar, "Cadastrar outro" mantém local, data e caixa, porque a sala costuma receber vários objetos juntos.
 */
@Component({
  selector: 'app-new-found-item-page',
  host: { class: 'page' },
  imports: [ReactiveFormsModule, RouterLink, ErrorMessage],
  templateUrl: './new-found-item-page.html',
  styleUrl: './new-found-item-page.scss',
})
export default class NewFoundItemPage {
  private readonly foundItemApi = inject(FoundItemApi);
  private readonly categoryApi = inject(CategoryApi);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly maxTextLength = MAX_TEXT_LENGTH;
  protected readonly today = recentDays().today;
  protected readonly yesterday = recentDays().yesterday;
  protected readonly formatDay = formatDay;

  protected readonly form = new FormGroup({
    categoryId: new FormControl('', { nonNullable: true }),
    block: new FormControl('', { nonNullable: true }),
    room: new FormControl('', { nonNullable: true }),
    foundOn: new FormControl(this.today, { nonNullable: true }),
    storageBox: new FormControl('', { nonNullable: true }),
    risk: new FormControl<RiskLevel | ''>('', { nonNullable: true }),
    internalDescription: new FormControl('', { nonNullable: true }),
    reservedDetails: new FormControl('', { nonNullable: true }),
    broughtBy: new FormControl('', { nonNullable: true }),
    identifiedName: new FormControl('', { nonNullable: true }),
    identifiedEmail: new FormControl('', { nonNullable: true }),
    identifiedDocument: new FormControl('', { nonNullable: true }),
  });

  protected readonly categories = signal<Category[]>([]);
  protected readonly categoriesState = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly places = signal<PlaceOption[]>([]);
  protected readonly photo = signal<Blob | null>(null);
  protected readonly photoUrl = signal<string | null>(null);
  protected readonly preparingPhoto = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  /** Mensagem de cada campo, pelo nome do campo enviado à API. */
  protected readonly fieldErrors = signal<Readonly<Record<string, string>>>({});
  protected readonly registered = signal<FoundItem | null>(null);
  /** O objeto foi cadastrado, mas marcar como identificado falhou: dá para tentar de novo na edição. */
  protected readonly identifyError = signal<string | null>(null);
  private attempted = false;
  /** A pessoa mexeu na caixa: a sugestão pela data não a sobrescreve mais. */
  private storageBoxEdited = false;

  private readonly categoryId = toSignal(this.form.controls.categoryId.valueChanges, {
    initialValue: '',
  });
  private readonly block = toSignal(this.form.controls.block.valueChanges, { initialValue: '' });

  /** O risco só pode subir em relação ao da categoria (RN04): as opções começam no padrão dela. */
  protected readonly riskOptions = computed(() => {
    const category = this.categories().find(({ id }) => id === this.categoryId());
    return (category ? allowedRisks(category.defaultRisk).slice(1) : []).map((level) => ({
      level,
      label: RISK_LABELS[level],
    }));
  });
  protected readonly defaultRiskLabel = computed(
    () => this.categories().find(({ id }) => id === this.categoryId())?.defaultRiskLabel ?? null,
  );
  protected readonly blocks = computed(() => this.places().map(({ block }) => block));
  protected readonly rooms = computed(
    () => this.places().find(({ block }) => block === this.block().trim())?.rooms ?? [],
  );

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.revokePhotoUrl());
    this.loadCategories();
    this.foundItemApi
      .places()
      .subscribe({ next: (places) => this.places.set(places), error: () => {} });
    this.suggestStorageBox(this.today);

    this.form.controls.foundOn.valueChanges
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((date) => this.suggestStorageBox(date));
    this.form.controls.categoryId.valueChanges
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => this.form.controls.risk.setValue(''));
    // Depois da primeira tentativa, as mensagens acompanham o que a pessoa corrige.
    this.form.valueChanges
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => this.attempted && this.fieldErrors.set(this.localErrors()));
  }

  protected loadCategories(): void {
    this.categoriesState.set('loading');
    this.categoryApi.list().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.categoriesState.set('ready');
      },
      error: () => this.categoriesState.set('error'),
    });
  }

  protected async choosePhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.preparingPhoto.set(true);
    const photo = await shrinkPhoto(file);
    this.revokePhotoUrl();
    this.photo.set(photo);
    this.photoUrl.set(URL.createObjectURL(photo));
    this.preparingPhoto.set(false);
    if (this.attempted) {
      this.fieldErrors.set(this.localErrors());
    }
  }

  protected setDay(date: string): void {
    this.form.controls.foundOn.setValue(date);
  }

  protected editStorageBox(): void {
    this.storageBoxEdited = true;
  }

  protected submit(): void {
    if (this.submitting() || this.preparingPhoto()) {
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
    const value = this.form.getRawValue();
    this.submitting.set(true);
    this.foundItemApi
      .register({
        photo: this.photo()!,
        categoryId: value.categoryId,
        block: value.block.trim(),
        room: value.room.trim(),
        foundOn: value.foundOn,
        storageBox: value.storageBox.trim() || null,
        risk: value.risk || null,
        internalDescription: value.internalDescription.trim() || null,
        reservedDetails: value.reservedDetails.trim() || null,
        broughtBy: value.broughtBy.trim() || null,
      })
      .pipe(
        // O que identifica o dono vai numa chamada própria, logo depois do cadastro (RF08).
        switchMap((item) => {
          const identification = {
            name: value.identifiedName.trim() || null,
            email: value.identifiedEmail.trim() || null,
            document: value.identifiedDocument.trim() || null,
          };
          if (!identification.name && !identification.email && !identification.document) {
            return of(item);
          }
          return this.foundItemApi.identify(item.id, identification).pipe(
            catchError((error: ApiError) => {
              this.identifyError.set(error.message);
              return of(item);
            }),
          );
        }),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (item) => {
          this.registered.set(item);
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

  /** Próximo objeto: mantém local, data e caixa; limpa foto, categoria e detalhes. */
  protected registerAnother(): void {
    this.attempted = false;
    this.revokePhotoUrl();
    this.photo.set(null);
    this.form.patchValue({
      categoryId: '',
      risk: '',
      internalDescription: '',
      reservedDetails: '',
      broughtBy: '',
      identifiedName: '',
      identifiedEmail: '',
      identifiedDocument: '',
    });
    this.fieldErrors.set({});
    this.error.set(null);
    this.registered.set(null);
    this.identifyError.set(null);
    this.focus('#photo');
  }

  protected fieldError(field: string): string | null {
    return this.fieldErrors()[field] ?? null;
  }

  protected describedBy(field: string, hint?: string): string | null {
    const ids = [hint, this.fieldError(field) ? `${field}-error` : null].filter(Boolean);
    return ids.length > 0 ? ids.join(' ') : null;
  }

  private suggestStorageBox(date: string): void {
    if (this.storageBoxEdited || !date) {
      return;
    }
    this.foundItemApi.suggestStorageBox(date).subscribe({
      next: (box) => {
        if (!this.storageBoxEdited) {
          this.form.controls.storageBox.setValue(box, { emitEvent: false });
        }
      },
      // Sem sugestão, o campo fica vazio e o back-end usa a caixa do mês.
      error: () => {},
    });
  }

  /** As mesmas mensagens do back-end, para a pessoa corrigir antes de enviar. */
  private localErrors(): Record<string, string> {
    const value = this.form.getRawValue();
    const errors: Record<string, string> = {};
    if (!this.photo()) {
      errors['photo'] = 'Envie a foto do objeto.';
    }
    if (!value.categoryId) {
      errors['categoryId'] = 'Escolha a categoria.';
    }
    if (!value.block.trim()) {
      errors['block'] = 'Informe o bloco.';
    }
    if (!value.room.trim()) {
      errors['room'] = 'Informe a sala.';
    }
    if (!value.foundOn) {
      errors['foundOn'] = 'Informe a data em que o objeto foi achado.';
    } else if (value.foundOn > this.today) {
      errors['foundOn'] = 'A data não pode estar no futuro.';
    }
    if (value.internalDescription.length > MAX_TEXT_LENGTH) {
      errors['internalDescription'] = 'A descrição pode ter no máximo 500 caracteres.';
    }
    if (value.reservedDetails.length > MAX_TEXT_LENGTH) {
      errors['reservedDetails'] = 'Os detalhes podem ter no máximo 500 caracteres.';
    }
    return errors;
  }

  private revokePhotoUrl(): void {
    const url = this.photoUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.photoUrl.set(null);
    }
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
