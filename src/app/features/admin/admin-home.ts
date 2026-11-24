import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Shortcut {
  path: string;
  title: string;
  text: string;
}

/** Início da administração: atalhos para o que só o administrador faz, e para a área da sala, que ele também usa. */
@Component({
  selector: 'app-admin-home',
  host: { class: 'page' },
  imports: [RouterLink],
  template: `
    <h1>Administração</h1>
    <ul class="shortcuts">
      @for (shortcut of shortcuts; track shortcut.path) {
        <li>
          <a class="shortcut" [routerLink]="shortcut.path">
            <span class="shortcut__title">{{ shortcut.title }}</span>
            <span class="muted">{{ shortcut.text }}</span>
          </a>
        </li>
      }
    </ul>
  `,
  styles: `
    .shortcuts {
      display: grid;
      gap: var(--space-3);
      margin: var(--space-5) 0 0;
      padding: 0;
      list-style: none;
    }

    .shortcuts li {
      display: flex;
    }

    .shortcut {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      padding: var(--space-4);
      border: 1px solid var(--color-divider);
      border-radius: var(--radius-lg);
      color: inherit;
      text-decoration: none;
    }

    .shortcut:hover {
      border-color: var(--color-primary);
      color: inherit;
    }

    .shortcut__title {
      color: var(--color-primary);
      font-size: 1.125rem;
      font-weight: 800;
    }

    @media (min-width: 36rem) {
      .shortcuts {
        grid-template-columns: 1fr 1fr;
      }
    }
  `,
})
export default class AdminHome {
  protected readonly shortcuts: Shortcut[] = [
    {
      path: '/admin/team',
      title: 'Equipe da sala',
      text: 'Dar e retirar o perfil de funcionário.',
    },
    {
      path: '/staff/unclaimed',
      title: 'Não reclamados',
      text: 'Objetos com mais de 90 dias na sala, por caixa, e o destino deles.',
    },
    {
      path: '/staff',
      title: 'Área da sala',
      text: 'Buscar e cadastrar objetos, sugestões e balcão.',
    },
  ];
}
