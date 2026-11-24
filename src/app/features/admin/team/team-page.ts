import { afterNextRender, Component, ElementRef, inject, Injector, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiError } from '../../../core/api/api-error';
import { ErrorMessage } from '../../../shared/error-message/error-message';
import { Account, ROLE_LABELS } from './account';
import { AccountApi } from './account-api';

/** Mudança de perfil aberta para escrever o motivo e confirmar. */
interface PendingChange {
  account: Account;
  role: 'STAFF' | 'STUDENT';
}

/**
 * Equipe da sala (RF03): o administrador vê quem é funcionário, retira o perfil (com confirmação) e dá o perfil a
 * uma conta achada pelo e-mail. A conta precisa existir, ou seja, a pessoa já entrou uma vez. Toda mudança pede o
 * motivo, que vai para o histórico, e vale a partir do próximo login da pessoa.
 */
@Component({
  selector: 'app-team-page',
  host: { class: 'page' },
  imports: [ReactiveFormsModule, RouterLink, NgTemplateOutlet, ErrorMessage],
  templateUrl: './team-page.html',
  styleUrl: './team-page.scss',
})
export default class TeamPage {
  private readonly accountApi = inject(AccountApi);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly roleLabels = ROLE_LABELS;

  protected readonly staff = signal<Account[]>([]);
  protected readonly staffState = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly staffError = signal<ApiError | null>(null);

  protected readonly email = new FormControl('', { nonNullable: true });
  protected readonly results = signal<Account[] | null>(null);
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);

  protected readonly pending = signal<PendingChange | null>(null);
  protected readonly reason = new FormControl('', { nonNullable: true });
  protected readonly reasonError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly notice = signal<string | null>(null);

  constructor() {
    this.loadStaff();
  }

  protected loadStaff(): void {
    this.staffState.set('loading');
    this.accountApi.search({ role: 'STAFF' }).subscribe({
      next: (accounts) => {
        this.staff.set(accounts);
        this.staffState.set('ready');
      },
      error: (error: ApiError) => {
        this.staffError.set(error);
        this.staffState.set('error');
      },
    });
  }

  protected search(): void {
    const email = this.email.value.trim();
    if (email.length < 3) {
      this.searchError.set('Digite pelo menos 3 letras do e-mail.');
      return;
    }
    this.searchError.set(null);
    this.searching.set(true);
    this.accountApi
      .search({ email })
      .pipe(finalize(() => this.searching.set(false)))
      .subscribe({
        next: (accounts) => this.results.set(accounts),
        error: (error: ApiError) => this.searchError.set(error.message),
      });
  }

  protected open(account: Account, role: 'STAFF' | 'STUDENT'): void {
    this.pending.set({ account, role });
    this.reason.reset();
    this.reasonError.set(null);
    this.error.set(null);
    this.notice.set(null);
    this.focus('#reason');
  }

  protected cancel(): void {
    this.pending.set(null);
  }

  protected isPending(account: Account): boolean {
    return this.pending()?.account.id === account.id;
  }

  protected confirm(): void {
    const change = this.pending();
    if (!change || this.saving()) {
      return;
    }
    const reason = this.reason.value.trim();
    if (!reason) {
      this.reasonError.set('Informe o motivo.');
      this.focus('#reason');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.accountApi
      .changeRole(change.account.id, change.role, reason)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (account) => {
          this.pending.set(null);
          this.notice.set(
            account.role === 'STAFF'
              ? `${account.email} agora é funcionário. Vale a partir do próximo login.`
              : `${account.email} não é mais funcionário. Vale a partir do próximo login.`,
          );
          this.results.update(
            (list) => list?.map((a) => (a.id === account.id ? account : a)) ?? null,
          );
          this.loadStaff();
          this.focus('#notice');
        },
        error: (error: ApiError) => {
          this.error.set(error);
          this.reasonError.set(error.fieldErrors['reason'] ?? null);
        },
      });
  }

  private focus(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
}
