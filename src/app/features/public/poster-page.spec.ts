import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import PosterPage from './poster-page';

describe('PosterPage', () => {
  it('mostra o endereço da página pública e o QR code com descrição para leitores de tela', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(PosterPage);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('.poster__url')?.textContent).toBe(`${location.origin}/`);
    expect(page.querySelector('canvas')?.getAttribute('aria-label')).toBe(
      `QR code para ${location.origin}/`,
    );
    expect(page.querySelector('.tools')?.classList).toContain('no-print');
  });
});
