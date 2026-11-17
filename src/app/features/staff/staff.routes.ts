import { Routes } from '@angular/router';

export default [
  { path: '', title: 'Área da sala · Cadê?', loadComponent: () => import('./staff-home') },
] satisfies Routes;
