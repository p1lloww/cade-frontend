import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { fakeToken } from '../../../testing/fake-token';
import { Session } from './session';

const STORAGE_KEY = 'cade.accessToken';

describe('Session', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => vi.useRealTimers());

  it('começa a sessão e guarda o token', () => {
    const session = TestBed.inject(Session);
    const token = fakeToken({ role: 'ADMIN', email: 'admin.teste@ucsal.edu.br' });

    expect(session.start(token)).toBe(true);
    expect(session.user()).toMatchObject({ role: 'ADMIN', email: 'admin.teste@ucsal.edu.br' });
    expect(session.token()).toBe(token);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(token);
  });

  it('recupera a sessão guardada ao abrir o app', () => {
    const token = fakeToken({ role: 'STAFF' });
    localStorage.setItem(STORAGE_KEY, token);

    const session = TestBed.inject(Session);

    expect(session.isActive()).toBe(true);
    expect(session.user()?.role).toBe('STAFF');
  });

  it('descarta o token guardado que já venceu', () => {
    localStorage.setItem(STORAGE_KEY, fakeToken({ exp: Math.floor(Date.now() / 1000) - 1 }));

    const session = TestBed.inject(Session);

    expect(session.user()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('recusa token vencido ou malformado', () => {
    const session = TestBed.inject(Session);

    expect(session.start(fakeToken({ exp: Math.floor(Date.now() / 1000) - 1 }))).toBe(false);
    expect(session.start('nao-e-um-jwt')).toBe(false);
    expect(session.user()).toBeNull();
  });

  it('sai da conta e apaga o token', () => {
    const session = TestBed.inject(Session);
    session.start(fakeToken());

    session.end();

    expect(session.user()).toBeNull();
    expect(session.token()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('quando o token vence numa área protegida, volta ao login guardando a página', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const session = TestBed.inject(Session);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/student/losses');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    session.start(fakeToken({ exp: Math.floor(Date.now() / 1000) + 60 }));

    vi.advanceTimersByTime(60_000);

    expect(session.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { reason: 'expired', returnUrl: '/student/losses' },
    });
  });

  it('quando o token vence numa página pública, só encerra a sessão', () => {
    const session = TestBed.inject(Session);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/');
    const navigate = vi.spyOn(router, 'navigate');
    session.start(fakeToken());

    session.expire();

    expect(session.user()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });
});
