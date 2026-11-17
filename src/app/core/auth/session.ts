import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { readTokenClaims, TokenClaims } from './jwt';
import { isProtectedUrl } from './role';

const STORAGE_KEY = 'cade.accessToken';

/**
 * Sessão de quem entrou: guarda o token de acesso e expõe o perfil e o e-mail da conta. Sem cookie (D09): o token
 * fica no localStorage, para a pessoa continuar logada ao recarregar a página, e vai no header Authorization.
 *
 * Quando o token vence, a sessão acaba sozinha e a pessoa volta ao login.
 */
@Injectable({ providedIn: 'root' })
export class Session {
  private readonly router = inject(Router);
  private readonly state = signal<{ token: string; claims: TokenClaims } | null>(null);
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;

  /** Conta logada, ou `null`. */
  readonly user = computed(() => {
    const claims = this.state()?.claims;
    return claims ? { id: claims.sub, email: claims.email, role: claims.role } : null;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.expiryTimer));
    const stored = readStorage();
    if (stored && !this.start(stored)) {
      writeStorage(null);
    }
  }

  /** Token a enviar no header Authorization, ou `null` se não há sessão válida. */
  token(): string | null {
    return this.isActive() ? this.state()!.token : null;
  }

  /** Há sessão e o token ainda não venceu. */
  isActive(): boolean {
    const claims = this.state()?.claims;
    return !!claims && claims.exp * 1000 > Date.now();
  }

  /**
   * Começa a sessão com o token recebido no login.
   *
   * @returns `false` se o token for inválido ou já tiver vencido
   */
  start(token: string): boolean {
    const claims = readTokenClaims(token);
    if (!claims || claims.exp * 1000 <= Date.now()) {
      return false;
    }
    this.state.set({ token, claims });
    writeStorage(token);
    clearTimeout(this.expiryTimer);
    this.expiryTimer = setTimeout(() => this.expire(), claims.exp * 1000 - Date.now());
    return true;
  }

  /** Sai da conta, por pedido da pessoa. */
  end(): void {
    clearTimeout(this.expiryTimer);
    this.state.set(null);
    writeStorage(null);
  }

  /**
   * Encerra a sessão vencida ou recusada pelo back-end. Se a pessoa estiver numa área que exige login, leva ao
   * login, guardando a página atual para voltar a ela depois de entrar.
   */
  expire(): void {
    if (!this.state()) {
      return;
    }
    this.end();
    const currentUrl = this.router.url;
    if (isProtectedUrl(currentUrl)) {
      void this.router.navigate(['/login'], {
        queryParams: { reason: 'expired', returnUrl: currentUrl },
      });
    }
  }
}

// O localStorage pode não existir ou estar bloqueado (navegação privada em alguns navegadores); sem ele, a sessão
// só dura até recarregar a página.

function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEY, token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // segue sem guardar
  }
}
