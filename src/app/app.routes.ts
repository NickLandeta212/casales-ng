import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './layout/dashboard/dashboard.component';
import { RoleGuard } from './guards/role.guard';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
     { path: '', component: LoginComponent }, // Ruta raíz
     {
          path: 'reserva',
          loadComponent: () => import('./pages/reserva/reserva.component').then(m => m.ReservaComponent)
     },
     {
          path: 'pago-multa',
          loadComponent: () => import('./pages/pago-multa/pago-multa.component').then(m => m.PagoMultaComponent)
     },
     {
          path: 'dashboard', component: DashboardComponent, children: [
               { path: '', redirectTo: 'home', pathMatch: 'full' },
               {
                    path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero', 'condomino'], permission: 'home' }
               },
               {
                    path: 'torres', loadComponent: () => import('./pages/torres/torres.component').then(m => m.TorresComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero', 'condomino'], permission: 'torres' }
               },
               {
                    path: 'torres/pagos-alicuota',
                    loadComponent: () => import('./pages/torre-pagos-alicuota/torre-pagos-alicuota.component').then(m => m.TorrePagosAlicuotaComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero', 'condomino'], permission: 'pagos_alicuota' }
               },
               {
                    path: 'torres/:id/pagos-alicuota',
                    loadComponent: () => import('./pages/torre-pagos-alicuota/torre-pagos-alicuota.component').then(m => m.TorrePagosAlicuotaComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero', 'condomino'], permission: 'pagos_alicuota' }
               },
               {
                    path: 'departamentos', loadComponent: () => import('./pages/departamentos/departamentos.component').then(m => m.DepartamentosComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero', 'condomino'], permission: 'departamentos' }
               },
               {
                    path: 'departamentos/:id/personas',
                    loadComponent: () => import('./pages/departamento-personas/departamento-personas.component').then(m => m.DepartamentoPersonasComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero', 'condomino'], permission: 'departamentos' }
               },
               {
                    path: 'reservas',
                    loadComponent: () => import('./pages/reservas/reservas.component').then(m => m.ReservasComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero', 'condomino'], permission: 'reservas' }
               },
               {
                    path: 'personas', loadComponent: () => import('./pages/personas/personas.component').then(m => m.PersonasComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero', 'condomino'], permission: 'personas', mode: 'list' }
               },
               {
                    path: 'personas/crear', loadComponent: () => import('./pages/personas/personas.component').then(m => m.PersonasComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero', 'condomino'], permission: 'personas_crear', mode: 'create' }
               },
               {
                    path: 'multas', loadComponent: () => import('./pages/multas/multas.component').then(m => m.MultasComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero', 'condomino'], permission: 'multas', mode: 'list' }
               },
               {
                    path: 'multas/crear', loadComponent: () => import('./pages/multas/multas.component').then(m => m.MultasComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero', 'condomino'], permission: 'multas_crear', mode: 'create' }
               },
               {
                    path: 'usuarios', loadComponent: () => import('./pages/usuarios/usuarios.component').then(m => m.UsuariosComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero', 'condomino'], permission: 'usuarios' }
               },
               {
                    path: 'usuarios/crear', loadComponent: () => import('./pages/usuarios/usuarios.component').then(m => m.UsuariosComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero', 'condomino'], permission: 'usuarios_crear', mode: 'create' }
               },
               {
                    path: 'settings',
                    loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent),
                    canActivate: [AuthGuard]
               },
               {
                    path: 'unauthorized',
                    loadComponent: () => import('./pages/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
               },
                


          ]
     }

];
