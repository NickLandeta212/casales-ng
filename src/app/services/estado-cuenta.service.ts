import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EstadoCuenta } from './mi-cuenta.service';

export interface Certificado {
  id: number;
  numero: string;
  departamento_id: number;
  departamento_numero: string;
  torre_numero: number;
  titular: string | null;
  emitido_por_nombre: string | null;
  created_at: string;
}

// Estado de cuenta y paz y salvo de un departamento (tesorero de la torre).
@Injectable({
  providedIn: 'root'
})
export class EstadoCuentaService {
  private readonly apiUrl = `${environment.endpoint}/estado-cuenta`;

  constructor(private http: HttpClient) {}

  obtener(departamentoId: number, anio: number): Observable<EstadoCuenta> {
    return this.http.get<EstadoCuenta>(`${this.apiUrl}/departamentos/${departamentoId}`, { params: { anio: String(anio) } });
  }

  descargarPdf(departamentoId: number, anio: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/departamentos/${departamentoId}/pdf`, { params: { anio: String(anio) }, responseType: 'blob' });
  }

  emitirPazYSalvo(departamentoId: number): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/departamentos/${departamentoId}/paz-y-salvo`, {}, { responseType: 'blob' });
  }

  listarCertificados(departamentoId?: number | null): Observable<Certificado[]> {
    const params: Record<string, string> = departamentoId ? { departamento_id: String(departamentoId) } : {};
    return this.http.get<Certificado[]>(`${this.apiUrl}/certificados`, { params });
  }

  descargarCertificado(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/certificados/${id}/pdf`, { responseType: 'blob' });
  }
}
