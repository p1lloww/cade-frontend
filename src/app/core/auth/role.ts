/** Perfis de conta (RF02), com os mesmos nomes do enum Role do back-end. Visitante não tem conta. */
export type Role = 'STUDENT' | 'STAFF' | 'ADMIN';

const ROLES: readonly Role[] = ['STUDENT', 'STAFF', 'ADMIN'];

export function isRole(value: unknown): value is Role {
  return ROLES.includes(value as Role);
}

/** Página inicial de cada perfil, para onde a pessoa vai depois de entrar. */
export function homeFor(role: Role): string {
  switch (role) {
    case 'STUDENT':
      return '/student';
    case 'STAFF':
      return '/staff';
    case 'ADMIN':
      return '/admin';
  }
}

/** Diz se o endereço fica numa área que exige login (a de algum perfil). */
export function isProtectedUrl(url: string): boolean {
  const path = url.split(/[?#]/)[0];
  return ROLES.map(homeFor).some((home) => path === home || path.startsWith(`${home}/`));
}
