import { Routes } from '@angular/router';

export default [
  {
    path: '',
    title: 'Cadê? · Achados e perdidos da UCSal',
    loadComponent: () => import('./public-home'),
  },
] satisfies Routes;
