import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type Frecuencia = 'unica' | 'mensual' | 'trimestral' | 'semestral' | 'anual';

export interface Mantenimiento {
  id: number;
  titulo: string;
  descripcion: string | null;
  area: string | null;
  proveedor_id: number | null;
  proveedor_nombre: string | null;
  costo_estimado: string | number | null;
  frecuencia: Frecuencia;
  proxima_fecha: string;
  dias_aviso: number;
  activo: boolean;
  dias_restantes: number;
  ultima_ejecucion: string | null;
}

export interface EjecucionMantenimiento {
  id: number;
  fecha: string;
  observaciones: string | null;
  costo: string | number | null;
  registrado_por_nombre: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class MantenimientosService {
  private readonly apiUrl = `${environment.endpoint}/mantenimientos`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Mantenimiento[]> {
    return this.http.get<Mantenimiento[]>(this.apiUrl);
  }

  proximos(): Observable<Mantenimiento[]> {
    return this.http.get<Mantenimiento[]>(`${this.apiUrl}/proximos`);
  }

  ejecuciones(id: number): Observable<EjecucionMantenimiento[]> {
    return this.http.get<EjecucionMantenimiento[]>(`${this.apiUrl}/${id}/ejecuciones`);
  }

  guardar(body: Partial<Mantenimiento>, id?: number): Observable<Mantenimiento> {
    return id ? this.http.put<Mantenimiento>(`${this.apiUrl}/${id}`, body) : this.http.post<Mantenimiento>(this.apiUrl, body);
  }

  realizar(id: number, body: { fecha: string; observaciones: string | null; costo: number | null }) {
    return this.http.post<{ message: string; mantenimiento: Mantenimiento }>(`${this.apiUrl}/${id}/realizar`, body);
  }
}
