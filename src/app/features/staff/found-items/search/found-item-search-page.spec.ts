import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { foundItemFixture } from '../../../../../testing/found-item-fixture';
import { FoundItem } from '../found-item';
import FoundItemSearchPage from './found-item-search-page';

const OPTIONS = {
  categories: [{ id: 'c-fone', name: 'Fone' }],
  places: [{ block: 'Bloco 400', rooms: ['Sala 421', 'Sala 422'] }],
  months: ['2026-11'],
  statuses: [
    { code: 'AVAILABLE', label: 'Disponível' },
    { code: 'RESERVED', label: 'Reservado' },
  ],
};

const item = foundItemFixture;

function page(content: FoundItem[], number = 0, totalElements = content.length) {
  return {
    content,
    page: { size: 20, number, totalElements, totalPages: Math.ceil(totalElements / 20) },
  };
}

describe('FoundItemSearchPage', () => {
  let fixture: ComponentFixture<FoundItemSearchPage>;
  let element: HTMLElement;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:foto');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(FoundItemSearchPage);
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    http.match((r) => r.url.endsWith('/photo')).forEach((r) => r.flush(new Blob()));
    http.verify();
  });

  function searchRequest(): TestRequest {
    return http.expectOne((r) => r.url === '/api/found-items');
  }

  async function start(): Promise<void> {
    await fixture.whenStable();
    http.expectOne('/api/found-items/search-options').flush(OPTIONS);
  }

  it('lista com miniatura, categoria, local, data, caixa e situação escrita', async () => {
    await start();
    searchRequest().flush(
      page([item('a'), item('b', { status: 'RESERVED', statusLabel: 'Reservado' })]),
    );
    await fixture.whenStable();

    const results = element.querySelectorAll('.result');
    expect(results).toHaveLength(2);
    expect(results[0].querySelector('app-api-photo')).not.toBeNull();
    expect(results[0].textContent).toContain('Fone · Bloco 400, Sala 421');
    expect(results[0].textContent).toContain('Caixa Novembro/2026');
    expect(results[1].querySelector('.tag')?.textContent).toBe('Reservado');
    expect(element.querySelector('.count')?.textContent).toContain('2 objetos');
  });

  it('oferece o atalho de balcão só para objeto que pode sair', async () => {
    await start();
    searchRequest().flush(
      page([item('a'), item('b', { status: 'RESERVED', statusLabel: 'Reservado' })]),
    );
    await fixture.whenStable();

    const links = [...element.querySelectorAll('.result')].map((r) =>
      [...r.querySelectorAll('.result__links a')].map((a) => a.textContent?.trim()),
    );
    expect(links).toEqual([
      ['Ver sugestões', 'Editar', 'Entregar sem registro'],
      ['Ver sugestões', 'Editar'],
    ]);
  });

  it('busca com os filtros do endereço, sem mandar os vazios', async () => {
    fixture.componentRef.setInput('q', 'fone preto');
    fixture.componentRef.setInput('block', 'Bloco 400');
    fixture.componentRef.setInput('status', ['AVAILABLE', 'RESERVED']);
    await start();

    const request = searchRequest();
    expect(request.request.params.get('q')).toBe('fone preto');
    expect(request.request.params.get('block')).toBe('Bloco 400');
    expect(request.request.params.getAll('status')).toEqual(['AVAILABLE', 'RESERVED']);
    expect(request.request.params.has('categoryId')).toBe(false);
    request.flush(page([]));
    await fixture.whenStable();

    expect(element.querySelector<HTMLInputElement>('#q')?.value).toBe('fone preto');
    expect(element.querySelector('details')?.hasAttribute('open')).toBe(true);
    expect(element.querySelector('.empty')?.textContent).toContain('Nenhum objeto encontrado');
  });

  it('leva o texto digitado para o endereço', async () => {
    await start();
    searchRequest().flush(page([]));
    await fixture.whenStable();

    const input = element.querySelector<HTMLInputElement>('#q')!;
    input.value = '  garrafa ';
    input.dispatchEvent(new Event('input'));
    element.querySelector('form')!.dispatchEvent(new Event('submit'));

    expect(navigate).toHaveBeenCalledWith([], {
      queryParams: {
        q: 'garrafa',
        categoryId: null,
        month: null,
        block: null,
        room: null,
        status: null,
      },
    });
  });

  it('carrega a próxima página no fim da lista', async () => {
    await start();
    searchRequest().flush(page([item('a')], 0, 2));
    await fixture.whenStable();

    [...element.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Carregar mais'))!
      .click();
    const next = searchRequest();
    expect(next.request.params.get('page')).toBe('1');
    next.flush(page([item('b')], 1, 2));
    await fixture.whenStable();

    expect(element.querySelectorAll('.result')).toHaveLength(2);
    expect(
      [...element.querySelectorAll('button')].some((b) => b.textContent?.includes('Carregar mais')),
    ).toBe(false);
  });

  it('mostra o mês por extenso', async () => {
    await start();
    searchRequest().flush(page([]));
    await fixture.whenStable();

    const months = [...element.querySelectorAll('#month option')].map((o) => o.textContent?.trim());
    expect(months[1]).toMatch(/novembro de 2026/);
  });
});
