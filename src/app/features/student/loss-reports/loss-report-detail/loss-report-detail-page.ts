import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin, Observable } from 'rxjs';
import { ApiError } from '../../../../core/api/api-error';
import { ErrorMessage } from '../../../../shared/error-message/error-message';
import { formatDate, formatPeriod } from '../../../../shared/format/dates';
import { ApiPhoto } from '../../../../shared/photo/api-photo';
import { shrinkPhoto } from '../../../../shared/photo/shrink-photo';
import { EDITABLE_STATUSES, LossReport, LossReportStatus, StudentSummons } from '../loss-report';
import { LossReportApi } from '../loss-report-api';

const FINAL_STATUSES: readonly LossReportStatus[] = [
  'COMPLETED',
  'EXPIRED',
  'CANCELLED',
  'REFUSED',
];
const MAX_ANSWER_LENGTH = 1000;

const TAG_BY_STATUS: Readonly<Record<LossReportStatus, string>> = {
  OPEN: 'tag--info',
  AWAITING_INFO: 'tag--warning',
  SUMMONED: 'tag--highlight',
  COMPLETED: 'tag--success',
  EXPIRED: 'tag--neutral',
  CANCELLED: 'tag--neutral',
  REFUSED: 'tag--neutral',
};

/**
 * Detalhe de um registro de perda do estudante, aberto a partir de "Meus registros": responder ao pedido de mais
 * informações (RF18), anexar prova (RF15), renovar (RN14) e cancelar, o "já achei" (RF17). Cada ação aparece só
 * na situação em que o back-end a aceita; a regra continua lá.
 */
@Component({
  selector: 'app-loss-report-detail-page',
  host: { class: 'page' },
  imports: [ReactiveFormsModule, RouterLink, ErrorMessage, ApiPhoto],
  templateUrl: './loss-report-detail-page.html',
  styleUrl: './loss-report-detail-page.scss',
})
export default class LossReportDetailPage {
  private readonly lossReportApi = inject(LossReportApi);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Id do registro, da rota. */
  readonly id = input.required<string>();

  protected readonly formatDate = formatDate;
  protected readonly formatPeriod = formatPeriod;
  protected readonly maxAnswerLength = MAX_ANSWER_LENGTH;

  protected readonly state = signal<'loading' | 'ready' | 'missing' | 'error'>('loading');
  protected readonly loadError = signal<ApiError | null>(null);
  protected readonly report = signal<LossReport | null>(null);
  protected readonly summons = signal<StudentSummons | null>(null);

  protected readonly answer = new FormControl('', { nonNullable: true });
  protected readonly serialNumber = new FormControl('', { nonNullable: true });
  protected readonly proofPhoto = signal<Blob | null>(null);
  protected readonly proofPhotoUrl = signal<string | null>(null);
  protected readonly confirmingCancel = signal(false);

  /** Ação em andamento, para travar os botões e mostrar "Enviando…" só no lugar certo. */
  protected readonly busy = signal<'answer' | 'proof' | 'renew' | 'cancel' | null>(null);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly fieldErrors = signal<Readonly<Record<string, string>>>({});
  protected readonly notice = signal<string | null>(null);

  protected readonly canEdit = computed(() => {
    const status = this.report()?.status;
    return !!status && EDITABLE_STATUSES.includes(status);
  });
  protected readonly canAttachProof = computed(() => {
    const status = this.report()?.status;
    return !!status && !FINAL_STATUSES.includes(status);
  });
  protected readonly tagClass = computed(() => {
    const status = this.report()?.status;
    return status ? TAG_BY_STATUS[status] : '';
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.releasePhoto());
    effect(() => this.load(this.id()));
  }

  protected load(id = this.id()): void {
    this.state.set('loading');
    forkJoin([this.lossReportApi.mine(), this.lossReportApi.mySummons()]).subscribe({
      next: ([reports, summons]) => {
        const report = reports.find((r) => r.id === id);
        this.report.set(report ?? null);
        this.summons.set(summons.find((s) => s.lossReportId === id) ?? null);
        this.state.set(report ? 'ready' : 'missing');
      },
      error: (error: ApiError) => {
        this.loadError.set(error);
        this.state.set('error');
      },
    });
  }

  protected sendAnswer(): void {
    const text = this.answer.value.trim();
    if (!text) {
      this.fieldErrors.set({ answer: 'Escreva a resposta.' });
      this.focus('#answer');
      return;
    }
    this.run(
      'answer',
      this.lossReportApi.answer(this.id(), text),
      'Resposta enviada. A sala vai conferir de novo.',
      () => this.answer.reset(),
    );
  }

  protected async choosePhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    const photo = await shrinkPhoto(file);
    this.releasePhoto();
    this.proofPhoto.set(photo);
    this.proofPhotoUrl.set(URL.createObjectURL(photo));
  }

  protected sendProof(): void {
    const serialNumber = this.serialNumber.value.trim() || null;
    if (!this.proofPhoto() && !serialNumber) {
      this.fieldErrors.set({ proof: 'Escolha uma foto ou informe o número de série.' });
      return;
    }
    this.run(
      'proof',
      this.lossReportApi.attachProof(this.id(), { photo: this.proofPhoto(), serialNumber }),
      'Prova salva. Só você e a equipe da sala veem.',
      () => {
        this.releasePhoto();
        this.proofPhoto.set(null);
        this.serialNumber.reset();
      },
    );
  }

  protected renew(): void {
    this.run('renew', this.lossReportApi.renew(this.id()), 'Registro renovado por mais 30 dias.');
  }

  protected confirmCancel(): void {
    this.run(
      'cancel',
      this.lossReportApi.cancel(this.id()),
      'Registro cancelado. Que bom que você achou!',
      () => this.confirmingCancel.set(false),
    );
  }

  private run(
    action: 'answer' | 'proof' | 'renew' | 'cancel',
    request: Observable<LossReport>,
    message: string,
    after?: () => void,
  ): void {
    if (this.busy()) {
      return;
    }
    this.busy.set(action);
    this.error.set(null);
    this.fieldErrors.set({});
    this.notice.set(null);
    request.pipe(finalize(() => this.busy.set(null))).subscribe({
      next: (report) => {
        this.report.set(report);
        this.notice.set(message);
        after?.();
        this.focus('#notice');
      },
      error: (error: ApiError) => {
        this.error.set(error);
        this.fieldErrors.set(error.fieldErrors);
        this.focus('[role="alert"]');
      },
    });
  }

  private releasePhoto(): void {
    const url = this.proofPhotoUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.proofPhotoUrl.set(null);
    }
  }

  private focus(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
}
