import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CrearReservaPayload {
  departamento_id: number;
  fecha: string;
  estado: 'disponible' | 'en_proceso' | 'reservado';
  observaciones?: string;
}

export interface ReservaResponse {
  id: number;
  departamento_id: number;
  fecha: string;
  estado: string;
  observaciones?: string | null;
  departamento_numero?: string;
  torre_numero?: string;
}

export interface ReservaComprobanteResponse {
  message: string;
  reserva: ReservaResponse;
  comprobante_url: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReservasService {
  private apiUrl = `${environment.endpoint}/reservas`;

  constructor(private http: HttpClient) { }

  listar(): Observable<ReservaResponse[]> {
    return this.http.get<ReservaResponse[]>(this.apiUrl);
  }

  crear(payload: CrearReservaPayload): Observable<ReservaResponse> {
    return this.http.post<ReservaResponse>(this.apiUrl, payload);
  }

  actualizarEstado(id: number, estado: 'disponible' | 'en_proceso' | 'reservado'): Observable<ReservaResponse> {
    return this.http.put<ReservaResponse>(`${this.apiUrl}/${id}/estado`, { estado });
  }

  subirComprobante(id: number, comprobante_base64: string): Observable<ReservaComprobanteResponse> {
    return this.http.post<ReservaComprobanteResponse>(`${this.apiUrl}/${id}/comprobante`, { comprobante_base64 });
  }
}
