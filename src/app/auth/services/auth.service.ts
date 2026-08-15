import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly allowedRoles = [
    'superadmin',
    'admin_general',
    'admin_conjunto',
    'tesorero',
    'guardia',
    'condomino',
    'residente',
    'propietario',
    'proveedor'
  ];
  private readonly allowedPermissions = [
    'home',
    'plataforma',
    'conjuntos',
    'torres',
    'pagos_alicuota',
    'pagos_alicuota_torre',
    'pagos_torres',
    'pagos_departamentos',
    'departamentos',
    'residentes',
    'propietarios',
    'inquilinos',
    'vehiculos',
    'parqueaderos',
    'mascotas',
    'visitantes',
    'control_acceso',
    'reservas',
    'comunicados',
    'incidencias',
    'documentos',
    'proveedores',
    'reportes',
    'finanzas',
    'cuentas_cobrar',
    'estados_cuenta',
    'mora',
    'recordatorios_pago',
    'gastos_comunes',
    'presupuestos',
    'automatizaciones',
    'asistente_ia',
    'marketplace',
    'marca_blanca',
    'multi_conjunto',
    'configuracion_conjunto',
    'auditoria',
    'personas',
    'personas_crear',
    'multas',
    'multas_crear',
    'usuarios',
    'usuarios_crear'
  ];
  private readonly sessionMaxIdleMs = 30 * 60 * 1000;
  private readonly defaultPermissionsByRole: Record<string, string[]> = {
    superadmin: this.allowedPermissions,
    admin_general: this.allowedPermissions,
    admin_conjunto: [
      'home', 'conjuntos', 'torres', 'pagos_alicuota', 'departamentos', 'residentes',
      'pagos_alicuota_torre', 'pagos_torres',
      'propietarios', 'inquilinos', 'vehiculos', 'parqueaderos', 'mascotas', 'visitantes',
      'control_acceso', 'reservas', 'comunicados', 'incidencias', 'documentos',
      'proveedores', 'reportes', 'personas', 'personas_crear', 'multas', 'multas_crear',
      'usuarios', 'usuarios_crear', 'gastos_comunes', 'recordatorios_pago', 'auditoria'
    ],
    tesorero: [
      'home', 'torres', 'pagos_departamentos', 'departamentos', 'reservas', 'personas', 'multas',
      'finanzas', 'cuentas_cobrar', 'estados_cuenta', 'mora', 'recordatorios_pago',
      'gastos_comunes', 'presupuestos', 'reportes'
    ],
    guardia: ['home', 'visitantes', 'control_acceso', 'incidencias'],
    condomino: ['home', 'reservas', 'visitantes', 'pagos_alicuota'],
    residente: ['home', 'vehiculos', 'mascotas', 'visitantes', 'reservas', 'incidencias', 'documentos', 'pagos_alicuota'],
    propietario: ['home', 'vehiculos', 'mascotas', 'reservas', 'incidencias', 'documentos', 'estados_cuenta'],
    proveedor: ['home', 'control_acceso', 'incidencias']
  };

  private tokenSubject = new BehaviorSubject<string | null>(this.getTokenFromStorage());

  constructor(private router: Router) { }

  get token$() {
    return this.tokenSubject.asObservable();
  }

  setToken(token: string) {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('last_activity', Date.now().toString());
    this.tokenSubject.next(token);
  }

  getToken(): string | null {
    const token = this.tokenSubject.value || this.getTokenFromStorage();

    if (!token || this.isTokenExpired(token) || this.isSessionIdle()) {
      this.clearSession();
      return null;
    }

    this.touchSession();
    this.tokenSubject.next(token);
    return token;
  }

  private getTokenFromStorage(): string | null {
    return sessionStorage.getItem('token') || localStorage.getItem('token');
  }



  setSession(token: string, roles: string[], userName: string) {
    const normalizedRoles = roles
      .map((role) => String(role || '').trim())
      .filter((role) => this.allowedRoles.includes(role));

    sessionStorage.setItem('token', token);
    sessionStorage.setItem('role', JSON.stringify(normalizedRoles));
    sessionStorage.setItem('user_display_name', this.sanitizeDisplayText(userName || 'Usuario'));
    sessionStorage.setItem('last_activity', Date.now().toString());
    this.clearLegacyLocalStorage();
    this.tokenSubject.next(token);

  }

  getUserRole(): string {
    const rawRole = sessionStorage.getItem('role') || localStorage.getItem('role') || 'vendor';

    try {
      const parsed = JSON.parse(rawRole);
      const role = Array.isArray(parsed) ? parsed[0] || 'residente' : String(parsed);
      return this.allowedRoles.includes(role) ? role : 'residente';
    } catch {
      return this.allowedRoles.includes(rawRole) ? rawRole : 'residente';
    }
  }

  hasRole(allowedRoles: string[]): boolean {
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    return allowedRoles.includes(this.getUserRole());
  }

  setPermissions(pagePermissions: string[], torreIds: number[]): void {
    const permissions = (pagePermissions || [])
      .map((permission) => String(permission || '').trim())
      .filter((permission) => this.allowedPermissions.includes(permission));
    const authorizedTorreIds = (torreIds || [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);

    sessionStorage.setItem('page_permissions', JSON.stringify(Array.from(new Set(permissions))));
    sessionStorage.setItem('torre_ids', JSON.stringify(Array.from(new Set(authorizedTorreIds))));
  }

  getPagePermissions(): string[] {
    try {
      const raw = sessionStorage.getItem('page_permissions') || localStorage.getItem('page_permissions') || '[]';
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.map((item) => String(item)).filter((item) => this.allowedPermissions.includes(item))
        : [];
    } catch {
      return [];
    }
  }

  getAuthorizedTorreIds(): number[] {
    try {
      const raw = sessionStorage.getItem('torre_ids') || localStorage.getItem('torre_ids') || '[]';
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0)
        : [];
    } catch {
      return [];
    }
  }

  hasPagePermission(permission?: string): boolean {
    if (!permission || ['superadmin', 'admin_general'].includes(this.getUserRole())) {
      return true;
    }

    const permissions = this.getPagePermissions();
    const rolePermissions = this.defaultPermissionsByRole[this.getUserRole()] || [];

    if (permission === 'pagos_alicuota' && permissions.includes('pagos_torres')) {
      return true;
    }

    return permissions.includes(permission) || rolePermissions.includes(permission);
  }

  isAuthenticated(): boolean {
    const token = this.getTokenFromStorage();

    if (!token) {
      return false;
    }

    if (this.isTokenExpired(token) || this.isSessionIdle()) {
      this.clearSession();
      return false;
    }

    this.touchSession();
    return true;
  }

  getDisplayName(): string {
    const displayName = sessionStorage.getItem('user_display_name') || localStorage.getItem('user_display_name') || 'Usuario';
    return this.sanitizeDisplayText(displayName);
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/']);
  }

  clearSession(): void {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('page_permissions');
    sessionStorage.removeItem('torre_ids');
    sessionStorage.removeItem('user_display_name');
    sessionStorage.removeItem('last_activity');
    this.clearLegacyLocalStorage();
    this.tokenSubject.next(null);
  }

  private clearLegacyLocalStorage(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('page_permissions');
    localStorage.removeItem('torre_ids');
    localStorage.removeItem('user_display_name');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user');
  }

  private isTokenExpired(token: string): boolean {
    const [, payload] = token.split('.');

    if (!payload) {
      return false;
    }

    try {
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(normalized));
      return typeof decoded.exp === 'number' && decoded.exp * 1000 <= Date.now();
    } catch {
      return false;
    }
  }

  private isSessionIdle(): boolean {
    const lastActivity = Number(sessionStorage.getItem('last_activity') || 0);
    return lastActivity > 0 && Date.now() - lastActivity > this.sessionMaxIdleMs;
  }

  private touchSession(): void {
    sessionStorage.setItem('last_activity', Date.now().toString());
  }

  private sanitizeDisplayText(value: string): string {
    return String(value || '')
      .replace(/[<>]/g, '')
      .trim()
      .slice(0, 80) || 'Usuario';
  }

}
