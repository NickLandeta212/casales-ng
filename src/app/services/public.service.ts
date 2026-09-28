import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PublicTorre {
  id: number;
  numero: number;
}

export interface PublicDepartamento {
  id: number;
  numero: string;
  torre_id: number;
  torre_numero: number;
}

export interface PublicMultaPendiente {
  id: number;
  monto: number;
  descripcion: string;
  fecha: string;
  motivo_nombre: string;
}

// Endpoints sin sesion que usan los formularios publicos (QR).
@Injectable({
  providedIn: 'root'
})
export class PublicService {
  private readonly apiUrl = `${environment.endpoint}/public`;

  constructor(private http: HttpClient) {}

  getTorres(): Observable<PublicTorre[]> {
    return this.http.get<PublicTorre[]>(`${this.apiUrl}/torres`);
  }

  getDepartamentos(torreId: number | string): Observable<PublicDepartamento[]> {
    return this.http.get<PublicDepartamento[]>(`${this.apiUrl}/torres/${torreId}/departamentos`);
  }

  getMultasPendientes(departamentoId: number | string): Observable<PublicMultaPendiente[]> {
    return this.http.get<PublicMultaPendiente[]>(`${this.apiUrl}/departamentos/${departamentoId}/multas-pendientes`);
  }

  getFechasOcupadas(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/reservas/fechas-ocupadas`);
  }
}
