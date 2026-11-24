import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin, Observable } from 'rxjs';
import { ApiError } from '../../../../core/api/api-error';
import {
  allowedRisks,
  Category,
  RISK_LABELS,
  RISK_LEVELS,
  RiskLevel,
} from '../../../../shared/categories/category';
import { CategoryApi } from '../../../../shared/categories/category-api';
import { ErrorMessage } from '../../../../shared/error-message/error-message';
import { recentDays } from '../../../../shared/format/dates';
import { ApiPhoto } from '../../../../shared/photo/api-photo';
import { FoundItem, FoundItemStatus, STATUS_TAG } from '../found-item';
import { FoundItemApi } from '../found-item-api';

/** Só objeto Disponível ou Não reclamado tem os dados corrigidos (RF11). */
const CORRECTABLE: readonly FoundItemStatus[] = ['AVAILABLE', 'UNCLAIMED'];
/** Enquanto o objeto não saiu da sala, dá para marcar quem é o dono (RF08). */
const IDENTIFIABLE: readonly FoundItemStatus[] = ['AVAILABLE', 'RESERVED', 'UNCLAIMED'];

type Section = 'data' | 'broughtBy' | 'identification';

/**
 * Edição de um objeto, aberta pela busca e pela página do objeto: correção dos dados com motivo (RF11), quem trouxe
 * (RF07) e objeto identificado (RF08). Cada bloco salva sozinho e mostra o próprio resultado.
 */
@Component({
  selector: 'app-edit-found-item-page',
  host: { class: 'page' },
  imports: [ReactiveFormsModule, RouterLink, ErrorMessage, ApiPhoto],
  templateUrl: './edit-found-item-page.html',
  styleUrl: './edit-found-item-page.scss',
})
export default class EditFoundItemPage {
  private readonly foundItemApi = inject(FoundItemApi);
  private readonly categoryApi = inject(CategoryApi);

  /** Id do objeto, da rota. */
  readonly id = input.required<string>();

  protected readonly today = recentDays().today;
  protected readonly statusTag = STATUS_TAG;
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly loadError = signal<ApiError | null>(null);
  protected readonly item = signal<FoundItem | null>(null);
  protected readonly categories = signal<Category[]>([]);

