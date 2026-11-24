import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiClient } from '../../../core/api/api-client';
import { ApiError } from '../../../core/api/api-error';
import { ErrorMessage } from '../../../shared/error-message/error-message';

interface Dashboard {
  byStatusAndCategory: { status: string; statusLabel: string; category: string; total: number }[];
  byStatus: { status: string; statusLabel: string; total: number }[];
  unclaimed: number;
  returnsThisMonth: number;
  /** Dias, da entrada na sala até a devolução; nulo se ainda não houve devolução. */
  averageDaysToReturn: number | null;
  generatedAt: string;
}

/** Ordem fixa das situações, a mesma do ciclo de vida do objeto. */
const STATUS_ORDER = ['AVAILABLE', 'RESERVED', 'RETURNED', 'UNCLAIMED', 'DISPOSED'];

/**
 * Painel do administrador (RF46): devoluções no mês, tempo médio até a devolução, não reclamados e os objetos por
 * situação e categoria. Todo número aparece escrito; as barras só reforçam (RNF10), e a tabela é a leitura completa.
 */
@Component({
  selector: 'app-dashboard-page',
  host: { class: 'page page--wide' },
  imports: [RouterLink, ErrorMessage],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export default class DashboardPage {
  private readonly api = inject(ApiClient);

  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal<ApiError | null>(null);
  protected readonly data = signal<Dashboard | null>(null);

  protected readonly total = computed(
    () => this.data()?.byStatus.reduce((sum, row) => sum + row.total, 0) ?? 0,
  );
  protected readonly statuses = computed(() =>
    [...(this.data()?.byStatus ?? [])].sort(
      (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
    ),
  );
  /** A maior barra ocupa a largura toda; as outras, na proporção. */
  protected readonly maxStatus = computed(() =>
    Math.max(1, ...this.statuses().map((row) => row.total)),
  );

  /** Tabela categoria × situação, só com as situações que têm algum objeto. */
  protected readonly table = computed(() => {
    const rows = this.data()?.byStatusAndCategory ?? [];
    const columns = this.statuses();
    const categories = [...new Set(rows.map((row) => row.category))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    );
    return {
      columns,
      rows: categories.map((category) => {
        const cells = columns.map(
          (column) =>
            rows.find((row) => row.category === category && row.status === column.status)?.total ??
            0,
        );
        return { category, cells, total: cells.reduce((sum, value) => sum + value, 0) };
      }),
    };
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.api.get<Dashboard>('/dashboard').subscribe({
      next: (data) => {
        this.data.set(data);
        this.state.set('ready');
      },
      error: (error: ApiError) => {
        this.error.set(error);
        this.state.set('error');
      },
    });
  }

  /** Dias com no máximo uma casa decimal, com vírgula: "6,5". */
  protected days(value: number): string {
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  }

  protected updatedAt(value: string): string {
    return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
}
