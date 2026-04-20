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
    return localStorage.getItem('role') || 'vendor';
  }

  hasRole(allowedRoles: string[]): boolean {
    return allowedRoles.includes(this.getUserRole());
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user_display_name');
    this.router.navigate(['/login']);
  }


}
