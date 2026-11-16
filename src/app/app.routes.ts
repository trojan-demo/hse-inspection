import {Routes} from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home').then((m) => m.Home),
    title: 'Trojan Construction Holding | Maysan Development HSE Portal',
  },
  {
    path: 'supervisor-portal',
    loadComponent: () =>
      import('./pages/inspection-portal').then((m) => m.InspectionPortal),
    title: 'Daily Site HSE Inspection / Performance Evaluation | Trojan Construction',
  },
  {
    path: 'inspection',
    redirectTo: 'supervisor-portal',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
