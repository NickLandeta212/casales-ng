import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private tokenSubject = new BehaviorSubject<string | null>(this.getTokenFromStorage());

  constructor(private router: Router) { }

  get token$() {
    return this.tokenSubject.asObservable();
  }

  setToken(token: string) {
    localStorage.setItem('token', token);
    this.tokenSubject.next(token);
  }

  getToken(): string | null {
    return this.tokenSubject.value;
  }

  private getTokenFromStorage(): string | null {
    return localStorage.getItem('token');
  }



  setSession(token: string, roles: string[], userName: string) {
    localStorage.setItem('token', token);
    localStorage.setItem('role', JSON.stringify(roles));
    localStorage.setItem('user_display_name', userName);

  }

  getUserRole(): string {
    const rawRole = localStorage.getItem('role') || 'vendor';

    try {
      const parsed = JSON.parse(rawRole);
      return Array.isArray(parsed) ? parsed[0] || 'vendor' : String(parsed);
    } catch {
      return rawRole;
    }
  }

  hasRole(allowedRoles: string[]): boolean {
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    return allowedRoles.includes(this.getUserRole());
  }

  setPermissions(pagePermissions: string[], torreIds: number[]): void {
    localStorage.setItem('page_permissions', JSON.stringify(pagePermissions || []));
    localStorage.setItem('torre_ids', JSON.stringify(torreIds || []));
  }

  getPagePermissions(): string[] {
    try {
      const parsed = JSON.parse(localStorage.getItem('page_permissions') || '[]');
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }

  getAuthorizedTorreIds(): number[] {
    try {
      const parsed = JSON.parse(localStorage.getItem('torre_ids') || '[]');
      return Array.isArray(parsed)
        ? parsed.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0)
        : [];
    } catch {
      return [];
    }
  }

  hasPagePermission(permission?: string): boolean {
    if (!permission || this.getUserRole() === 'admin_general') {
      return true;
    }

    const permissions = this.getPagePermissions();

    if (permission === 'pagos_alicuota' && permissions.includes('pagos_torres')) {
      return true;
    }

    return permissions.includes(permission);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('page_permissions');
    localStorage.removeItem('torre_ids');
    localStorage.removeItem('user_display_name');
    this.router.navigate(['/']);
  }


}
