import { fakeToken } from '../../../testing/fake-token';
import { readTokenClaims } from './jwt';

describe('readTokenClaims', () => {
  it('lê a conta, o perfil e a expiração do token', () => {
    const claims = readTokenClaims(
      fakeToken({ role: 'STAFF', email: 'joão.teste@ucsal.edu.br', exp: 2_000_000_000 }),
    );

    expect(claims).toMatchObject({
      role: 'STAFF',
      email: 'joão.teste@ucsal.edu.br',
      exp: 2_000_000_000,
    });
  });

  it.each(['', 'sem-pontos', 'a.!!!.c', 'a.e30.c'])('recusa o token malformado "%s"', (token) => {
    expect(readTokenClaims(token)).toBeNull();
  });

  it('recusa um perfil desconhecido', () => {
    const token = fakeToken().replace(/^([^.]+)\.([^.]+)/, (_match, header: string) => {
      const payload = btoa(
        JSON.stringify({ sub: '1', email: 'a@ucsal.edu.br', role: 'ROOT', exp: 1 }),
      );
      return `${header}.${payload.replace(/=+$/, '')}`;
    });

    expect(readTokenClaims(token)).toBeNull();
  });
});
