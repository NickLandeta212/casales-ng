import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface VisitaAnunciada {
  id: number;
  departamento_id: number;
  departamento_numero: string;
  torre_numero: number;
  visitante: string;
  documento: string | null;
  placa_vehiculo: string | null;
  fecha: string;
  es_hoy: boolean;
  nota: string | null;
  estado: 'anunciada' | 'ingreso' | 'cancelada';
  created_at: string;
}

export interface Paquete {
  id: number;
  departamento_id: number;
  departamento_numero: string;
  torre_numero: number;
  descripcion: string;
  estado: 'en_porteria' | 'entregado';
  entregado_a: string | null;
  entregado_at: string | null;
  recibido_por_nombre: string | null;
  created_at: string;
}

export interface DepartamentoPorteria {
  id: number;
  numero: string;
  torre_numero: number;
}

export type NuevaVisita = Pick<VisitaAnunciada, 'visitante' | 'documento' | 'placa_vehiculo' | 'fecha' | 'nota'>;

@Injectable({
  providedIn: 'root'
})
export class PorteriaService {
  private readonly apiUrl = `${environment.endpoint}/porteria`;

  constructor(private http: HttpClient) {}

  // Residente: las de su departamento. Guardia y administracion: las de hoy y las proximas.
  listarVisitas(): Observable<VisitaAnunciada[]> {
    return this.http.get<VisitaAnunciada[]>(`${this.apiUrl}/visitas`);
  }

  anunciarVisita(visita: NuevaVisita): Observable<VisitaAnunciada> {
    return this.http.post<VisitaAnunciada>(`${this.apiUrl}/visitas`, visita);
  }

  cancelarVisita(id: number): Observable<VisitaAnunciada> {
    return this.http.put<VisitaAnunciada>(`${this.apiUrl}/visitas/${id}/cancelar`, {});
  }

  registrarIngreso(id: number): Observable<VisitaAnunciada> {
    return this.http.put<VisitaAnunciada>(`${this.apiUrl}/visitas/${id}/ingreso`, {});
  }

  listarPaquetes(): Observable<Paquete[]> {
    return this.http.get<Paquete[]>(`${this.apiUrl}/paquetes`);
  }

  registrarPaquete(paquete: { departamento_id: number; descripcion: string }): Observable<Paquete> {
    return this.http.post<Paquete>(`${this.apiUrl}/paquetes`, paquete);
  }

  entregarPaquete(id: number, entregado_a: string): Observable<Paquete> {
    return this.http.put<Paquete>(`${this.apiUrl}/paquetes/${id}/entregar`, { entregado_a });
  }

  listarDepartamentos(): Observable<DepartamentoPorteria[]> {
    return this.http.get<DepartamentoPorteria[]>(`${this.apiUrl}/departamentos`);
  }
}
