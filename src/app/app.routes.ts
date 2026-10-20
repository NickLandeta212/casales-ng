import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './layout/dashboard/dashboard.component';
import { RoleGuard } from './guards/role.guard';
import { AuthGuard } from './guards/auth.guard';
import { GESTION } from './auth/permisos';

// Formulario para registrar el pago que una torre hace al conjunto. Vive dentro del panel
// para usar la sesion abierta (antes se abria en otra pestana y pedia iniciar sesion de nuevo).
const pagoAlicuotaTorre = () =>
     import('./pages/pago-alicuota-torre-form/pago-alicuota-torre-form.component').then(m => m.PagoAlicuotaTorreFormComponent);
const pagoAlicuotaTorreData = { roles: GESTION, permission: 'pagos_alicuota_torre' };

export const routes: Routes = [
     { path: '', component: LoginComponent, pathMatch: 'full' }, // Ruta raíz
     {
          path: 'reserva',
          loadComponent: () => import('./pages/reserva/reserva.component').then(m => m.ReservaComponent)
     },
     // Enlaces antiguos del link de pago: siguen funcionando y llevan al formulario dentro del panel.
     { path: 'pago-alicuota-torre', redirectTo: 'dashboard/torres/pagar-alicuota', pathMatch: 'full' },
     { path: 'pago-alicuota-torre/:torreId', redirectTo: 'dashboard/torres/pagar-alicuota/:torreId' },
     {
          path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard], children: [
               { path: '', redirectTo: 'home', pathMatch: 'full' },
               {
                    path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero', 'guardia', 'condomino'], permission: 'home' }
               },
               {
                    path: 'mi-cuenta',
                    loadComponent: () => import('./pages/mi-cuenta/mi-cuenta.component').then(m => m.MiCuentaComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['condomino'] }
               },
               {
                    path: 'comunicados',
                    loadComponent: () => import('./pages/comunicados/comunicados.component').then(m => m.ComunicadosComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero', 'guardia', 'condomino'] }
               },
               {
                    path: 'encuestas',
                    loadComponent: () => import('./pages/encuestas/encuestas.component').then(m => m.EncuestasComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero', 'condomino'] }
               },
               {
                    path: 'porteria',
                    loadComponent: () => import('./pages/porteria/porteria.component').then(m => m.PorteriaComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'guardia', 'condomino'] }
               },
               {
                    path: 'morosidad',
                    loadComponent: () => import('./pages/morosidad/morosidad.component').then(m => m.MorosidadComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: GESTION, permission: 'pagos_departamentos' }
               },
               {
                    path: 'revision-pagos',
                    loadComponent: () => import('./pages/revision-pagos/revision-pagos.component').then(m => m.RevisionPagosComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: GESTION, permission: 'pagos_departamentos' }
               },
               {
                    path: 'estado-cuenta',
                    loadComponent: () => import('./pages/estado-cuenta/estado-cuenta.component').then(m => m.EstadoCuentaComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: GESTION, permission: 'pagos_departamentos' }
               },
               {
                    path: 'cargos',
                    loadComponent: () => import('./pages/cargos/cargos.component').then(m => m.CargosComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero'], permission: 'cargos' }
               },
               {
                    path: 'solicitudes',
                    loadComponent: () => import('./pages/solicitudes/solicitudes.component').then(m => m.SolicitudesComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'tesorero', 'condomino'] }
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
                    data: { roles: GESTION, permission: 'pagos_departamentos' }
               },
               {
                    path: 'departamentos/pagos-alicuota',
                    loadComponent: () => import('./pages/torre-pagos-alicuota/torre-pagos-alicuota.component').then(m => m.TorrePagosAlicuotaComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: GESTION, permission: 'pagos_departamentos' }
               },
               {
                    path: 'torres/:id/pagos-departamentos',
                    loadComponent: () => import('./pages/torre-pagos-alicuota/torre-pagos-alicuota.component').then(m => m.TorrePagosAlicuotaComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: GESTION, permission: 'pagos_departamentos' }
               },
               {
                    path: 'torres/pagar-alicuota', loadComponent: pagoAlicuotaTorre,
                    canActivate: [AuthGuard, RoleGuard], data: pagoAlicuotaTorreData
               },
               {
                    path: 'torres/pagar-alicuota/:torreId', loadComponent: pagoAlicuotaTorre,
                    canActivate: [AuthGuard, RoleGuard], data: pagoAlicuotaTorreData
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
                    path: 'acceso',
                    loadComponent: () => import('./pages/acceso-guardia/acceso-guardia.component').then(m => m.AccesoGuardiaComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto', 'guardia'], permission: 'control_acceso' }
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
                    path: 'finanzas/conjunto',
                    loadComponent: () => import('./pages/finanzas-dashboard/finanzas-dashboard.component').then(m => m.FinanzasDashboardComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto'], permission: 'gastos_comunes', financeScope: 'conjunto' }
               },
               {
                    path: 'finanzas/torres',
                    loadComponent: () => import('./pages/finanzas-dashboard/finanzas-dashboard.component').then(m => m.FinanzasDashboardComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['tesorero'], permission: 'gastos_comunes', financeScope: 'torre' }
               },
               {
                    path: 'usuarios', loadComponent: () => import('./pages/usuarios/usuarios.component').then(m => m.UsuariosComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto'], permission: 'usuarios' }
               },
               {
                    path: 'usuarios/crear', loadComponent: () => import('./pages/usuarios/usuarios.component').then(m => m.UsuariosComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto'], permission: 'usuarios_crear', mode: 'create' }
               },
               {
                    path: 'valores-alicuota',
                    loadComponent: () => import('./pages/valores-alicuota/valores-alicuota.component').then(m => m.ValoresAlicuotaComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: GESTION, permission: 'valores_alicuota' }
               },
               {
                    path: 'auditoria',
                    loadComponent: () => import('./pages/auditoria/auditoria.component').then(m => m.AuditoriaComponent),
                    canActivate: [AuthGuard, RoleGuard],
                    data: { roles: ['admin_general', 'admin_conjunto'], permission: 'auditoria' }
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
     },
     { path: '**', redirectTo: '' }

];

