import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { foundItemFixture } from '../../../../../testing/found-item-fixture';
import { FoundItem } from '../found-item';
import EditFoundItemPage from './edit-found-item-page';

const CATEGORIES = [
  { id: 'c-fone', name: 'Fone', defaultRisk: 'MEDIUM', defaultRiskLabel: 'Médio' },
  { id: 'c-guarda', name: 'Guarda-chuva', defaultRisk: 'LOW', defaultRiskLabel: 'Baixo' },
];

describe('EditFoundItemPage', () => {
  let fixture: ComponentFixture<EditFoundItemPage>;
  let page: HTMLElement;
  let http: HttpTestingController;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:foto');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EditFoundItemPage);
    fixture.componentRef.setInput('id', 'i1');
    page = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    http.match((r) => r.url.endsWith('/photo')).forEach((r) => r.flush(new Blob()));
    http.verify();
  });

  async function load(item: FoundItem = foundItemFixture('i1', { version: 3 })): Promise<void> {
    await fixture.whenStable();
    http.expectOne('/api/found-items/i1').flush(item);
    http.expectOne('/api/categories').flush(CATEGORIES);
    await fixture.whenStable();
  }

  async function type(selector: string, text: string): Promise<void> {
    const input = page.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function click(text: string): Promise<void> {
    [...page.querySelectorAll<HTMLButtonElement>('button')]
      .find((b) => b.textContent?.includes(text))!
      .click();
    await fixture.whenStable();
  }

  it('preenche os dados atuais e só oferece risco a partir do padrão da categoria', async () => {
    await load();

    expect(page.querySelector<HTMLInputElement>('#block')?.value).toBe('Bloco 400');
    const risks = [...page.querySelectorAll('#risk option')].map((o) => o.textContent?.trim());
    expect(risks).toEqual(['Médio', 'Alto']);
  });

  it('corrige os dados com motivo e a versão recebida', async () => {
    await load();
    await click('Salvar correção');
    expect(page.querySelector('#reason-error')?.textContent).toBe('Informe o motivo da correção.');
    http.expectNone({ method: 'PUT', url: '/api/found-items/i1' });

    await type('#room', 'Sala 422');
    await type('#reason', 'Sala anotada errada');
    await click('Salvar correção');
    const request = http.expectOne({ method: 'PUT', url: '/api/found-items/i1' });
    expect(request.request.body).toMatchObject({
      categoryId: 'c-fone',
      room: 'Sala 422',
      reason: 'Sala anotada errada',
      version: 3,
      risk: 'MEDIUM',
    });
    request.flush(foundItemFixture('i1', { room: 'Sala 422', version: 4 }));
    await fixture.whenStable();

    expect(page.textContent).toContain('Dados corrigidos');
    expect(page.querySelector<HTMLInputElement>('#reason')?.value).toBe('');
  });

  it('mostra a recusa do back-end quando o objeto mudou no meio', async () => {
    await load();
    await type('#reason', 'Correção');
    await click('Salvar correção');
    http
      .expectOne({ method: 'PUT', url: '/api/found-items/i1' })
      .flush(
        { detail: 'O objeto foi alterado por outra pessoa. Recarregue.' },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'alterado por outra pessoa',
    );
  });

  it('não deixa corrigir objeto reservado, mas deixa marcar o dono', async () => {
    await load(foundItemFixture('i1', { status: 'RESERVED', statusLabel: 'Reservado' }));

    expect(page.querySelector('#reason')).toBeNull();
    expect(page.textContent).toContain('Este está reservado');
    expect(page.querySelector('#identifiedName')).not.toBeNull();
  });

  it('registra quem trouxe', async () => {
    await load();
    await type('#broughtBy', 'Equipe de limpeza');
    await click('Salvar quem trouxe');

    const request = http.expectOne({ method: 'PUT', url: '/api/found-items/i1/brought-by' });
    expect(request.request.body).toEqual({ broughtBy: 'Equipe de limpeza' });
    request.flush(foundItemFixture('i1', { broughtBy: 'Equipe de limpeza' }));
    await fixture.whenStable();
    expect(page.textContent).toContain('Quem trouxe ficou registrado');
  });

  it('marca e desmarca o objeto como identificado', async () => {
    await load();
    await click('Marcar como identificado');
    expect(page.textContent).toContain('Informe o nome, o e-mail ou o documento.');

    await type('#identifiedName', 'Maria Souza');
    await click('Marcar como identificado');
    const request = http.expectOne({ method: 'PUT', url: '/api/found-items/i1/identification' });
    expect(request.request.body).toEqual({ name: 'Maria Souza', email: null, document: null });
    request.flush(foundItemFixture('i1', { identified: true, identifiedName: 'Maria Souza' }));
    await fixture.whenStable();

    await click('Desmarcar');
    http
      .expectOne({ method: 'DELETE', url: '/api/found-items/i1/identification' })
      .flush(foundItemFixture('i1'));
    await fixture.whenStable();
    expect(page.textContent).toContain('não está mais marcado');
  });
});
