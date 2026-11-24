import { Routes } from '@angular/router';

export default [
  {
    path: '',
    title: 'Meus registros · Cadê?',
    loadComponent: () => import('./loss-reports/my-loss-reports/my-loss-reports-page'),
  },
  {
    path: 'losses/new',
    title: 'Registrar perda · Cadê?',
    loadComponent: () => import('./loss-reports/new-loss-report/new-loss-report-page'),
  },
] satisfies Routes;
