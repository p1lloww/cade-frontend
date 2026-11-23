import { Component } from '@angular/core';

/** Página inicial provisória da área; as telas do backlog entram aqui. */
@Component({
  selector: 'app-staff-home',
  host: { class: 'page' },
  template: `
    <h1>Área da sala</h1>
    <p>Aqui a equipe da sala vai cadastrar e buscar objetos achados.</p>
  `,
})
export default class StaffHome {}
