import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { recentDays } from '../../../../shared/format/dates';
import NewFoundItemPage from './new-found-item-page';

const CATEGORIES = [
  { id: 'c-fone', name: 'Fone', defaultRisk: 'MEDIUM', defaultRiskLabel: 'Médio' },
  { id: 'c-garrafa', name: 'Garrafa', defaultRisk: 'LOW', defaultRiskLabel: 'Baixo' },
];

const REGISTERED = {
  id: 'i1',
  categoryName: 'Fone',
  block: 'Bloco 400',
  room: 'Sala 421',
  foundOn: '2026-11-23',
  storageBox: 'Caixa Novembro/2026',
  risk: 'MEDIUM',
  riskLabel: 'Médio',
  status: 'AVAILABLE',
  statusLabel: 'Disponível',
  internalDescription: null,
  reservedDetails: null,
  photoPath: '/found-items/i1/photo',
  registeredAt: '2026-11-23T12:00:00Z',
  version: 0,
};

describe('NewFoundItemPage', () => {
  const { today, yesterday } = recentDays();
  let fixture: ComponentFixture<NewFoundItemPage>;
  let page: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    URL.createObjectURL = vi.fn(() => 'blob:foto');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NewFoundItemPage);
    page = fixture.nativeElement as HTMLElement;
    http.expectOne('/api/categories').flush(CATEGORIES);
    http
      .expectOne('/api/found-items/search-options')
      .flush({
        categories: [],
        places: [{ block: 'Bloco 400', rooms: ['Sala 421', 'Sala 422'] }],
        months: [],
        statuses: [],
      });
    suggestion(today).flush({ storageBox: 'Caixa Novembro/2026' });
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  function suggestion(date: string): TestRequest {
    return http.expectOne(
      (r) => r.url === '/api/found-items/storage-box-suggestion' && r.params.get('date') === date,
    );
  }

  const value = (selector: string) =>
    page.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!.value;

  async function type(selector: string, text: string): Promise<void> {
    const input = page.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function check(label: string): Promise<void> {
    const choice = [...page.querySelectorAll('label.choice')].find(
      (l) => l.textContent?.trim() === label,
    )!;
    choice.querySelector<HTMLInputElement>('input')!.click();
    await fixture.whenStable();
  }

  async function takePhoto(): Promise<void> {
    const input = page.querySelector<HTMLInputElement>('#photo')!;
    const file = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  }

  async function fillRequired(): Promise<void> {
    await takePhoto();
    await check('Fone');
    await type('#block', 'Bloco 400');
    await type('#room', 'Sala 421');
  }

  async function submit(): Promise<void> {
    page.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('abre com a data de hoje e a caixa sugerida, e com os opcionais recolhidos', () => {
    expect(value('#foundOn')).toBe(today);
    expect(value('#storageBox')).toBe('Caixa Novembro/2026');
    expect(page.querySelector('details')?.hasAttribute('open')).toBe(false);
  });

  it('pede a foto pela câmera traseira do celular', () => {
    const input = page.querySelector('#photo')!;
    expect(input.getAttribute('capture')).toBe('environment');
    expect(input.getAttribute('accept')).toBe('image/*');
  });

  it('cadastra com o mínimo: foto, categoria, local e data', async () => {
    await fillRequired();
    expect(page.querySelector('.photo__preview img')?.getAttribute('src')).toBe('blob:foto');
    await submit();

    const request = http.expectOne('/api/found-items');
    const body = request.request.body as FormData;
    expect(body.get('photo')).toBeInstanceOf(Blob);
    expect(body.get('categoryId')).toBe('c-fone');
    expect(body.get('block')).toBe('Bloco 400');
    expect(body.get('room')).toBe('Sala 421');
    expect(body.get('foundOn')).toBe(today);
    expect(body.get('storageBox')).toBe('Caixa Novembro/2026');
    expect(body.has('risk')).toBe(false);
    expect(body.has('internalDescription')).toBe(false);
    request.flush(REGISTERED, { status: 201, statusText: 'Created' });
    await fixture.whenStable();

    expect(page.querySelector('h1')?.textContent).toBe('Objeto cadastrado');
    expect(page.querySelector('.done__box')?.textContent).toBe('Caixa Novembro/2026');
  });

  it('troca a caixa sugerida quando a data muda, até a pessoa editar a caixa', async () => {
    page.querySelector<HTMLButtonElement>('.quick-dates button:last-child')!.click();
    suggestion(yesterday).flush({ storageBox: 'Caixa Outubro/2026' });
    await fixture.whenStable();
    expect(value('#storageBox')).toBe('Caixa Outubro/2026');

    await type('#storageBox', 'Caixa da frente');
    page.querySelector<HTMLButtonElement>('.quick-dates button:first-child')!.click();
    await fixture.whenStable();
    expect(value('#storageBox')).toBe('Caixa da frente');
    http.expectNone((r) => r.url === '/api/found-items/storage-box-suggestion');
  });

  it('só oferece risco maior que o padrão da categoria', async () => {
    await check('Fone');
    const options = [...page.querySelectorAll('#risk option')].map((o) => o.textContent?.trim());
    expect(options).toEqual(['Médio (padrão da categoria)', 'Alto']);
  });

  it('envia os opcionais preenchidos', async () => {
    await fillRequired();
    await type('#internalDescription', 'JBL preto');
    await type('#reservedDetails', 'Adesivo de estrela');
    const risk = page.querySelector<HTMLSelectElement>('#risk')!;
    risk.value = risk.options[1].value;
    risk.dispatchEvent(new Event('change'));
    await submit();

    const body = http.expectOne('/api/found-items').request.body as FormData;
    expect(body.get('internalDescription')).toBe('JBL preto');
    expect(body.get('reservedDetails')).toBe('Adesivo de estrela');
    expect(body.get('risk')).toBe('HIGH');
  });

  it('ajuda a preencher sem chamar a API', async () => {
    await submit();

    expect(page.querySelector('#photo-error')?.textContent).toBe('Envie a foto do objeto.');
    expect(page.querySelector('#categoryId-error')?.textContent).toBe('Escolha a categoria.');
    expect(page.querySelector('#block-error')?.textContent).toBe('Informe o bloco.');
    expect(page.querySelector('#room-error')?.textContent).toBe('Informe a sala.');
    http.expectNone('/api/found-items');

    await takePhoto();
    expect(page.querySelector('#photo-error')).toBeNull();
  });

  it('mostra o erro do back-end no campo', async () => {
    await fillRequired();
    await submit();
    http
      .expectOne('/api/found-items')
      .flush(
        { detail: 'Confira os campos.', errors: { foundOn: 'A data não pode estar no futuro.' } },
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();

    expect(page.querySelector('[role="alert"]')?.textContent?.trim()).toBe('Confira os campos.');
    expect(page.querySelector('#foundOn-error')?.textContent).toBe(
      'A data não pode estar no futuro.',
    );
  });

  it('"Cadastrar outro" mantém local, data e caixa e limpa o resto', async () => {
    await fillRequired();
    await type('#internalDescription', 'JBL preto');
    await submit();
    http.expectOne('/api/found-items').flush(REGISTERED, { status: 201, statusText: 'Created' });
    await fixture.whenStable();

    [...page.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Cadastrar outro'))!
      .click();
    await fixture.whenStable();

    expect(value('#block')).toBe('Bloco 400');
    expect(value('#room')).toBe('Sala 421');
    expect(value('#storageBox')).toBe('Caixa Novembro/2026');
    expect(value('#internalDescription')).toBe('');
    expect(page.querySelector('.photo__pick')).not.toBeNull();
    expect(page.querySelector<HTMLInputElement>('input[name="categoryId"]:checked')).toBeNull();
  });
});
