import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const roles = next.data['roles'] as string[];
    const permission = next.data['permission'] as string | undefined;

    if (
      this.authService.isAuthenticated() &&
      this.authService.hasRole(roles) &&
      this.authService.hasPagePermission(permission)
    ) {
      return true;
    }

    // Redirigir si no tiene acceso
    this.router.navigate(['/dashboard/unauthorized']);
    return false;
  }
}
