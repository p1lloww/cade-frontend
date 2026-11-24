import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fakeToken } from '../../../../testing/fake-token';
import { Role } from '../../../core/auth/role';
import { Session } from '../../../core/auth/session';
import UnclaimedPage from './unclaimed-page';

const BOXES = [
  {
    storageBox: 'Caixa Agosto/2026',
    items: [
      {
        id: 'u1',
        categoryName: 'Garrafa',
        block: 'Bloco 300',
        room: 'Sala 310',
        foundOn: '2026-08-12',
        internalDescription: 'Garrafa preta',
        registeredAt: '2026-08-12T12:00:00Z',
      },
      {
        id: 'u2',
        categoryName: 'Casaco',
        block: 'Bloco 100',
        room: 'Sala 101',
        foundOn: '2026-08-20',
        internalDescription: null,
        registeredAt: '2026-08-20T12:00:00Z',
      },
    ],
  },
  {
    storageBox: 'Caixa Julho/2026',
    items: [
      {
        id: 'u3',
        categoryName: 'Caderno',
        block: 'Bloco 200',
        room: 'Sala 201',
        foundOn: '2026-07-10',
        internalDescription: 'Caderno azul',
        registeredAt: '2026-07-10T12:00:00Z',
      },
    ],
  },
];

describe('UnclaimedPage', () => {
  let fixture: ComponentFixture<UnclaimedPage>;
  let page: HTMLElement;
  let http: HttpTestingController;

  async function open(role: Role): Promise<void> {
    localStorage.clear();
    URL.createObjectURL = vi.fn(() => 'blob:foto');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(Session).start(fakeToken({ role }));
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(UnclaimedPage);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    http.expectOne('/api/unclaimed-items').flush(BOXES);
    await fixture.whenStable();
  }

  afterEach(() => {
    localStorage.clear();
    // A foto de um objeto que saiu da lista é cancelada; só as pendentes são respondidas.
    http
      .match((r) => r.url.endsWith('/photo'))
      .filter((r) => !r.cancelled)
      .forEach((r) => r.flush(new Blob()));
    http.verify();
  });

  const button = (text: string) =>
    [...page.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes(text),
    );

  it('agrupa por caixa de mês', async () => {
    await open('STAFF');

    const boxes = [...page.querySelectorAll('.box h2')].map((h) =>
      h.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(boxes).toEqual(['Caixa Agosto/2026 2 objetos', 'Caixa Julho/2026 1 objeto']);
    expect(page.querySelector('.count')?.textContent).toContain('3 objetos em 2 caixas');
  });

  it('não deixa o funcionário registrar destino', async () => {
    await open('STAFF');

    expect(button('Registrar destino')).toBeUndefined();
    expect(page.textContent).toContain('Quem registra o destino é o administrador');
  });

  it('o administrador registra o destino padrão (bazar) depois de confirmar', async () => {
    await open('ADMIN');
    button('Registrar destino')!.click();
    await fixture.whenStable();
    expect(page.textContent).toContain('Isso não pode ser desfeito');

    button('Confirmar destino')!.click();
    const request = http.expectOne({ method: 'POST', url: '/api/unclaimed-items/u1/disposal' });
    expect(request.request.body).toEqual({ destination: 'BAZAAR', note: null });
    request.flush({}, { status: 201, statusText: 'Created' });
    await fixture.whenStable();

    expect(page.querySelector('[role="status"]')?.textContent).toContain(
      'Destino registrado: bazar',
    );
    expect(
      [...page.querySelectorAll('.item__title')].map((a) => a.textContent?.trim()),
    ).not.toContain('Garrafa preta');
  });

  it('pede a observação quando o destino é outro', async () => {
    await open('ADMIN');
    button('Registrar destino')!.click();
    await fixture.whenStable();
    const other = [...page.querySelectorAll('label.choice')].find(
      (l) => l.textContent?.trim() === 'Outro',
    )!;
    other.querySelector('input')!.click();
    await fixture.whenStable();

    button('Confirmar destino')!.click();
    await fixture.whenStable();
    expect(page.querySelector('#note-error')?.textContent).toBe('Diga qual é o destino.');
    http.expectNone((r) => r.url.endsWith('/disposal'));

    const note = page.querySelector<HTMLInputElement>('#note')!;
    note.value = 'Doado ao projeto social';
    note.dispatchEvent(new Event('input'));
    button('Confirmar destino')!.click();
    expect(http.expectOne('/api/unclaimed-items/u1/disposal').request.body).toEqual({
      destination: 'OTHER',
      note: 'Doado ao projeto social',
    });
  });

  it('remove a caixa quando o último objeto dela sai', async () => {
    await open('ADMIN');
    const julho = [...page.querySelectorAll('.box')][1];
    julho.querySelector<HTMLButtonElement>('.item__action')!.click();
    await fixture.whenStable();
    button('Confirmar destino')!.click();
    http
      .expectOne('/api/unclaimed-items/u3/disposal')
      .flush({}, { status: 201, statusText: 'Created' });
    await fixture.whenStable();

    expect(page.querySelectorAll('.box')).toHaveLength(1);
  });
});
