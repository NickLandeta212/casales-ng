import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type EstadoMes = 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado';

export interface MesAlicuota {
  id: number | null;
  mes: number;
  anio: number;
  valor: string | number;
  estado: EstadoMes;
  motivo_rechazo: string | null;
  fecha_pago: string | null;
}

export interface MultaCuenta {
  id: number;
  monto: string | number;
  descripcion: string;
  fecha: string;
  motivo_nombre: string;
  estado: 'pendiente' | 'en_pago' | 'pagada';
}

export interface PagoMultasCuenta {
  id: number;
  total: string | number;
  estado: 'en_proceso' | 'aprobado' | 'rechazado';
  motivo_rechazo: string | null;
  created_at: string;
  multas: Array<{ motivo_nombre: string; monto: string | number }>;
}

export interface EstadoCuenta {
  departamento: { id: number; numero: string; torre_id: number; torre_numero: number };
  anio: number;
  alicuotas: MesAlicuota[];
  multas: MultaCuenta[];
  pagos_multas: PagoMultasCuenta[];
  resumen: { anio: number; alicuotas_adeudadas: number; multas_adeudadas: number; total_adeudado: number };
}

// Portal de pagos del condomino: el departamento lo determina el servidor segun la sesion.
@Injectable({
  providedIn: 'root'
})
export class MiCuentaService {
  private readonly apiUrl = `${environment.endpoint}/mi-cuenta`;

  constructor(private http: HttpClient) {}

  estado(anio: number): Observable<EstadoCuenta> {
    return this.http.get<EstadoCuenta>(`${this.apiUrl}/estado`, { params: { anio: String(anio) } });
  }

  pagarAlicuotas(body: { anio: number; meses: number[]; comprobante_base64: string; comprobante_nombre: string; email_destinatario: string }) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/pagos/alicuotas`, body);
  }

  pagarMultas(body: { multa_ids: number[]; total: number; comprobante_base64: string; email_destinatario: string }) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/pagos/multas`, body);
  }

  descargarFactura(tipo: 'alicuotas' | 'multas', id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/pagos/${tipo}/${id}/factura`, { responseType: 'blob' });
  }
}
