import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiError } from '../../../../core/api/api-error';
import { ErrorMessage } from '../../../../shared/error-message/error-message';
import { formatDate, formatPeriod } from '../../../../shared/format/dates';
import { LossReport, LossReportStatus, ONGOING_STATUSES, StudentSummons } from '../loss-report';
import { LossReportApi } from '../loss-report-api';

/** Máximo de registros em andamento por estudante (RN05); a regra é do back-end, aqui só se informa. */
const MAX_ONGOING = 5;

const TAG_BY_STATUS: Readonly<Record<LossReportStatus, string>> = {
  OPEN: 'tag--info',
  AWAITING_INFO: 'tag--warning',
  SUMMONED: 'tag--highlight',
  COMPLETED: 'tag--success',
  EXPIRED: 'tag--neutral',
  CANCELLED: 'tag--neutral',
  REFUSED: 'tag--neutral',
};

interface ReportItem {
  report: LossReport;
  /** Convocação ativa do registro, quando ele está Convocado. */
  summons: StudentSummons | null;
}

/**
 * Página inicial do estudante: os registros de perda e a situação de cada um em linguagem simples (RF16). No
 * Convocado, junta a convocação de `GET /summons/mine` pelo id do registro para dizer onde, até quando e o que
 * levar (D28). Nada de objeto achado aparece aqui (RN03).
 */
@Component({
  selector: 'app-my-loss-reports-page',
  host: { class: 'page' },
  imports: [RouterLink, NgTemplateOutlet, ErrorMessage],
  templateUrl: './my-loss-reports-page.html',
  styleUrl: './my-loss-reports-page.scss',
})
export default class MyLossReportsPage {
  private readonly lossReportApi = inject(LossReportApi);

  protected readonly maxOngoing = MAX_ONGOING;
  protected readonly formatDate = formatDate;
  protected readonly formatPeriod = formatPeriod;

  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal<ApiError | null>(null);
  private readonly items = signal<ReportItem[]>([]);

  /** Em andamento, com os convocados primeiro (são os que têm prazo). */
  protected readonly ongoing = computed(() =>
    this.items()
      .filter(({ report }) => ONGOING_STATUSES.includes(report.status))
      .sort((a, b) => Number(!!b.summons) - Number(!!a.summons)),
  );
  protected readonly closed = computed(() =>
    this.items().filter(({ report }) => !ONGOING_STATUSES.includes(report.status)),
  );

  protected readonly isEmpty = computed(() => this.items().length === 0);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.error.set(null);
    forkJoin([this.lossReportApi.mine(), this.lossReportApi.mySummons()]).subscribe({
      next: ([reports, summons]) => {
        const byReport = new Map(summons.map((s) => [s.lossReportId, s]));
        this.items.set(
          reports.map((report) => ({
            report,
            summons: report.status === 'SUMMONED' ? (byReport.get(report.id) ?? null) : null,
          })),
        );
        this.state.set('ready');
      },
      error: (error: ApiError) => {
        this.error.set(error);
        this.state.set('error');
      },
    });
  }

  protected tagClass(status: LossReportStatus): string {
    return TAG_BY_STATUS[status];
  }
}
