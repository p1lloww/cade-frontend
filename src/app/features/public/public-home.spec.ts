import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import PublicHome from './public-home';

describe('PublicHome', () => {
  let fixture: ComponentFixture<PublicHome>;
  let page: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PublicHome);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  async function counts(months: unknown[]): Promise<void> {
    http.expectOne('/api/public/found-item-counts').flush({ months });
    await fixture.whenStable();
  }

  it('mostra onde fica a sala e o horário', async () => {
    await counts([]);
    const info = page.querySelector('aside')?.textContent ?? '';
    expect(info).toContain('Perto da Administração da UCSal');
    expect(info).toContain('7h às 21h50');
    expect(info).toContain('De segunda a sexta');
  });

  it('explica como funciona em três passos', async () => {
    await counts([]);
    const steps = [...page.querySelectorAll('.how ol li h3')].map((h) => h.textContent);
    expect(steps).toEqual(['Registre o que perdeu', 'A equipe compara', 'Você busca no balcão']);
  });

  it('leva o botão "Registrar perda" para o registro, que pede o login', async () => {
    await counts([]);
    const link = [...page.querySelectorAll('a')].find((a) =>
      a.textContent?.includes('Registrar perda'),
    );
    expect(link?.getAttribute('href')).toBe('/student/losses/new');
  });

  it('mostra as contagens por mês e categoria, sem nada além de números', async () => {
    await counts([
      {
        month: '2026-11',
        label: 'Novembro/2026',
        total: 4,
        categories: [
          { category: 'Garrafa', count: 3 },
          { category: 'Fone', count: 1 },
        ],
      },
    ]);

    const month = page.querySelector('.month')!;
    expect(month.querySelector('.month__name')?.textContent?.trim()).toBe('Novembro de 2026');
    expect(month.querySelector('.month__total')?.textContent?.trim()).toBe('4 objetos');
    expect(
      [...month.querySelectorAll('.month__categories li')].map((li) => li.textContent?.trim()),
    ).toEqual(['Garrafa 3', 'Fone 1']);
  });

  it('esconde as contagens quando não há objetos ou a chamada falha', async () => {
    http
      .expectOne('/api/public/found-item-counts')
      .flush(null, { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect(page.querySelector('.counts')).toBeNull();
    expect(page.querySelector('a[href="/cartaz"]')).not.toBeNull();
  });
});
