import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { suggestionFixture } from '../../../../../testing/suggestion-fixture';
import ItemSuggestionsPage from './item-suggestions-page';

const ITEM = {
  id: 'i1',
  categoryName: 'Garrafa',
  block: 'Bloco 300',
  room: 'Sala 310',
  foundOn: '2026-11-20',
  storageBox: 'Caixa Novembro/2026',
  statusLabel: 'Disponível',
  internalDescription: 'Garrafa térmica azul',
  photoPath: '/found-items/i1/photo',
};

describe('ItemSuggestionsPage', () => {
  let fixture: ComponentFixture<ItemSuggestionsPage>;
  let page: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    URL.createObjectURL = vi.fn(() => 'blob:foto');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ItemSuggestionsPage);
    fixture.componentRef.setInput('id', 'i1');
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  async function respond(suggestions: unknown[]): Promise<void> {
    http.expectOne('/api/found-items/i1').flush(ITEM);
    http.expectOne('/api/found-items/i1/suggestions').flush(suggestions);
    await fixture.whenStable();
    http.match('/api/found-items/i1/photo').forEach((r) => r.flush(new Blob()));
    await fixture.whenStable();
  }

  it('lista as sugestões com a faixa escrita e a nota, levando à comparação', async () => {
    await respond([
      suggestionFixture(),
      suggestionFixture({ id: 's2', score: 55, band: 'MEDIUM', bandLabel: 'Média' }),
    ]);

    const tags = [...page.querySelectorAll('.suggestion .tag')].map((t) => t.textContent?.trim());
    expect(tags).toEqual(['Compatibilidade alta · 90', 'Compatibilidade média · 55']);
    expect(page.querySelector('.suggestion')?.getAttribute('href')).toBe('/staff/suggestions/s1');
    expect(page.querySelector('h1')?.textContent).toBe('Garrafa térmica azul');
  });

  it('mostra a situação quando a sugestão não é mais nova', async () => {
    await respond([suggestionFixture({ status: 'DISCARDED', statusLabel: 'Descartada' })]);

    expect(page.querySelector('.suggestion')?.textContent).toContain('Descartada');
  });

  it('explica quando ainda não há sugestão', async () => {
    await respond([]);

    expect(page.querySelector('.empty')?.textContent).toContain('Nenhuma perda parecida');
  });
});
