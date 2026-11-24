import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import WalkInPage from './walk-in-page';

const ITEM = {
  id: 'i1',
  categoryName: 'Guarda-chuva',
  block: 'Bloco 100',
  room: 'Sala 101',
  foundOn: '2026-11-20',
  storageBox: 'Caixa Novembro/2026',
  status: 'AVAILABLE',
  statusLabel: 'Disponível',
  internalDescription: 'Guarda-chuva preto',
  reservedDetails: null,
  photoPath: '/found-items/i1/photo',
};

const CHECK = {
  foundItemId: 'i1',
  statusLabel: 'Disponível',
  canHandOver: true,
  risk: 'LOW',
  riskLabel: 'Baixo',
  checklist: ['Documento com foto.', 'A descrição combina com o objeto.'],
  acceptedVerifications: [
    { code: 'DESCRIPTION_MATCHED', label: 'Descrição coerente com o objeto' },
  ],
};

describe('WalkInPage', () => {
  let fixture: ComponentFixture<WalkInPage>;
  let page: HTMLElement;
  let http: HttpTestingController;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:foto');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(WalkInPage);
    fixture.componentRef.setInput('id', 'i1');
    page = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    http.match((r) => r.url.endsWith('/photo')).forEach((r) => r.flush(new Blob()));
    http.verify();
  });

  async function load(check = CHECK): Promise<void> {
    await fixture.whenStable();
    http.expectOne('/api/found-items/i1').flush(ITEM);
    http.expectOne('/api/found-items/i1/walk-in-check').flush(check);
    await fixture.whenStable();
  }

  async function type(selector: string, text: string): Promise<void> {
    const input = page.querySelector<HTMLInputElement>(selector)!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function pick(text: string): Promise<void> {
    const label = [...page.querySelectorAll('label')].find((l) => l.textContent?.trim() === text)!;
    label.querySelector('input')!.click();
    await fixture.whenStable();
  }

  async function click(text: string): Promise<void> {
    [...page.querySelectorAll<HTMLButtonElement>('button')]
      .find((b) => b.textContent?.includes(text))!
      .click();
    await fixture.whenStable();
  }

  it('entrega a uma pessoa sem conta, sem pedir matrícula', async () => {
    await load();
    await pick('Pessoa sem conta');
    expect(page.querySelector('#enrollment')).toBeNull();

    await type('#holderName', 'Maria da Silva');
    await pick('RG');
    await type('#documentNumber', '1234567');
    await pick('Descrição coerente com o objeto');
    await click('Entregar o objeto');
    await click('Confirmar entrega');

    const request = http.expectOne({ method: 'POST', url: '/api/walk-in-pickups' });
    expect(request.request.body).toEqual({
      foundItemId: 'i1',
      holderType: 'VISITOR',
      holderName: 'Maria da Silva',
      documentType: 'RG',
      documentNumber: '1234567',
      enrollment: null,
      verification: 'DESCRIPTION_MATCHED',
      notes: null,
    });
    request.flush({}, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    http
      .expectOne('/api/found-items/i1')
      .flush({ ...ITEM, status: 'RETURNED', statusLabel: 'Devolvido' });
    await fixture.whenStable();

    expect(page.querySelector('#result h2')?.textContent).toBe('Objeto entregue');
    expect(page.querySelector('.item')?.textContent).toContain('Devolvido');
  });

  it('pede nome e matrícula do estudante', async () => {
    await load();
    await click('Entregar o objeto');

    expect(page.querySelector('#holderName-error')?.textContent).toBe(
      'Informe o nome de quem retira.',
    );
    expect(page.querySelector('#enrollment-error')?.textContent).toBe('Informe a matrícula.');
    http.expectNone('/api/walk-in-pickups');
  });

  it('não oferece o atalho para objeto reservado', async () => {
    await load({ ...CHECK, canHandOver: false, statusLabel: 'Reservado' });

    expect(page.textContent).toContain('não sai pelo atalho');
    expect(page.querySelector('#holderName')).toBeNull();
  });
});
