import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
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
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private loginService: LoginService,
    private authService: AuthService,
    private router: Router
  ) { }

  // Refresca rol, permisos y torres desde el servidor: los cambios que haga un
  // administrador se reflejan sin que el usuario tenga que volver a iniciar sesion.
  ngOnInit(): void {
    this.cerrarMenuMovilAlNavegar();

    this.loginService.me().subscribe({
      next: ({ user }) => {
        this.authService.applySessionUser(user);

        if (this.authService.mustChangePassword() && !this.router.url.startsWith('/dashboard/settings')) {
          this.router.navigate(['/dashboard/settings']);
        }
      }
    });
  }

  // En el celular el menu es un panel lateral (offcanvas): se cierra solo al elegir una pagina.
  private cerrarMenuMovilAlNavegar(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const panel = document.getElementById('sidebarMenu');
        const bootstrap = (window as any).bootstrap;

        if (panel?.classList.contains('show') && bootstrap?.Offcanvas) {
          bootstrap.Offcanvas.getOrCreateInstance(panel).hide();
        }
      });
  }
}
