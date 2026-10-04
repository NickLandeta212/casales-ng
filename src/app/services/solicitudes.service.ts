import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type SolicitudTipo = 'mantenimiento' | 'reclamo' | 'sugerencia';
export type SolicitudEstado = 'recibida' | 'en_proceso' | 'resuelta';

export interface Solicitud {
  id: number;
  departamento_id: number;
  departamento_numero: string;
  torre_id: number;
  torre_numero: number;
  tipo: SolicitudTipo;
  asunto: string;
  descripcion: string;
  estado: SolicitudEstado;
  respuesta: string | null;
  atendido_por_nombre: string | null;
  created_at: string;
  updated_at: string;
}

export const SOLICITUD_TIPO_LABELS: Record<SolicitudTipo, string> = {
  mantenimiento: 'Mantenimiento',
  reclamo: 'Reclamo',
  sugerencia: 'Sugerencia'
};

export const SOLICITUD_ESTADO_LABELS: Record<SolicitudEstado, string> = {
  recibida: 'Recibida',
  en_proceso: 'En proceso',
  resuelta: 'Resuelta'
};

@Injectable({
  providedIn: 'root'
})
export class SolicitudesService {
  private readonly apiUrl = `${environment.endpoint}/solicitudes`;

  constructor(private http: HttpClient) {}

  // La API ya filtra segun el rol: departamento propio, torres del tesorero o todo el conjunto.
  listar(): Observable<Solicitud[]> {
    return this.http.get<Solicitud[]>(this.apiUrl);
  }

  crear(solicitud: { tipo: SolicitudTipo; asunto: string; descripcion: string }): Observable<Solicitud> {
    return this.http.post<Solicitud>(this.apiUrl, solicitud);
  }

  atender(id: number, cambio: { estado: SolicitudEstado; respuesta: string }): Observable<Solicitud> {
    return this.http.put<Solicitud>(`${this.apiUrl}/${id}`, cambio);
  }
}
