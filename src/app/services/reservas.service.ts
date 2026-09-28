import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CrearReservaPayload {
  departamento_id: number;
  fecha: string;
  observaciones?: string;
  captcha_token?: string;
}

export interface ReservaResponse {
  id: number;
  departamento_id: number;
  fecha: string;
  estado: 'en_proceso' | 'reservado' | 'rechazado' | string;
  observaciones?: string | null;
  motivo_rechazo?: string | null;
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

  aprobar(id: number): Observable<ReservaResponse> {
    return this.http.put<ReservaResponse>(`${this.apiUrl}/${id}/estado`, { estado: 'reservado' });
  }

  rechazar(id: number, motivo: string): Observable<ReservaResponse> {
    return this.http.put<ReservaResponse>(`${this.apiUrl}/${id}/rechazar`, { motivo });
  }

  subirComprobante(id: number, comprobante_base64: string): Observable<ReservaComprobanteResponse> {
    return this.http.post<ReservaComprobanteResponse>(`${this.apiUrl}/${id}/comprobante`, { comprobante_base64 });
  }
}
