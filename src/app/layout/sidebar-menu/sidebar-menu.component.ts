import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { CommonModule } from '@angular/common';

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
      roles: ['admin_general']
    },
    {
      title: 'Torres',
      icon: 'bi bi-building',
      roles: ['admin_general'],
      children: [
        {
          title: 'Todos',
          icon: 'bi bi-list-ul',
          link: '/dashboard/torres',
          roles: ['admin_general']
        },
        {
          title: 'Aprobar pagos',
          icon: 'bi bi-receipt-cutoff',
          link: '/dashboard/torres/pagos-alicuota',
          roles: ['admin_general']
        }
      ]
    },
    {
      title: 'Departamentos',
      icon: 'bi bi-door-open',
      link: '/dashboard/departamentos',
      roles: ['admin_general']
    },
    {
      title: 'Reservas',
      icon: 'bi bi-calendar-check',
      roles: ['admin_general'],
      children: [
        {
          title: 'Todas',
          icon: 'bi bi-list-ul',
          link: '/dashboard/reservas',
          roles: ['admin_general']
        }
      ]
    },
    {
      title: 'Personas',
      icon: 'bi bi-people',
      roles: ['admin_general'],
      children: [
        {
          title: 'Todos',
          icon: 'bi bi-list-ul',
          link: '/dashboard/personas',
          roles: ['admin_general']
        },
        {
          title: 'Crear nueva persona',
          icon: 'bi bi-person-plus',
          link: '/dashboard/personas/crear',
          roles: ['admin_general']
        }
      ]
    },
    {
      title: 'Multas',
      icon: 'bi bi-exclamation-triangle',
      roles: ['admin_general'],
      children: [
        {
          title: 'Todas',
          icon: 'bi bi-list-ul',
          link: '/dashboard/multas',
          roles: ['admin_general']
        },
        {
          title: 'Añadir multa',
          icon: 'bi bi-plus-circle',
          link: '/dashboard/multas/crear',
          roles: ['admin_general']
        }
      ]
    },
    {
      title: 'Usuarios',
      icon: 'bi bi-person-gear',
      roles: ['admin_general'],
      children: [
        {
          title: 'Todos',
          icon: 'bi bi-list-ul',
          link: '/dashboard/usuarios',
          roles: ['admin_general']
        },
        {
          title: 'Crear nuevo usuario',
          icon: 'bi bi-person-add',
          link: '/dashboard/usuarios/crear',
          roles: ['admin_general']
        }
      ]
    },
    {
      title: 'Ajustes',
      icon: 'bi bi-sliders',
      roles: ['admin_general'],
      children: [
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
    return this.authService.hasRole(item.roles);
  }
}
