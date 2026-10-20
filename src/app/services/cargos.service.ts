import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CargoEmision {
  id: number;
  anio: number;
  mes: number;
  concepto: string;
  valor: string | number;
  torre_id: number | null;
  torre_numero: number | null;
  estado: 'activa' | 'revertida';
  motivo_reversion: string | null;
  creado_por_nombre: string | null;
  revertido_por_nombre: string | null;
  revertido_at: string | null;
  created_at: string;
  departamentos: number;
  pendientes: number;
  en_pago: number;
  pagados: number;
  total_recaudado: string | number;
}

export interface PagoCargos {
  id: number;
  departamento_id: number;
  departamento_numero: string;
  torre_id: number;
  torre_numero: number;
  total: string | number;
  comprobante_url: string;
  email_destinatario: string | null;
  estado: 'en_proceso' | 'aprobado' | 'rechazado';
  motivo_rechazo: string | null;
  created_at: string;
  cargos: Array<{ cargo_id: number; monto: string | number; concepto: string; anio: number; mes: number }>;
}

// Cargos extraordinarios: la administracion los emite y revierte; el tesorero revisa sus pagos.
@Injectable({
  providedIn: 'root'
})
export class CargosService {
  private readonly apiUrl = `${environment.endpoint}/cargos`;

  constructor(private http: HttpClient) {}

  listarEmisiones(): Observable<CargoEmision[]> {
    return this.http.get<CargoEmision[]>(`${this.apiUrl}/emisiones`);
  }

  emitir(body: { anio: number; mes: number; concepto: string; valor: number; torre_id: number | null }) {
    return this.http.post<{ message: string; emision: CargoEmision }>(`${this.apiUrl}/emisiones`, body);
  }

  revertir(id: number, motivo: string) {
    return this.http.put<{ message: string; emision: CargoEmision }>(`${this.apiUrl}/emisiones/${id}/revertir`, { motivo });
  }

  listarPagos(): Observable<PagoCargos[]> {
    return this.http.get<PagoCargos[]>(`${this.apiUrl}/pagos`);
  }

  aprobarPago(id: number | string) {
    return this.http.put<{ message: string }>(`${this.apiUrl}/pagos/${id}/aprobar`, {});
  }

  rechazarPago(id: number | string, motivo: string) {
    return this.http.put<{ message: string }>(`${this.apiUrl}/pagos/${id}/rechazar`, { motivo });
  }
}
