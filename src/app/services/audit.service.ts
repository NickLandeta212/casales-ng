import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuditEntry {
  id: number;
  created_at: string;
  usuario_nombre: string | null;
  role: string | null;
  modulo: string;
  accion: string;
  detalle: string | null;
  metodo: string;
  ruta: string;
  status: number;
  ip: string | null;
}

// El servidor registra la auditoria automaticamente; el frontend solo la consulta.
@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private readonly apiUrl = `${environment.endpoint}/auditoria`;

  constructor(private http: HttpClient) {}

  getEntries(options: { limit?: number; modulo?: string } = {}): Observable<AuditEntry[]> {
    let params = new HttpParams().set('limit', String(options.limit ?? 300));

    if (options.modulo) {
      params = params.set('modulo', options.modulo);
    }

    return this.http.get<AuditEntry[]>(this.apiUrl, { params });
  }
}
