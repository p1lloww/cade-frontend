import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  it('mostra o cabeçalho e o atalho para o conteúdo', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('.header__brand')?.textContent).toContain('Cadê?');
    expect(page.querySelector('.skip-link')?.getAttribute('href')).toBe('#content');
  });

  it.each([
    ['/', 'Perdeu alguma coisa na UCSal?'],
    ['/student', 'Área do estudante'],
    ['/staff', 'Área da sala'],
    ['/admin', 'Administração'],
    ['/nao-existe', 'Página não encontrada'],
  ])('carrega a área de %s sob demanda', async (url, heading) => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe(heading);
  });
});
