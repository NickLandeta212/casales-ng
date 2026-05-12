import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './layout/dashboard/dashboard.component';
import { RoleGuard } from './guards/role.guard';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
     { path: '', component: LoginComponent, pathMatch: 'full' }, // Ruta raíz
     {
          path: 'reserva',
          loadComponent: () => import('./pages/reserva/reserva.component').then(m => m.ReservaComponent)
     },
     {
          path: 'pago-multa',
          loadComponent: () => import('./pages/pago-multa/pago-multa.component').then(m => m.PagoMultaComponent)
     },
          {
               path: 'pago-alicuota',
               loadComponent: () => import('./pages/pago-alicuota-form/pago-alicuota-form.component').then(m => m.PagoAlicuotaFormComponent)
          },
          {
               path: 'pago-alicuota/:torreId',
               loadComponent: () => import('./pages/pago-alicuota-form/pago-alicuota-form.component').then(m => m.PagoAlicuotaFormComponent)
          },
          {
               path: 'pago-alicuota-torre',
               loadComponent: () => import('./pages/pago-alicuota-torre-form/pago-alicuota-torre-form.component').then(m => m.PagoAlicuotaTorreFormComponent)
          },
          {
               path: 'pago-alicuota-torre/:torreId',
               loadComponent: () => import('./pages/pago-alicuota-torre-form/pago-alicuota-torre-form.component').then(m => m.PagoAlicuotaTorreFormComponent)
          },
     {
          path: 'dashboard', component: DashboardComponent, children: [
               { path: '', redirectTo: 'home', pathMatch: 'full' },
               {
                    path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero'], permission: 'home' }
               },
               {
                    path: 'torres', loadComponent: () => import('./pages/torres/torres.component').then(m => m.TorresComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero'], permission: 'torres' }
               },
               {
                    path: 'torres/pagos-alicuota',
                    loadComponent: () => import('./pages/torre-pagos-conjunto/torre-pagos-conjunto.component').then(m => m.TorrePagosConjuntoComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto'], permission: 'pagos_alicuota' }
               },
               {
                    path: 'torres/pagos-departamentos',
                    loadComponent: () => import('./pages/torre-pagos-alicuota/torre-pagos-alicuota.component').then(m => m.TorrePagosAlicuotaComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'tesorero'], permission: 'pagos_departamentos' }
               },
               {
                    path: 'departamentos/pagos-alicuota',
                    loadComponent: () => import('./pages/torre-pagos-alicuota/torre-pagos-alicuota.component').then(m => m.TorrePagosAlicuotaComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'tesorero'], permission: 'pagos_departamentos' }
               },
               {
                    path: 'torres/:id/pagos-departamentos',
                    loadComponent: () => import('./pages/torre-pagos-alicuota/torre-pagos-alicuota.component').then(m => m.TorrePagosAlicuotaComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'tesorero'], permission: 'pagos_departamentos' }
               },
               {
                    path: 'departamentos', loadComponent: () => import('./pages/departamentos/departamentos.component').then(m => m.DepartamentosComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero'], permission: 'departamentos' }
               },
               {
                    path: 'departamentos/:id/personas',
                    loadComponent: () => import('./pages/departamento-personas/departamento-personas.component').then(m => m.DepartamentoPersonasComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero'], permission: 'departamentos' }
               },
               {
                    path: 'reservas',
                    loadComponent: () => import('./pages/reservas/reservas.component').then(m => m.ReservasComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero'], permission: 'reservas' }
               },
               {
                    path: 'personas', loadComponent: () => import('./pages/personas/personas.component').then(m => m.PersonasComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero'], permission: 'personas', mode: 'list' }
               },
               {
                    path: 'personas/crear', loadComponent: () => import('./pages/personas/personas.component').then(m => m.PersonasComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero'], permission: 'personas_crear', mode: 'create' }
               },
               {
                    path: 'multas', loadComponent: () => import('./pages/multas/multas.component').then(m => m.MultasComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero'], permission: 'multas', mode: 'list' }
               },
               {
                    path: 'multas/crear', loadComponent: () => import('./pages/multas/multas.component').then(m => m.MultasComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero'], permission: 'multas_crear', mode: 'create' }
               },
               {
                    path: 'usuarios', loadComponent: () => import('./pages/usuarios/usuarios.component').then(m => m.UsuariosComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero'], permission: 'usuarios' }
               },
               {
                    path: 'usuarios/crear', loadComponent: () => import('./pages/usuarios/usuarios.component').then(m => m.UsuariosComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero'], permission: 'usuarios_crear', mode: 'create' }
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

