import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { homeFor, Role } from './role';
import { Session } from './session';

/**
 * Libera a área só para os perfis indicados (RF02). Sem sessão, ou com o token vencido, leva ao login e volta para
 * a página pedida depois de entrar; com outro perfil, leva à área do próprio perfil.
 *
 * É só conveniência para a pessoa: quem barra de verdade é o back-end, em toda requisição.
 *
 * Use em `canActivate` e `canActivateChild`, para conferir também a cada navegação dentro da área.
 */
export function roleGuard(...roles: Role[]): CanActivateFn {
  return (_route, state) => {
    const session = inject(Session);
    const router = inject(Router);
    const user = session.user();
    if (!user || !session.isActive()) {
      const reason = user ? 'expired' : null;
      session.end();
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url, reason } });
    }
    return roles.includes(user.role) ? true : router.createUrlTree([homeFor(user.role)]);
  };
}

/** Quem já entrou não precisa ver o login de novo: vai direto para a área do seu perfil. */
export const guestGuard: CanActivateFn = () => {
  const session = inject(Session);
  const user = session.user();
  return user && session.isActive() ? inject(Router).createUrlTree([homeFor(user.role)]) : true;
};
