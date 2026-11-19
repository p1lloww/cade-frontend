import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fakeToken } from '../../../testing/fake-token';
import { guestGuard, roleGuard } from './auth-guards';
import { Role } from './role';
import { Session } from './session';

@Component({ template: '' })
class Blank {}

describe('guardas de rota', () => {
  let harness: RouterTestingHarness;
  let session: Session;

  beforeEach(async () => {
    localStorage.clear();
    const staffOrAdmin = roleGuard('STAFF', 'ADMIN');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', canActivate: [guestGuard], component: Blank },
          { path: 'student', canActivate: [roleGuard('STUDENT')], component: Blank },
          {
            path: 'staff',
            canActivate: [staffOrAdmin],
            canActivateChild: [staffOrAdmin],
            children: [
              { path: '', component: Blank },
              { path: 'items', component: Blank },
            ],
          },
          { path: 'admin', canActivate: [roleGuard('ADMIN')], component: Blank },
        ]),
      ],
    });
    session = TestBed.inject(Session);
    harness = await RouterTestingHarness.create();
  });

  function signIn(role: Role, exp?: number): void {
    session.start(fakeToken({ role, exp }));
  }

  const url = () => TestBed.inject(Router).url;

  it('sem login, leva ao login guardando a página pedida', async () => {
    await harness.navigateByUrl('/staff/items');

    expect(url()).toBe('/login?returnUrl=%2Fstaff%2Fitems');
  });

  it.each<[Role, string]>([
    ['STUDENT', '/student'],
    ['STAFF', '/staff'],
    ['ADMIN', '/admin'],
    ['ADMIN', '/staff'],
  ])('libera para %s a área %s', async (role, area) => {
    signIn(role);

    await harness.navigateByUrl(area);

    expect(url()).toBe(area);
  });

  it.each<[Role, string, string]>([
    ['STUDENT', '/staff', '/student'],
    ['STUDENT', '/admin', '/student'],
    ['STAFF', '/admin', '/staff'],
    ['STAFF', '/student', '/staff'],
    ['ADMIN', '/student', '/admin'],
  ])('leva %s de %s para a própria área (%s)', async (role, area, home) => {
    signIn(role);

    await harness.navigateByUrl(area);

    expect(url()).toBe(home);
  });

  it('com o token vencido, encerra a sessão e avisa no login', async () => {
    signIn('STAFF');
    await harness.navigateByUrl('/staff');
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 2 * 3600 * 1000);

    await harness.navigateByUrl('/staff/items');

    expect(url()).toBe('/login?returnUrl=%2Fstaff%2Fitems&reason=expired');
    expect(session.user()).toBeNull();
    vi.restoreAllMocks();
  });

  it('quem já entrou não vê o login de novo', async () => {
    signIn('STUDENT');

    await harness.navigateByUrl('/login');

    expect(url()).toBe('/student');
  });
});
