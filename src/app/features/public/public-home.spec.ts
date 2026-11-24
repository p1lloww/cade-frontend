import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import PublicHome from './public-home';

describe('PublicHome', () => {
  let page: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(PublicHome);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('mostra onde fica a sala e o horário', () => {
    const info = page.querySelector('aside')?.textContent ?? '';
    expect(info).toContain('Perto da Administração da UCSal');
    expect(info).toContain('7h às 21h50');
    expect(info).toContain('De segunda a sexta');
  });

  it('explica como funciona em três passos', () => {
    const steps = [...page.querySelectorAll('ol li h3')].map((h) => h.textContent);
    expect(steps).toEqual(['Registre o que perdeu', 'A equipe compara', 'Você busca no balcão']);
  });

  it('leva o botão "Registrar perda" para o registro, que pede o login', () => {
    const link = [...page.querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Registrar perda'),
    );
    expect(link?.getAttribute('href')).toBe('/student/losses/new');
  });
});
