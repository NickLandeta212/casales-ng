import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type SolicitudTipo = 'mantenimiento' | 'reclamo' | 'sugerencia';
export type SolicitudEstado = 'recibida' | 'en_proceso' | 'resuelta';

export type SolicitudAlcance = 'conjunto' | 'torre';

// A quien va dirigida: 'conjunto' la atiende la administracion; 'torre' el tesorero de esa torre.
export interface SolicitudDestino {
  alcance: SolicitudAlcance;
  torre_id: number | null;
  torre_numero: number | null;
}

// departamento_* es el departamento que la envio; es null si la envio el tesorero o la guardia.
export interface Solicitud extends SolicitudDestino {
  id: number;
  departamento_id: number | null;
  departamento_numero: string | null;
  departamento_torre_numero: number | null;
  tipo: SolicitudTipo;
  asunto: string;
  descripcion: string;
  estado: SolicitudEstado;
  respuesta: string | null;
  fotos: string[];
  creado_por_nombre: string | null;
  creado_por_role: string | null;
  atendido_por_nombre: string | null;
  // Lo calcula la API segun el rol: si este usuario puede responderla.
  puede_atender: boolean;
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

  // La API ya filtra segun el rol: departamento propio, torres del tesorero, las propias o todo el conjunto.
  listar(): Observable<Solicitud[]> {
    return this.http.get<Solicitud[]>(this.apiUrl);
  }

  // Destinos permitidos para el rol de la sesion.
  destinos(): Observable<SolicitudDestino[]> {
    return this.http.get<SolicitudDestino[]>(`${this.apiUrl}/destinos`);
  }

  crear(solicitud: {
    alcance: SolicitudAlcance;
    torre_id: number | null;
    tipo: SolicitudTipo;
    asunto: string;
    descripcion: string;
    fotos_base64: string[];
  }): Observable<Solicitud> {
    return this.http.post<Solicitud>(this.apiUrl, solicitud);
  }

  enlaceFoto(fotoUrl: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.apiUrl}/fotos/${String(fotoUrl).split('/').pop()}/enlace`);
  }

  atender(id: number, cambio: { estado: SolicitudEstado; respuesta: string }): Observable<Solicitud> {
    return this.http.put<Solicitud>(`${this.apiUrl}/${id}`, cambio);
  }
}
