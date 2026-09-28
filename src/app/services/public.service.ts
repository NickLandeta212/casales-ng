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

// Endpoints sin sesion que usa el formulario publico de reservas.
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

  getFechasOcupadas(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/reservas/fechas-ocupadas`);
  }
}