  protected readonly data = new FormGroup({
    categoryId: new FormControl('', { nonNullable: true }),
    block: new FormControl('', { nonNullable: true }),
    room: new FormControl('', { nonNullable: true }),
    foundOn: new FormControl('', { nonNullable: true }),
    storageBox: new FormControl('', { nonNullable: true }),
    risk: new FormControl<RiskLevel | ''>('', { nonNullable: true }),
    internalDescription: new FormControl('', { nonNullable: true }),
    reservedDetails: new FormControl('', { nonNullable: true }),
    reason: new FormControl('', { nonNullable: true }),
  });
  protected readonly broughtBy = new FormControl('', { nonNullable: true });
  protected readonly identification = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true }),
    document: new FormControl('', { nonNullable: true }),
  });

  protected readonly busy = signal<Section | 'clear' | null>(null);
  /** Erro e aviso de cada bloco, para aparecerem junto do botão que foi usado. */
  protected readonly errors = signal<Partial<Record<Section, ApiError>>>({});
  protected readonly fieldErrors = signal<Readonly<Record<string, string>>>({});
  protected readonly notices = signal<Partial<Record<Section, string>>>({});

  private readonly categoryId = toSignal(this.data.controls.categoryId.valueChanges, {
    initialValue: '',
  });
  protected readonly canCorrect = computed(() => {
    const status = this.item()?.status;
    return !!status && CORRECTABLE.includes(status);
  });
  protected readonly canIdentify = computed(() => {
    const status = this.item()?.status;
    return !!status && IDENTIFIABLE.includes(status);
  });
  /** O risco nunca fica abaixo do padrão da categoria escolhida (RN04). */
  protected readonly riskOptions = computed(() => {
    const category = this.categories().find(({ id }) => id === this.categoryId());
    return (category ? allowedRisks(category.defaultRisk) : RISK_LEVELS).map((level) => ({
      level,
      label: RISK_LABELS[level],
    }));
  });

  constructor() {
    effect(() => this.load(this.id()));
  }

  protected load(id = this.id()): void {
    this.state.set('loading');
    forkJoin([this.foundItemApi.find(id), this.categoryApi.list()]).subscribe({
      next: ([item, categories]) => {
        this.categories.set(categories);
        this.fill(item);
        this.state.set('ready');
      },
      error: (error: ApiError) => {
        this.loadError.set(error);
        this.state.set('error');
      },
    });
  }

  protected saveData(): void {
    const value = this.data.getRawValue();
    const local: Record<string, string> = {};
    if (!value.block.trim()) local['block'] = 'Informe o bloco.';
    if (!value.room.trim()) local['room'] = 'Informe a sala.';
    if (!value.foundOn) local['foundOn'] = 'Informe a data em que o objeto foi achado.';
    if (!value.reason.trim()) local['reason'] = 'Informe o motivo da correção.';
    if (Object.keys(local).length > 0) {
      this.fieldErrors.set(local);
      return;
    }
    this.run(
      'data',
      this.foundItemApi.update(this.id(), {
        categoryId: value.categoryId,
        block: value.block.trim(),
        room: value.room.trim(),
        foundOn: value.foundOn,
        storageBox: value.storageBox.trim() || null,
        risk: value.risk || null,
        internalDescription: value.internalDescription.trim() || null,
        reservedDetails: value.reservedDetails.trim() || null,
        reason: value.reason.trim(),
        version: this.item()!.version,
      }),
      'Dados corrigidos. A correção ficou no histórico com o motivo.',
    );
  }

  protected saveBroughtBy(): void {
    const broughtBy = this.broughtBy.value.trim() || null;
    this.run(
      'broughtBy',
      this.foundItemApi.recordBroughtBy(this.id(), broughtBy),
      broughtBy ? 'Quem trouxe ficou registrado.' : 'Quem trouxe foi apagado.',
    );
  }

  protected saveIdentification(): void {
    const value = this.identification.getRawValue();
    const identification = {
      name: value.name.trim() || null,
      email: value.email.trim() || null,
      document: value.document.trim() || null,
    };
    if (!identification.name && !identification.email && !identification.document) {
      this.fieldErrors.set({ identification: 'Informe o nome, o e-mail ou o documento.' });
      return;
    }
    this.run(
      'identification',
      this.foundItemApi.identify(this.id(), identification),
      'Objeto marcado como identificado.',
    );
  }

  protected clearIdentification(): void {
    this.run(
      'identification',
      this.foundItemApi.clearIdentification(this.id()),
      'O objeto não está mais marcado como identificado.',
      'clear',
    );
  }

  private run(
    section: Section,
    request: Observable<FoundItem>,
    message: string,
    busy: Section | 'clear' = section,
  ): void {
    if (this.busy()) {
      return;
    }
    this.busy.set(busy);
    this.errors.set({});
    this.notices.set({});
    this.fieldErrors.set({});
    request.pipe(finalize(() => this.busy.set(null))).subscribe({
      next: (item) => {
        this.fill(item);
        this.notices.set({ [section]: message });
      },
      error: (error: ApiError) => {
        this.errors.set({ [section]: error });
        this.fieldErrors.set(error.fieldErrors);
      },
    });
  }

  /** Põe o objeto nos três formulários; o motivo da correção sempre recomeça vazio. */
  private fill(item: FoundItem): void {
    this.item.set(item);
    this.data.setValue({
      categoryId: item.categoryId,
      block: item.block,
      room: item.room,
      foundOn: item.foundOn,
      storageBox: item.storageBox,
      risk: item.risk,
      internalDescription: item.internalDescription ?? '',
      reservedDetails: item.reservedDetails ?? '',
      reason: '',
    });
    this.broughtBy.setValue(item.broughtBy ?? '');
    this.identification.setValue({
      name: item.identifiedName ?? '',
      email: item.identifiedEmail ?? '',
      document: item.identifiedDocument ?? '',
    });
  }
}
