import { Component } from '@angular/core';

/** Página inicial provisória da área; as telas do backlog entram aqui. */
@Component({
  selector: 'app-student-home',
  host: { class: 'page' },
  template: `
    <h1>Área do estudante</h1>
    <p>Aqui você vai registrar perdas e acompanhar os seus registros.</p>
  `,
})
export default class StudentHome {}
