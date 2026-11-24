import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import DeadlinesPage from './deadlines-page';

describe('DeadlinesPage', () => {
  let fixture: ComponentFixture<DeadlinesPage>;
  let page: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeadlinesPage);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    http
      .expectOne('/api/settings/deadlines')
      .flush({ storageDays: 90, summonsDays: 7, reportValidityDays: 30 });
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  async function type(selector: string, text: string): Promise<void> {
    const input = page.querySelector<HTMLInputElement>(selector)!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    page.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('mostra os prazos em vigor', () => {
    expect(page.querySelector<HTMLInputElement>('#storageDays')?.value).toBe('90');
    expect(page.querySelector<HTMLInputElement>('#summonsDays')?.value).toBe('7');
    expect(page.querySelector<HTMLInputElement>('#reportValidityDays')?.value).toBe('30');
  });

  it('confere os limites antes de salvar', async () => {
    await type('#summonsDays', '45');
    await submit();

    expect(page.querySelector('#summonsDays-error')?.textContent).toBe(
      'Use um número inteiro de 1 a 30.',
    );
    http.expectNone({ method: 'PUT' });
  });

  it('salva os três prazos', async () => {
    await type('#storageDays', '120');
    await submit();

    const request = http.expectOne({ method: 'PUT', url: '/api/settings/deadlines' });
    expect(request.request.body).toEqual({
      storageDays: 120,
      summonsDays: 7,
      reportValidityDays: 30,
    });
    request.flush({ storageDays: 120, summonsDays: 7, reportValidityDays: 30 });
    await fixture.whenStable();

    expect(page.querySelector('[role="status"]')?.textContent).toContain('Prazos salvos');
  });
});
