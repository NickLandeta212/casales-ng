import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { CommonModule } from '@angular/common';

const CASALES_ADMIN_ROLES = ['superadmin', 'admin_general', 'admin_conjunto'];
const CASALES_FINANCE_ROLES = ['superadmin', 'admin_general', 'admin_conjunto', 'tesorero'];
const CASALES_RESIDENT_ROLES = ['superadmin', 'admin_general', 'admin_conjunto', 'condomino', 'residente', 'propietario'];
const CASALES_SECURITY_ROLES = ['superadmin', 'admin_general', 'admin_conjunto', 'guardia'];

@Component({
  selector: 'app-sidebar-menu',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './sidebar-menu.component.html',
  styleUrl: './sidebar-menu.component.scss'
})
export class SidebarMenuComponent implements OnInit {

  constructor(public authService: AuthService) { }

  ngOnInit(): void {}

  menu: any[] = [
    {
      title: 'Inicio',
      icon: 'bi bi-house-door',
      link: '/dashboard/home',
      roles: ['superadmin', 'admin_general', 'admin_conjunto', 'tesorero', 'guardia', 'condomino', 'residente', 'propietario', 'proveedor'],
      permission: 'home'
    },
    {
      title: 'Torres',
      icon: 'bi bi-building',
      roles: CASALES_FINANCE_ROLES,
      permission: 'torres',
      children: [
        {
          title: 'Todos',
          icon: 'bi bi-list-ul',
          link: '/dashboard/torres',
          roles: CASALES_FINANCE_ROLES,
          permission: 'torres'
        },
        {
          title: 'Pagos por torres',
          icon: 'bi bi-building-check',
          link: '/dashboard/torres/pagos-alicuota',
          roles: CASALES_ADMIN_ROLES,
          permission: 'pagos_alicuota'
        },
        {
          title: 'Link de pago',
          icon: 'bi bi-credit-card',
          link: '/pago-alicuota-torre',
          dynamicLink: 'pago-alicuota-torre-tesorero',
          target: '_blank',
          roles: CASALES_ADMIN_ROLES,
          permission: 'pagos_alicuota_torre'
        }
      ]
    },
    {
      title: 'Departamentos',
      icon: 'bi bi-door-open',
      roles: CASALES_FINANCE_ROLES,
      permission: 'departamentos',
      children: [
        {
          title: 'Todos',
          icon: 'bi bi-list-ul',
          link: '/dashboard/departamentos',
          roles: CASALES_FINANCE_ROLES,
          permission: 'departamentos'
        },
        {
          title: 'Pagos departamentos',
          icon: 'bi bi-receipt-cutoff',
          link: '/dashboard/departamentos/pagos-alicuota',
          roles: ['tesorero'],
          permission: 'pagos_departamentos'
        }
      ]
    },
    {
      title: 'Acceso',
      icon: 'bi bi-shield-check',
      link: '/dashboard/acceso',
      roles: CASALES_SECURITY_ROLES,
      permission: 'control_acceso'
    },
    {
      title: 'Reservas',
      icon: 'bi bi-calendar-check',
      roles: CASALES_RESIDENT_ROLES,
      permission: 'reservas',
      children: [
        {
          title: 'Todas',
          icon: 'bi bi-list-ul',
          link: '/dashboard/reservas',
          roles: CASALES_RESIDENT_ROLES,
          permission: 'reservas'
        },
        {
          title: 'Formulario de reserva',
          icon: 'bi bi-box-arrow-up-right',
          link: '/reserva',
          roles: CASALES_RESIDENT_ROLES,
          permission: 'reservas'
        }
      ]
    },
    {
      title: 'Personas',
      icon: 'bi bi-people',
      roles: CASALES_FINANCE_ROLES,
      permission: 'personas',
      children: [
        {
          title: 'Todos',
          icon: 'bi bi-list-ul',
          link: '/dashboard/personas',
          roles: CASALES_FINANCE_ROLES,
          permission: 'personas'
        },
        {
          title: 'Crear nueva persona',
          icon: 'bi bi-person-plus',
          link: '/dashboard/personas/crear',
          roles: CASALES_FINANCE_ROLES,
          permission: 'personas_crear'
        }
      ]
    },
    {
      title: 'Multas',
      icon: 'bi bi-exclamation-triangle',
      roles: CASALES_FINANCE_ROLES,
      permission: 'multas',
      children: [
        {
          title: 'Todas',
          icon: 'bi bi-list-ul',
          link: '/dashboard/multas',
          roles: CASALES_FINANCE_ROLES,
          permission: 'multas'
        },
        {
          title: 'Añadir multa',
          icon: 'bi bi-plus-circle',
          link: '/dashboard/multas/crear',
          roles: CASALES_FINANCE_ROLES,
          permission: 'multas_crear'
        },
        {
          title: 'Formulario de pago',
          icon: 'bi bi-box-arrow-up-right',
          link: '/pago-multa',
          roles: CASALES_FINANCE_ROLES,
          permission: 'multas'
        }
      ]
    },
    {
      title: 'Finanzas',
      icon: 'bi bi-cash-coin',
      roles: CASALES_FINANCE_ROLES,
      permission: 'gastos_comunes',
      children: [
        { title: 'Finanzas del conjunto', icon: 'bi bi-bank', link: '/dashboard/finanzas/conjunto', roles: CASALES_ADMIN_ROLES, permission: 'gastos_comunes' },
        { title: 'Finanzas de torres', icon: 'bi bi-building-check', link: '/dashboard/finanzas/torres', roles: ['tesorero'], permission: 'gastos_comunes' }
      ]
    },
    {
      title: 'Usuarios',
      icon: 'bi bi-person-gear',
      roles: CASALES_ADMIN_ROLES,
      permission: 'usuarios',
      children: [
        {
          title: 'Todos',
          icon: 'bi bi-list-ul',
          link: '/dashboard/usuarios',
          roles: CASALES_ADMIN_ROLES,
          permission: 'usuarios'
        },
        {
          title: 'Crear nuevo usuario',
          icon: 'bi bi-person-add',
          link: '/dashboard/usuarios/crear',
          roles: CASALES_ADMIN_ROLES,
          permission: 'usuarios_crear'
        }
      ]
    },
    {
      title: 'Ajustes',
      icon: 'bi bi-sliders',
      roles: ['superadmin', 'admin_general'],
      children: [
        {
          title: 'Auditoría',
          icon: 'bi bi-shield-lock',
          link: '/dashboard/auditoria',
          roles: CASALES_ADMIN_ROLES,
          permission: 'auditoria'
        },
        {
          title: 'Emails',
          icon: 'bi bi-envelope-paper',
          link: '/dashboard/emails',
          roles: ['admin_general']
        }
      ]
    }
  ];

  canShow(item: any): boolean {
    return this.authService.hasRole(item.roles) && this.authService.hasPagePermission(item.permission);
  }

  getLink(item: any): string {
    if (item?.dynamicLink === 'pago-alicuota-torre-tesorero') {
      const [torreId] = this.authService.getAuthorizedTorreIds();
      return torreId ? `/pago-alicuota-torre/${torreId}` : '/pago-alicuota-torre';
    }

    return item?.link || '/dashboard/home';
  }
}

