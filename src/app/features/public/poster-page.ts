import { afterNextRender, Component, ElementRef, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toCanvas } from 'qrcode';

/**
 * Cartaz para imprimir e colar nos blocos (RF42), com o QR code da página pública. O endereço vem de onde o site
 * está publicado, então o mesmo cartaz serve para o teste local, a Vercel e o domínio final.
 */
@Component({
  selector: 'app-poster-page',
  imports: [RouterLink],
  template: `
    <div class="tools no-print">
      <a routerLink="/">Voltar à página inicial</a>
      <button class="button" type="button" (click)="print()">Imprimir</button>
    </div>

    <article class="poster" aria-label="Cartaz do Cadê?">
      <p class="poster__brand">Cadê<span class="poster__question">?</span></p>
      <h1 class="poster__title">Perdeu alguma coisa na UCSal?</h1>
      <p class="poster__lead">
        Registre pelo celular. Se o objeto aparecer no Achados e Perdidos, você é chamado.
      </p>
      <canvas #qr class="poster__qr" role="img" [attr.aria-label]="'QR code para ' + url"></canvas>
      <p class="poster__url">{{ url }}</p>
      @if (failed()) {
        <p class="alert alert--error" role="alert">
          Não foi possível gerar o QR code. O endereço acima continua valendo.
        </p>
      }
      <p class="poster__place">
        Achados e Perdidos da UCSal · perto da Administração<br />
        Segunda a sexta, das 7h às 21h50
      </p>
    </article>
  `,
  styles: `
    :host {
      display: block;
      padding: var(--space-5) var(--space-4) var(--space-7);
    }

    .tools {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      max-width: 42rem;
      margin: 0 auto var(--space-5);
      font-weight: 600;
    }

    .poster {
      max-width: 42rem;
      margin-inline: auto;
      padding: var(--space-6) var(--space-5);
      border: 2px solid var(--color-heading);
      border-radius: var(--radius-xl);
      text-align: center;
    }

    .poster p {
      margin: 0;
    }

    .poster__brand {
      color: var(--color-heading);
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.045em;
    }

    .poster__question {
      color: var(--color-orange);
    }

    .poster__title {
      margin: var(--space-3) 0;
      font-size: clamp(2rem, 7vw, 3.25rem);
      line-height: 1;
    }

    .poster .poster__lead {
      max-width: 30ch;
      margin-inline: auto;
      color: var(--color-muted);
      font-size: 1.25rem;
    }

    .poster .poster__qr {
      display: block;
      width: min(100%, 18rem);
      height: auto;
      margin: var(--space-5) auto var(--space-2);
    }

    .poster__url {
      color: var(--color-heading);
      font-size: 1.125rem;
      font-weight: 700;
      overflow-wrap: anywhere;
    }

    .poster .poster__place {
      margin-top: var(--space-5);
      color: var(--color-heading);
      font-size: 1.0625rem;
    }

    @media print {
      :host {
        padding: 0;
      }

      .poster {
        border: 0;
      }
    }
  `,
})
export default class PosterPage {
  /** Endereço da página pública onde o site está publicado agora. */
  protected readonly url = typeof location === 'undefined' ? '' : `${location.origin}/`;
  protected readonly failed = signal(false);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('qr');

  constructor() {
    afterNextRender(() => {
      // Cor escura do texto sobre branco: contraste alto para qualquer câmera ler, mesmo impresso em preto e branco.
      toCanvas(this.canvas().nativeElement, this.url, {
        width: 576,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#1f3a12', light: '#ffffff' },
      })
        // A biblioteca grava o tamanho em pixels no style do canvas; sem ele, quem manda é a folha de estilos.
        .then(() => {
          const style = this.canvas().nativeElement.style;
          style.removeProperty('width');
          style.removeProperty('height');
        })
        .catch(() => this.failed.set(true));
    });
  }

  protected print(): void {
    window.print();
  }
}
