import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../../auth/services/auth.service';
import { AlicuotasService } from '../../services/alicuotas.service';
import { CargosService } from '../../services/cargos.service';
import { ComprobantesService } from '../../services/comprobantes.service';
import { MultasService } from '../../services/multas.service';
import { pedirMotivoRechazo } from '../../shared/utils/motivo-rechazo';

type TipoPago = 'alicuota' | 'multa' | 'cargo';
type Pestana = 'por_revisar' | 'aprobado' | 'rechazado' | 'todos';

interface PagoRevision {
  clave: string;
  tipo: TipoPago;
  id: number | string;
  torreNumero: string;
  departamentoNumero: string;
  detalle: string;
  valor: number;
  fecha: string | null;
  estado: 'por_revisar' | 'aprobado' | 'rechazado';
  motivoRechazo: string | null;
  comprobanteUrl: string | null;
  email: string | null;
}

const TIPOS: Record<TipoPago, string> = { alicuota: 'Alícuota', multa: 'Multas', cargo: 'Cargo extra' };

// Bandeja unica de pagos de departamentos: alicuotas, multas y cargos extraordinarios, separados por estado.
// La administracion la consulta para todo el conjunto; el tesorero ve sus torres y es quien aprueba o rechaza,
// con los mismos servicios de cada modulo.
@Component({
  selector: 'app-revision-pagos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './revision-pagos.component.html',
  styleUrl: './revision-pagos.component.scss'
})
export class RevisionPagosComponent implements OnInit {
  private readonly alicuotasService = inject(AlicuotasService);
  private readonly multasService = inject(MultasService);
  private readonly cargosService = inject(CargosService);
  private readonly comprobantesService = inject(ComprobantesService);
  readonly puedeRevisar = inject(AuthService).canReviewDepartmentPayments();

  readonly pestanas: Array<{ key: Pestana; label: string }> = [
    { key: 'por_revisar', label: 'Por revisar' },
    { key: 'aprobado', label: 'Aprobados' },
    { key: 'rechazado', label: 'Rechazados' },
    { key: 'todos', label: 'Todos' }
  ];
  readonly tipos = TIPOS;

  pagos: PagoRevision[] = [];
  pestana: Pestana = 'por_revisar';
  tipo: TipoPago | 'todos' = 'todos';
  busqueda = '';
  cargando = false;
  procesando: string | null = null;
  errorMessage = '';
  successMessage = '';
  fallos: string[] = [];

  ngOnInit(): void {
    this.cargar();
  }

  get visibles(): PagoRevision[] {
    const texto = this.busqueda.trim().toLowerCase();

    return this.pagos.filter((pago) =>
      (this.pestana === 'todos' || pago.estado === this.pestana)
      && (this.tipo === 'todos' || pago.tipo === this.tipo)
      && (!texto || `${pago.departamentoNumero} ${pago.detalle} torre ${pago.torreNumero}`.toLowerCase().includes(texto))
    );
  }

  get totalVisible(): number {
    return this.visibles.reduce((total, pago) => total + pago.valor, 0);
  }

  contar(pestana: Pestana): number {
    return this.pagos.filter((pago) =>
      (pestana === 'todos' || pago.estado === pestana) && (this.tipo === 'todos' || pago.tipo === this.tipo)
    ).length;
  }

