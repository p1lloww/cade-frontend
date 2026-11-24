import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Página inicial provisória da área; a busca de objetos (ACH-05) e as sugestões (CRU-04) entram aqui. */
@Component({
  selector: 'app-staff-home',
  host: { class: 'page' },
  imports: [RouterLink],
  template: `
    <h1>Área da sala</h1>
    <p>Aqui a equipe da sala cadastra e busca objetos achados.</p>
    <a class="button button--large" routerLink="/staff/items/new">Cadastrar objeto</a>
  `,
})
export default class StaffHome {}
