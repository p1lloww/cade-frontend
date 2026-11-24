import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Página inicial provisória da área; a lista dos registros (PER-04) entra aqui. */
@Component({
  selector: 'app-student-home',
  host: { class: 'page' },
  imports: [RouterLink],
  template: `
    <h1>Área do estudante</h1>
    <p>Aqui você registra o que perdeu e acompanha os seus registros.</p>
    <a class="button button--large" routerLink="/student/losses/new">Registrar perda</a>
  `,
})
export default class StudentHome {}