  cargar(): void {
    this.cargando = true;
    this.errorMessage = '';
    this.fallos = [];

    forkJoin({
      alicuotas: this.seguro(this.alicuotasService.getPagosPorTorre(), 'alícuotas'),
      multas: this.seguro(this.multasService.loadPagosMultas(), 'multas'),
      cargos: this.seguro(this.cargosService.listarPagos(), 'cargos extraordinarios')
    }).subscribe(({ alicuotas, multas, cargos }) => {
      const lista: PagoRevision[] = [
        ...alicuotas.map((p: any): PagoRevision => ({
          clave: `alicuota-${p.id}`,
          tipo: 'alicuota',
          id: p.id,
          torreNumero: p.torreNumero,
          departamentoNumero: p.departamentoNumero,
          detalle: `Alícuota ${p.mes}`,
          valor: Number(p.valor),
          fecha: p.fechaPago || null,
          estado: this.normalizarEstado(p.estado),
          motivoRechazo: p.motivoRechazo || null,
          comprobanteUrl: p.comprobanteUrl || null,
          email: p.emailDestinatario || null
        })),
        ...multas.map((p: any): PagoRevision => ({
          clave: `multa-${p.id}`,
          tipo: 'multa',
          id: p.id,
          torreNumero: p.torre_numero,
          departamentoNumero: p.departamento_numero,
          detalle: (p.multas || []).map((m: any) => m.motivo_nombre || m.descripcion).filter(Boolean).join(', ') || 'Pago de multas',
          valor: Number(p.total),
          fecha: p.created_at || null,
          estado: this.normalizarEstado(p.estado),
          motivoRechazo: p.motivo_rechazo || null,
          comprobanteUrl: p.comprobante_url || null,
          email: p.email_destinatario || null
        })),
        ...cargos.map((p: any): PagoRevision => ({
          clave: `cargo-${p.id}`,
          tipo: 'cargo',
          id: p.id,
          torreNumero: String(p.torre_numero),
          departamentoNumero: p.departamento_numero,
          detalle: (p.cargos || []).map((c: any) => c.concepto).join(', ') || 'Cargos extraordinarios',
          valor: Number(p.total),
          fecha: p.created_at || null,
          estado: this.normalizarEstado(p.estado),
          motivoRechazo: p.motivo_rechazo || null,
          comprobanteUrl: p.comprobante_url || null,
          email: p.email_destinatario || null
        }))
      ];

      // Lo mas antiguo por revisar primero; el resto, lo mas reciente primero.
      this.pagos = lista.sort((a, b) => {
        if (a.estado === 'por_revisar' && b.estado === 'por_revisar') {
          return String(a.fecha).localeCompare(String(b.fecha));
        }

        return String(b.fecha).localeCompare(String(a.fecha));
      });
      this.cargando = false;
    });
  }

  aprobar(pago: PagoRevision): void {
    if (pago.estado !== 'por_revisar' || this.procesando) {
      return;
    }

    if (!window.confirm(`Aprobar ${TIPOS[pago.tipo].toLowerCase()} de ${pago.departamentoNumero} por $${pago.valor.toFixed(2)}?`)) {
      return;
    }

    const peticion: Observable<unknown> = {
      alicuota: () => this.alicuotasService.aprobarPago(pago.id),
      multa: () => this.multasService.aprobarPagoMultas(pago.id),
      cargo: () => this.cargosService.aprobarPago(pago.id)
    }[pago.tipo]();

    this.ejecutar(pago, peticion, 'Pago aprobado.');
  }

  rechazar(pago: PagoRevision): void {
    if (pago.estado !== 'por_revisar' || this.procesando) {
      return;
    }

    const motivo = pedirMotivoRechazo(`${pago.detalle} de ${pago.departamentoNumero}`);

    if (!motivo) {
      return;
    }

    const peticion: Observable<unknown> = {
      alicuota: () => this.alicuotasService.rechazarPago(pago.id, motivo),
      multa: () => this.multasService.rechazarPagoMultas(pago.id, motivo),
      cargo: () => this.cargosService.rechazarPago(pago.id, motivo)
    }[pago.tipo]();

    this.ejecutar(pago, peticion, 'Pago rechazado. Se avisó al residente si dejó su correo.');
  }

  verComprobante(event: Event, pago: PagoRevision): void {
    this.comprobantesService.abrir(event, pago.comprobanteUrl);
  }

  etiquetaEstado(pago: PagoRevision): string {
    return { por_revisar: 'Por revisar', aprobado: 'Aprobado', rechazado: 'Rechazado' }[pago.estado];
  }

  private ejecutar(pago: PagoRevision, peticion: Observable<unknown>, exito: string): void {
    this.procesando = pago.clave;
    this.errorMessage = '';
    this.successMessage = '';

    peticion.subscribe({
      next: () => {
        this.procesando = null;
        this.successMessage = exito;
        this.cargar();
      },
      error: (error) => {
        this.procesando = null;
        this.errorMessage = error?.error?.message || 'No se pudo completar la acción.';
      }
    });
  }

  private normalizarEstado(estado: string): PagoRevision['estado'] {
    if (estado === 'aprobado' || estado === 'rechazado') {
      return estado;
    }

    return 'por_revisar';
  }

  // Si un modulo falla, la bandeja muestra los demas y avisa cual no cargo.
  private seguro<T>(peticion: Observable<T[]>, nombre: string): Observable<T[]> {
    return peticion.pipe(
      map((lista) => (Array.isArray(lista) ? lista : [])),
      catchError(() => {
        this.fallos.push(nombre);
        return of([] as T[]);
      })
    );
  }
}
