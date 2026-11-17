import { isRole, Role } from './role';

/** O que o front usa do token de acesso emitido pelo back-end (TokenClaims). */
export interface TokenClaims {
  /** Id da conta. */
  sub: string;
  email: string;
  role: Role;
  /** Expiração, em segundos desde 1970 (claim padrão `exp`). */
  exp: number;
}

/**
 * Lê o conteúdo do token. O front não confere a assinatura (não tem a chave): usa o perfil e a expiração só para
 * decidir o que mostrar. Quem garante o acesso é o back-end, que confere o token em toda requisição.
 *
 * @returns `null` se o token estiver malformado ou sem as claims esperadas
 */
export function readTokenClaims(token: string): TokenClaims | null {
  const payload = token.split('.')[1];
  if (!payload) {
    return null;
  }
  try {
    const claims = JSON.parse(decodeBase64Url(payload)) as Partial<TokenClaims>;
    const valid =
      typeof claims.sub === 'string' &&
      typeof claims.email === 'string' &&
      isRole(claims.role) &&
      typeof claims.exp === 'number';
    return valid ? (claims as TokenClaims) : null;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
