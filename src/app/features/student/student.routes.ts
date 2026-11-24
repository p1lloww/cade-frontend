import { Routes } from '@angular/router';

export default [
  { path: '', title: 'Área do estudante · Cadê?', loadComponent: () => import('./student-home') },
  {
    path: 'losses/new',
    title: 'Registrar perda · Cadê?',
    loadComponent: () => import('./loss-reports/new-loss-report/new-loss-report-page'),
  },
] satisfies Routes;
