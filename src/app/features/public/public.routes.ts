import { Routes } from '@angular/router';

export default [
  {
    path: '',
    title: 'Cadê? · Achados e perdidos da UCSal',
    loadComponent: () => import('./public-home'),
  },
  {
    path: 'cartaz',
    title: 'Cartaz · Cadê?',
    loadComponent: () => import('./poster-page'),
  },
] satisfies Routes;
