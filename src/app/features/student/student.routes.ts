import { Routes } from '@angular/router';

export default [
  { path: '', title: 'Área do estudante · Cadê?', loadComponent: () => import('./student-home') },
] satisfies Routes;
