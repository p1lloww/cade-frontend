import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { counterSummonsFixture } from '../../../../../testing/counter-fixture';
import { suggestionFixture } from '../../../../../testing/suggestion-fixture';
import CounterListPage from './counter-list-page';

describe('CounterListPage', () => {
  let fixture: ComponentFixture<CounterListPage>;
  let page: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    URL.createObjectURL = vi.fn(() => 'blob:foto');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CounterListPage);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    http.match((r) => r.url.endsWith('/photo')).forEach((r) => r.flush(new Blob()));
    http.verify();
  });

  it('lista quem foi convocado, com a caixa e o prazo, levando ao atendimento', async () => {
    http.expectOne('/api/summons').flush([counterSummonsFixture()]);
    await fixture.whenStable();
    http.expectOne('/api/suggestions/s1').flush(suggestionFixture());
    await fixture.whenStable();

    const entry = page.querySelector('.entry')!;
    expect(entry.getAttribute('href')).toBe('/staff/counter/c1');
    expect(entry.textContent).toContain('Garrafa térmica azul');
    expect(entry.textContent).toContain('Caixa Novembro/2026');
    expect(entry.textContent).toContain('Reservado até');
  });

  it('avisa quando ninguém espera para retirar', async () => {
    http.expectOne('/api/summons').flush([]);
    await fixture.whenStable();

    expect(page.querySelector('.empty')?.textContent).toContain('Ninguém esperando');
  });
});
