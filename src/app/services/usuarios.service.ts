import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { map, switchMap, tap } from 'rxjs/operators';

export interface Usuario {
  id?: number | string;
  nombre: string;
  email: string;
  role: string;
  page_permissions: string[];
  torre_ids: number[];
  created_at?: string;
}

export interface UsuarioDraft {
  nombre: string;
  email: string;
  password: string;
  role: string;
  torre_id: number;
  page_permissions?: string[];
  torre_ids?: number[];
}

export interface UsuarioPermissionsDraft {
  nombre: string;
  email: string;
  role: string;
  page_permissions: string[];
  torre_ids: number[];
}

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private readonly apiUrl = `${environment.endpoint}/usuarios`;
  private readonly usuariosSubject = new BehaviorSubject<Usuario[]>([]);
  readonly usuarios$ = this.usuariosSubject.asObservable();

  constructor(private http: HttpClient) { }

  getSnapshot(): Usuario[] {
    return this.usuariosSubject.value;
  }

  loadUsers() {
    return this.http.get<any>(this.apiUrl).pipe(
      map(res => this.normalizeList(res)),
      tap(lista => this.usuariosSubject.next(lista))
    );
  }

  addUsuario(usuario: UsuarioDraft) {
    return this.http.post<any>(this.apiUrl, usuario).pipe(
      switchMap(() => this.loadUsers())
    );
  }

  updateUsuario(id: number | string, usuario: UsuarioPermissionsDraft) {
    return this.http.put<any>(`${this.apiUrl}/${id}`, usuario).pipe(
      switchMap(() => this.loadUsers())
    );
  }

  deleteUsuario(id: number | string) {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      switchMap(() => this.loadUsers())
    );
  }

  private normalizeList(res: any): Usuario[] {
    const raw = Array.isArray(res) ? res : res?.data;
    const lista = Array.isArray(raw) ? raw : [];

    return lista.map((item: any) => ({
      id: item.id ?? item._id,
      nombre: String(item.nombre ?? '').trim(),
      email: String(item.email ?? '').trim(),
      role: String(item.role ?? '').trim(),
      page_permissions: Array.isArray(item.page_permissions) ? item.page_permissions.map((value: any) => String(value)) : [],
      torre_ids: Array.isArray(item.torre_ids)
        ? item.torre_ids.map((value: any) => Number(value)).filter((value: number) => Number.isInteger(value) && value > 0)
        : [],
      created_at: item.created_at
    })).filter(u => u.id !== undefined && u.id !== null);
  }
}
