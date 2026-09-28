import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { LoginService } from '../../auth/services/login.service';
import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { SidebarMenuComponent } from '../sidebar-menu/sidebar-menu.component';

@Component({
  selector: 'app-dashboard',
  imports: [RouterModule, NavbarComponent, SidebarComponent, SidebarMenuComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  constructor(
    private loginService: LoginService,
    private authService: AuthService,
    private router: Router
  ) { }

  // Refresca rol, permisos y torres desde el servidor: los cambios que haga un
  // administrador se reflejan sin que el usuario tenga que volver a iniciar sesion.
  ngOnInit(): void {
    this.loginService.me().subscribe({
      next: ({ user }) => {
        this.authService.applySessionUser(user);

        if (this.authService.mustChangePassword() && !this.router.url.startsWith('/dashboard/settings')) {
          this.router.navigate(['/dashboard/settings']);
        }
      }
    });
  }
}
