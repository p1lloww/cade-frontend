import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fakeToken } from '../testing/fake-token';
import { App } from './app';
import { routes } from './app.routes';
import { Role } from './core/auth/role';
import { Session } from './core/auth/session';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding()), provideHttpClient()],
    });
  });

  it('mostra o cabeçalho, o atalho para o conteúdo e o botão de entrar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('.header__brand')?.textContent).toContain('Cadê?');
    expect(page.querySelector('.skip-link')?.getAttribute('href')).toBe('#content');
    expect(page.querySelector('.header__action')?.textContent).toContain('Entrar');
  });

  it('mostra o e-mail de quem entrou e sai da conta', async () => {
    TestBed.inject(Session).start(fakeToken({ email: 'estudante.teste@ucsal.edu.br' }));
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('.header__email')?.textContent).toBe('estudante.teste@ucsal.edu.br');

    page.querySelector<HTMLButtonElement>('.header__action')!.click();
    await fixture.whenStable();

    expect(TestBed.inject(Session).user()).toBeNull();
    expect(page.querySelector('.header__email')).toBeNull();
  });

  it.each<[string, string, Role | null]>([
    ['/', 'Perdeu alguma coisa na UCSal?', null],
    ['/login', 'Entrar', null],
    ['/student', 'Área do estudante', 'STUDENT'],
    ['/staff', 'Área da sala', 'STAFF'],
    ['/admin', 'Administração', 'ADMIN'],
    ['/nao-existe', 'Página não encontrada', null],
  ])('carrega %s sob demanda', async (url, heading, role) => {
    if (role) {
      TestBed.inject(Session).start(fakeToken({ role }));
    }
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe(heading);
  });
});
