import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-user-menu',
  imports: [RouterModule, CommonModule],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss'
})
export class UserMenuComponent implements OnInit {

  constructor(public authService: AuthService) { }

  ngOnInit(): void {

  }

  menu = [
    {
      title: 'Configuración',
      icon: 'bi bi-gear',
      link: '/dashboard/settings',
      roles: ['admin_general']
    },
    {
      title: 'Cerrar Sesión',
      icon: 'bi bi-box-arrow-right',
      action: () => this.logout(),
      roles: ['admin_general']
    }
  ];

  canShow(item: any): boolean {
    return this.authService.hasRole(item.roles);
  }

  logout() {
    this.authService.logout();
  }
}



