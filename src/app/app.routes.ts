import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './layout/dashboard/dashboard.component';
import { RoleGuard } from './guards/role.guard';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
     { path: '', component: LoginComponent }, // Ruta raíz
     {
          path: 'dashboard', component: DashboardComponent, children: [
               { path: '', redirectTo: 'home', pathMatch: 'full' },
               {
                    path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
                    canActivate: [AuthGuard, AuthGuard, RoleGuard],
                    data: { roles: ['admin_general'] }
               },
               {
                    path: 'torres', loadComponent: () => import('./pages/torres/torres.component').then(m => m.TorresComponent),
                    canActivate: [AuthGuard, AuthGuard, RoleGuard],
                    data: { roles: ['admin_general'] }
               },
               {
                    path: 'departamentos', loadComponent: () => import('./pages/departamentos/departamentos.component').then(m => m.DepartamentosComponent),
                    canActivate: [AuthGuard, AuthGuard, RoleGuard],
                    data: { roles: ['admin_general'] }
               },
               {
                    path: 'unauthorized',
                    loadComponent: () => import('./pages/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
               },
                


          ]
     }

];
