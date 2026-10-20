import { Injectable } from '@angular/core';
import { CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';

const PASSWORD_CHANGE_URL = '/dashboard/settings';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(_route: unknown, state: RouterStateSnapshot): boolean | UrlTree {
    // Sin sesion se va al login recordando la pagina pedida, para volver a ella al entrar.
    if (!this.authService.isAuthenticated()) {
      return this.router.createUrlTree([''], { queryParams: { returnUrl: state.url } });
    }

    // Con contrasena temporal solo se permite la pagina para cambiarla.
    if (this.authService.mustChangePassword() && !state.url.startsWith(PASSWORD_CHANGE_URL)) {
      return this.router.parseUrl(PASSWORD_CHANGE_URL);
    }

    return true;
  }
}
