import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Categoria {
  key: string;
  label: string;
}

export interface Proveedor {
  id: number;
  nombre: string;
  ruc: string;
  telefono: string | null;
  email: string | null;
  activo: boolean;
}

export type EstadoEgreso = 'pendiente' | 'pagado' | 'anulado';

export interface Egreso {
  id: number;
  alcance: 'conjunto' | 'torre';
  torre_id: number | null;
  torre_numero: number | null;
  proveedor_id: number;
  proveedor_nombre: string;
  proveedor_ruc: string;
  categoria: string;
  concepto: string;
  numero_documento: string | null;
  fecha: string;
  valor: string | number;
  estado: EstadoEgreso;
  fecha_pago: string | null;
  comprobante_url: string | null;
  motivo_anulacion: string | null;
  anulado_at: string | null;
  anulado_por_nombre: string | null;
  creado_por_nombre: string | null;
  created_at: string;
}

export interface NuevoEgreso {
  alcance: 'conjunto' | 'torre';
  torre_id: number | null;
  proveedor_id: number;
  categoria: string;
  concepto: string;
  numero_documento: string | null;
  fecha: string;
  valor: number;
  estado: 'pendiente' | 'pagado';
  fecha_pago?: string | null;
  comprobante_base64?: string | null;
}

// Egresos (gastos y ordenes de compra) y catalogo de proveedores.
@Injectable({
  providedIn: 'root'
})
export class EgresosService {
  private readonly apiUrl = `${environment.endpoint}/egresos`;

  constructor(private http: HttpClient) {}

  categorias(): Observable<{ categorias: Categoria[] }> {
    return this.http.get<{ categorias: Categoria[] }>(`${this.apiUrl}/catalogos`);
  }

  listar(anio?: number): Observable<Egreso[]> {
    return this.http.get<Egreso[]>(this.apiUrl, { params: anio ? { anio } : {} });
  }

  crear(body: NuevoEgreso): Observable<Egreso> {
    return this.http.post<Egreso>(this.apiUrl, body);
  }

  pagar(id: number, body: { fecha_pago: string; comprobante_base64?: string | null }): Observable<Egreso> {
    return this.http.put<Egreso>(`${this.apiUrl}/${id}/pagar`, body);
  }

  anular(id: number, motivo: string): Observable<Egreso> {
    return this.http.put<Egreso>(`${this.apiUrl}/${id}/anular`, { motivo });
  }

  proveedores(soloActivos = false): Observable<Proveedor[]> {
    return this.http.get<Proveedor[]>(`${this.apiUrl}/proveedores`, { params: soloActivos ? { activos: 'true' } : {} });
  }

  guardarProveedor(body: Partial<Proveedor>, id?: number): Observable<Proveedor> {
    return id
      ? this.http.put<Proveedor>(`${this.apiUrl}/proveedores/${id}`, body)
      : this.http.post<Proveedor>(`${this.apiUrl}/proveedores`, body);
  }
}
