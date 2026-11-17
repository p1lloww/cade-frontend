import { Routes } from '@angular/router';

export default [
  { path: '', title: 'Administração · Cadê?', loadComponent: () => import('./admin-home') },
] satisfies Routes;
