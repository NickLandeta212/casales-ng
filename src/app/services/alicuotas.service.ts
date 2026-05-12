import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export type EstadoAlicuota = 'pendiente' | 'en_revision' | 'aprobado';

export interface AlicuotaPago {
  id: string | number;
  torreId: number;
  torreNumero: string;
  departamentoId: number;
  departamentoNumero: string;
  anio: number;
  mesNumero: number;
  mes: string;
  descripcion: string;
  valor: number;
  estado: EstadoAlicuota;
  fechaPago?: string;
  comprobanteUrl?: string;
  comprobanteNombre?: string;
}

export interface AlicuotaDepartamento {
  id: number;
  numero: string;
  torreId: number;
  torreNumero: string;
}

export interface AlicuotaTorrePago {
  id: string | number;
  torreId: number;
  torreNumero: string;
  anio: number;
  mesNumero: number;
  mes: string;
  descripcion: string;
  valor: number;
  estado: EstadoAlicuota;
  fechaPago?: string;
  comprobanteUrl?: string;
  comprobanteNombre?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlicuotasService {
  private readonly apiUrl = `${environment.endpoint}/alicuotas`;
  private readonly meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  constructor(private http: HttpClient) {}

  getDepartamentosPorTorre(torreId: number | string) {
    return this.http.get<any>(`${this.apiUrl}/torres/${torreId}/departamentos`).pipe(
      map((res) => this.normalizeDepartamentos(res))
    );
  }

  getPagosDepartamento(torreId: number | string, departamentoId: number | string) {
    return this.http.get<any>(`${this.apiUrl}/torres/${torreId}/departamentos/${departamentoId}`).pipe(
      map((res) => this.normalizePagos(res))
    );
  }

  getPagosPorTorre(torreId?: number | string | null) {
    let params = new HttpParams();

    if (torreId) {
      params = params.set('torre_id', String(torreId));
    }

    return this.http.get<any>(`${this.apiUrl}/pagos`, { params }).pipe(
      map((res) => this.normalizePagos(res))
    );
  }

  registrarComprobante(pago: AlicuotaPago, comprobanteBase64: string, comprobanteNombre: string) {
    return this.http.post<any>(`${this.apiUrl}/pagos`, {
      torre_id: pago.torreId,
      departamento_id: pago.departamentoId,
      anio: pago.anio,
      mes: pago.mesNumero,
      comprobante_base64: comprobanteBase64,
      comprobante_nombre: comprobanteNombre
    }).pipe(
      map((res) => this.toPago(res?.pago ?? res))
    );
  }

  aprobarPago(id: string | number) {
    return this.http.put<any>(`${this.apiUrl}/pagos/${id}/aprobar`, {}).pipe(
      map((res) => this.toPago(res?.pago ?? res))
    );
  }

  getMesesTorre(torreId: number | string) {
    return this.http.get<any>(`${this.apiUrl}/torres/${torreId}/meses`).pipe(
      map((res) => this.normalizePagosTorres(res))
    );
  }

  getPagosTorres(torreId?: number | string | null) {
    let params = new HttpParams();

    if (torreId) {
      params = params.set('torre_id', String(torreId));
    }

    return this.http.get<any>(`${this.apiUrl}/pagos-torres`, { params }).pipe(
      map((res) => this.normalizePagosTorres(res))
    );
  }

  registrarComprobanteTorre(pago: AlicuotaTorrePago, comprobanteBase64: string, comprobanteNombre: string, valor: number) {
    return this.http.post<any>(`${this.apiUrl}/pagos-torres`, {
      torre_id: pago.torreId,
      anio: pago.anio,
      mes: pago.mesNumero,
      valor,
      comprobante_base64: comprobanteBase64,
      comprobante_nombre: comprobanteNombre
    }).pipe(
      map((res) => this.toPagoTorre(res?.pago ?? res))
    );
  }

  aprobarPagoTorre(id: string | number) {
    return this.http.put<any>(`${this.apiUrl}/pagos-torres/${id}/aprobar`, {}).pipe(
      map((res) => this.toPagoTorre(res?.pago ?? res))
    );
  }

  private normalizeDepartamentos(res: any): AlicuotaDepartamento[] {
    const raw = Array.isArray(res) ? res : res?.data;
    const lista = Array.isArray(raw) ? raw : [];

    return lista.map((item: any) => ({
      id: Number(item.id),
      numero: String(item.numero ?? ''),
      torreId: Number(item.torre_id ?? item.torreId ?? 0),
      torreNumero: String(item.torre_numero ?? item.torreNumero ?? '')
    }));
  }

  private normalizePagos(res: any): AlicuotaPago[] {
    const raw = Array.isArray(res) ? res : res?.data;
    const lista = Array.isArray(raw) ? raw : [];

    return lista.map((item: any) => this.toPago(item));
  }

  private normalizePagosTorres(res: any): AlicuotaTorrePago[] {
    const raw = Array.isArray(res) ? res : res?.data;
    const lista = Array.isArray(raw) ? raw : [];

    return lista.map((item: any) => this.toPagoTorre(item));
  }

  private toPago(raw: any): AlicuotaPago {
    const mesNumero = Number(raw.mes ?? raw.mesNumero ?? 0);
    const anio = Number(raw.anio ?? new Date().getFullYear());
    const mesNombre = this.meses[mesNumero - 1] || `Mes ${mesNumero}`;

    return {
      id: raw.id ?? `${raw.torre_id ?? raw.torreId}-${raw.departamento_id ?? raw.departamentoId}-${anio}-${mesNumero}`,
      torreId: Number(raw.torre_id ?? raw.torreId ?? 0),
      torreNumero: String(raw.torre_numero ?? raw.torreNumero ?? ''),
      departamentoId: Number(raw.departamento_id ?? raw.departamentoId ?? 0),
      departamentoNumero: String(raw.departamento_numero ?? raw.departamentoNumero ?? ''),
      anio,
      mesNumero,
      mes: `${mesNombre} ${anio}`,
      descripcion: String(raw.descripcion ?? `Alicuota mensual - ${mesNombre}`),
      valor: Number(raw.valor ?? 45),
      estado: (raw.estado ?? 'pendiente') as EstadoAlicuota,
      fechaPago: raw.fecha_pago ?? raw.fechaPago,
      comprobanteUrl: raw.comprobante_url ?? raw.comprobanteUrl,
      comprobanteNombre: raw.comprobante_nombre ?? raw.comprobanteNombre
    };
  }

  private toPagoTorre(raw: any): AlicuotaTorrePago {
    const mesNumero = Number(raw.mes ?? raw.mesNumero ?? 0);
    const anio = Number(raw.anio ?? new Date().getFullYear());
    const mesNombre = this.meses[mesNumero - 1] || `Mes ${mesNumero}`;

    return {
      id: raw.id ?? `${raw.torre_id ?? raw.torreId}-${anio}-${mesNumero}`,
      torreId: Number(raw.torre_id ?? raw.torreId ?? 0),
      torreNumero: String(raw.torre_numero ?? raw.torreNumero ?? ''),
      anio,
      mesNumero,
      mes: `${mesNombre} ${anio}`,
      descripcion: String(raw.descripcion ?? `Alicuota de torre - ${mesNombre}`),
      valor: Number(raw.valor ?? 0),
      estado: (raw.estado ?? 'pendiente') as EstadoAlicuota,
      fechaPago: raw.fecha_pago ?? raw.fechaPago,
      comprobanteUrl: raw.comprobante_url ?? raw.comprobanteUrl,
      comprobanteNombre: raw.comprobante_nombre ?? raw.comprobanteNombre
    };
  }
}
