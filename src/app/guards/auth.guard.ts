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
    if (!this.authService.isAuthenticated()) {
      return this.router.parseUrl('');
    }

    // Con contrasena temporal solo se permite la pagina para cambiarla.
    if (this.authService.mustChangePassword() && !state.url.startsWith(PASSWORD_CHANGE_URL)) {
      return this.router.parseUrl(PASSWORD_CHANGE_URL);
    }

    return true;
  }
}
