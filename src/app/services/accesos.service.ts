import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type AutorizacionAcceso = 'pendiente' | 'autorizado' | 'rechazado';
export type EstadoAcceso = 'en_porteria' | 'ingreso' | 'salio' | 'rechazado';

export interface RegistroAcceso {
  id: number;
  torre: string;
  departamento: string;
  duenio_contactado: string;
  visitante: string;
  documento: string | null;
  placa_vehiculo: string | null;
  hora_ingreso_vehiculo: string | null;
  autorizacion: AutorizacionAcceso;
  estado: EstadoAcceso;
  observacion: string | null;
  ingreso_at: string | null;
  salida_at: string | null;
  created_at: string;
  registrado_por_nombre?: string | null;
}

export type NuevoRegistroAcceso = Pick<RegistroAcceso,
  'torre' | 'departamento' | 'duenio_contactado' | 'visitante' | 'documento' | 'placa_vehiculo' |
  'hora_ingreso_vehiculo' | 'autorizacion' | 'observacion'>;

@Injectable({
  providedIn: 'root'
})
export class AccesosService {
  private readonly apiUrl = `${environment.endpoint}/accesos`;

  constructor(private http: HttpClient) {}

  listar(): Observable<RegistroAcceso[]> {
    return this.http.get<RegistroAcceso[]>(this.apiUrl);
  }

  registrar(registro: NuevoRegistroAcceso): Observable<RegistroAcceso> {
    return this.http.post<RegistroAcceso>(this.apiUrl, registro);
  }

  cambiarEstado(id: number, accion: 'autorizar' | 'rechazar' | 'salida'): Observable<RegistroAcceso> {
    return this.http.put<RegistroAcceso>(`${this.apiUrl}/${id}/${accion}`, {});
  }
}
