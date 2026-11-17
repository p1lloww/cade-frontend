import { Role } from '../app/core/auth/role';

/** Monta um JWT de mentira, com assinatura falsa, para os testes (o front não confere a assinatura). */
export function fakeToken(
  claims: { role?: Role; email?: string; exp?: number; sub?: string } = {},
): string {
  const payload = {
    sub: claims.sub ?? '0b7f4a52-3a3c-4d4f-9a49-2f0d5c1c1e11',
    email: claims.email ?? 'estudante.teste@ucsal.edu.br',
    role: claims.role ?? 'STUDENT',
    exp: claims.exp ?? Math.floor(Date.now() / 1000) + 3600,
  };
  return [{ alg: 'HS256' }, payload].map(encode).join('.') + '.assinatura';
}

function encode(value: object): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
