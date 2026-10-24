import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { startWith } from 'rxjs/operators';
import { DepartamentosService } from '../../services/departamentos.service';
import { EstadoMulta, MotivoOption, Multa, MultaDraft, MultasService, PagoMulta, PagoMultaDetalle } from '../../services/multas.service';
import { ComprobantesService } from '../../services/comprobantes.service';
import { pedirMotivoRechazo } from '../../shared/utils/motivo-rechazo';
import { AuthService } from '../../auth/services/auth.service';

interface DepartamentoOption {
  id: number;
  numero: string;
  torreNumero: number;
}

@Component({
  selector: 'app-multas',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './multas.component.html',
  styleUrl: './multas.component.scss'
})
export class MultasComponent implements OnInit {
  vistaActual: 'list' | 'create' = 'list';
  multaSeleccionada: Multa | null = null;
  multaSeleccionadaId: string | number | null = null;
  pagoSeleccionado: PagoMulta | null = null;
  pagoSeleccionadoId: string | number | null = null;

  listaMultas: Multa[] = [];
  listaPagos: PagoMulta[] = [];
  departamentos: DepartamentoOption[] = [];
  departamentosDisponibles: DepartamentoOption[] = [];
  motivos: MotivoOption[] = [];
  torres: number[] = [];
  mostrarPagadas = false;
  // Los pagos de multas los revisa solo el tesorero de la torre.
  readonly esTesorero: boolean;

  torreControl = new FormControl<string>('');
  departamentoControl = new FormControl<string>('');
  personaControl = new FormControl<string>('');
  personaCedulaControl = new FormControl<string>('');
  motivoIdControl = new FormControl<string>('');
  descripcionControl = new FormControl<string>('');
  montoControl = new FormControl<number | null>(null);

  cargando = false;
  approvingId: string | number | null = null;
  approvingPagoId: string | number | null = null;
  errorMessage = '';
  successMessage = '';
  guardandoMulta = false;

  constructor(
    private route: ActivatedRoute,
    private multasService: MultasService,
    private departamentosService: DepartamentosService,
    private comprobantesService: ComprobantesService,
    authService: AuthService
  ) {
    this.esTesorero = authService.getUserRole() === 'tesorero';

    this.route.data.subscribe(data => {
      const mode = data['mode'];
      this.vistaActual = mode === 'create' ? 'create' : 'list';
    });

    this.multasService.multas$.subscribe(lista => {
      this.listaMultas = lista;

      if (this.multaSeleccionadaId === null) {
        return;
      }

      const multaActual = lista.find(item => item.id?.toString() === this.multaSeleccionadaId?.toString());
      if (!multaActual) {
        this.multaSeleccionada = null;
        this.multaSeleccionadaId = null;
        return;
      }

      this.multaSeleccionada = multaActual;
    });

    this.multasService.motivos$.subscribe(lista => {
      this.motivos = lista;
    });

    this.setupBusquedaDepartamentos();
  }

  ngOnInit(): void {
    this.cargarDepartamentos();
    this.cargarMotivos();
    this.cargarMultas();
  }

  cargarMultas(): void {
    this.cargando = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.multasService.loadMultas().subscribe({
      next: () => {
        this.cargando = false;
        this.cargarPagosMultas();
      },
      error: (err) => {
        console.error('Error cargando multas', err);
        this.errorMessage = err?.error?.message || 'No se pudieron cargar las multas.';
        this.listaMultas = [];
        this.multaSeleccionada = null;
        this.multaSeleccionadaId = null;
        this.cargando = false;
      }
    });
  }

  cargarPagosMultas(): void {
    if (!this.esTesorero) {
      return;
    }

    this.multasService.loadPagosMultas().subscribe({
      next: (pagos) => {
        this.listaPagos = pagos;

        if (this.pagoSeleccionadoId === null) {
          return;
        }

        const pagoActual = pagos.find((item) => item.id?.toString() === this.pagoSeleccionadoId?.toString());
        this.pagoSeleccionado = pagoActual || null;
        this.pagoSeleccionadoId = pagoActual?.id ?? null;
      },
      error: (err) => {
        console.error('Error cargando pagos de multas', err);
      }
    });
  }

  private cargarMotivos() {
    this.multasService.loadMotivos().subscribe({
      error: (err) => {
        console.error('Error cargando motivos para multas', err);
      }
    });
  }

  private cargarDepartamentos() {
    this.departamentosService.list().subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : res?.data;
        const lista = Array.isArray(raw) ? raw : [];

        this.departamentos = lista
          .map((item: any) => ({
            id: Number(item.id),
            numero: (item.numero ?? '').toString(),
            torreNumero: Number(item.torre_numero ?? item.torreNumero ?? 0)
          }))
          .filter((item: DepartamentoOption) => item.id > 0)
          .sort((a: DepartamentoOption, b: DepartamentoOption) => {
            if (a.torreNumero !== b.torreNumero) {
              return a.torreNumero - b.torreNumero;
            }

            return a.numero.localeCompare(b.numero);
          });

        this.torres = Array.from(new Set(this.departamentos.map(d => d.torreNumero))).sort((a, b) => a - b);
      },
      error: (err) => {
        console.error('Error cargando departamentos para multas', err);
      }
    });
  }

  private setupBusquedaDepartamentos() {
    this.torreControl.valueChanges
      .pipe(startWith(this.torreControl.value))
      .subscribe((torreSeleccionada) => {
        const torre = Number(torreSeleccionada);
        this.departamentosDisponibles = this.filtrarDepartamentosPorTorre(torre);

        const deptoActual = Number(this.departamentoControl.value);
        if (!this.departamentosDisponibles.some((item) => item.id === deptoActual)) {
          this.departamentoControl.setValue('');
        }
      });
  }

  private filtrarDepartamentosPorTorre(torre: number): DepartamentoOption[] {
    if (Number.isNaN(torre) || torre <= 0) {
      return [];
    }

    return this.departamentos.filter((item) => item.torreNumero === torre);
  }

  seleccionarMulta(multa: Multa) {
    this.pagoSeleccionado = null;
    this.pagoSeleccionadoId = null;
    this.multaSeleccionada = multa;
    this.multaSeleccionadaId = multa.id ?? null;
  }

  get multasVisibles(): Multa[] {
    return this.mostrarPagadas
      ? this.listaMultas
      : this.listaMultas.filter((multa) => multa.estado !== 'pagada');
  }

  togglePagadas(event: Event): void {
    this.mostrarPagadas = (event.target as HTMLInputElement).checked;
  }

  cerrarDetalles(): void {
    this.multaSeleccionada = null;
    this.multaSeleccionadaId = null;
    this.pagoSeleccionado = null;
    this.pagoSeleccionadoId = null;
  }

  seleccionarPago(pago: PagoMulta): void {
    this.multaSeleccionada = null;
    this.multaSeleccionadaId = null;
    this.pagoSeleccionado = pago;
    this.pagoSeleccionadoId = pago.id;
  }

  aprobarPago(pago: PagoMulta): void {
    if (pago.estado !== 'en_proceso' || this.approvingPagoId !== null) {
      return;
    }

    const confirmar = window.confirm(`Deseas aprobar el pago de multas #${pago.id}?`);

    if (!confirmar) {
      return;
    }

    this.approvingPagoId = pago.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.multasService.aprobarPagoMultas(pago.id).subscribe({
      next: () => {
        this.approvingPagoId = null;
        this.recargarTodo();
        this.successMessage = 'Pago aprobado correctamente. Se envio la factura y las multas quedaron como pagadas.';
      },
      error: (err) => {
        console.error('Error aprobando pago de multas', err);
        this.approvingPagoId = null;
        this.errorMessage = err?.error?.message || 'No se pudo aprobar el pago de multas.';
      }
    });
  }

  rechazarPago(pago: PagoMulta): void {
    if (pago.estado !== 'en_proceso' || this.approvingPagoId !== null) {
      return;
    }

    const motivo = pedirMotivoRechazo(`el pago de multas #${pago.id}`);

    if (!motivo) {
      return;
    }

    this.approvingPagoId = pago.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.multasService.rechazarPagoMultas(pago.id, motivo).subscribe({
      next: (res) => {
        this.approvingPagoId = null;
        this.recargarTodo();
        this.successMessage = res?.notificado
          ? 'Pago rechazado. Se notifico al residente y las multas volvieron a quedar pendientes.'
          : 'Pago rechazado. Las multas volvieron a quedar pendientes (no se pudo enviar el aviso por correo).';
      },
      error: (err) => {
        this.approvingPagoId = null;
        this.errorMessage = err?.error?.message || 'No se pudo rechazar el pago de multas.';
      }
    });
  }

  private recargarTodo(): void {
    this.multasService.loadMultas().subscribe({
      next: () => this.cargarPagosMultas(),
      error: () => this.cargarPagosMultas()
    });
  }

  aprobarMulta(multa: Multa): void {
    if (multa.aprobada || multa.estado !== 'pendiente' || multa.id === undefined || multa.id === null || this.approvingId !== null) {
      return;
    }

    const confirmar = window.confirm(`Deseas aprobar la multa #${multa.numeroConsecutivo || multa.id}?`);

    if (!confirmar) {
      return;
    }

    this.approvingId = multa.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.multasService.updateMulta(multa.id, this.toDraft(multa, true)).subscribe({
      next: () => {
        this.approvingId = null;
        this.successMessage = 'Multa aprobada correctamente.';
      },
      error: (err) => {
        console.error('Error aprobando multa', err);
        this.approvingId = null;
        this.errorMessage = err?.error?.message || 'No se pudo aprobar la multa.';
      }
    });
  }

  crearMulta() {
    if (this.guardandoMulta) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.formularioValido()) {
      this.errorMessage = 'Completa torre, departamento, persona, cédula, motivo, descripción y monto.';
      return;
    }

    // El registro necesita nombre y apellido por separado.
    if (!this.parsePersonaCompleta(this.personaControl.value).personaApellidos) {
      this.errorMessage = 'Escribe el nombre y el apellido de la persona (por ejemplo: Juan Pérez).';
      return;
    }

    const payload: MultaDraft = {
      departamentoId: Number(this.departamentoControl.value),
      motivoId: Number(this.motivoIdControl.value),
      ...this.parsePersonaCompleta(this.personaControl.value),
      personaCedula: (this.personaCedulaControl.value || '').trim(),
      descripcion: (this.descripcionControl.value || '').trim(),
      monto: Number(this.montoControl.value),
    };

    this.guardandoMulta = true;
    this.multasService.addMulta(payload).subscribe({
      next: () => {
        this.guardandoMulta = false;
        this.limpiarFormulario();
        this.vistaActual = 'list';
        this.successMessage = 'Multa registrada. El residente la verá en su cuenta para pagarla.';
      },
      error: (err) => {
        this.guardandoMulta = false;
        this.errorMessage = err?.error?.message || 'No se pudo registrar la multa.';
      }
    });
  }

  limpiarFormulario() {
    this.torreControl.setValue('');
    this.departamentoControl.setValue('');
    this.personaControl.setValue('');
    this.personaCedulaControl.setValue('');
    this.motivoIdControl.setValue('');
    this.descripcionControl.setValue('');
    this.montoControl.setValue(null);
  }

  private formularioValido(): boolean {
    const monto = Number(this.montoControl.value);

    return Boolean(
      this.torreControl.value &&
      this.departamentoControl.value &&
      (this.personaControl.value || '').trim() &&
      (this.personaCedulaControl.value || '').trim() &&
      this.motivoIdControl.value &&
      (this.descripcionControl.value || '').trim() &&
      Number.isFinite(monto) &&
      monto > 0
    );
  }

  private parsePersonaCompleta(valor: string | null): Pick<MultaDraft, 'personaNombre' | 'personaApellidos'> {
    const texto = (valor || '').trim();

    if (!texto) {
      return { personaNombre: '', personaApellidos: '' };
    }

    const partes = texto.split(/\s+/).filter(Boolean);

    if (partes.length === 1) {
      return { personaNombre: partes[0], personaApellidos: '' };
    }

    return {
      personaNombre: partes.slice(0, -1).join(' '),
      personaApellidos: partes.slice(-1).join(' ')
    };
  }

  getDepartamentoEtiqueta(multa: Multa): string {
    if (multa.departamentoNumero) {
      return multa.departamentoNumero;
    }

    return `T${multa.torreNumero}D${multa.departamentoId}`;
  }

  getPersonaEtiqueta(multa: Multa): string {
    const nombre = `${multa.personaNombre ?? ''} ${multa.personaApellidos ?? ''}`.trim();
    return nombre || 'Sin persona';
  }

  getEstadoLabel(multa: Multa): string {
    const labels: Record<EstadoMulta, string> = {
      pendiente: 'Pendiente',
      en_pago: 'Pago en revision',
      pagada: 'Pagada'
    };

    return labels[multa.estado] || multa.estado;
  }

  getFechaEtiqueta(multa: Multa): string {
    return multa.fecha ? String(multa.fecha).slice(0, 10) : '-';
  }

  getFechaPago(pago: PagoMulta): string {
    return pago.created_at ? String(pago.created_at).slice(0, 10) : '-';
  }

  getPagoEstadoLabel(pago: PagoMulta): string {
    const labels: Record<string, string> = {
      en_proceso: 'En proceso',
      aprobado: 'Aprobado',
      rechazado: 'Rechazado'
    };

    return labels[pago.estado] || pago.estado;
  }

  getPagoDepartamentoEtiqueta(pago: PagoMulta): string {
    const torre = pago.torre_numero ? `Torre ${pago.torre_numero}` : 'Torre -';
    const departamento = pago.departamento_numero || pago.departamento_id;
    return `${torre} / Dep. ${departamento}`;
  }

  verComprobante(event: Event, pago: PagoMulta): void {
    this.comprobantesService.abrir(event, pago.comprobante_url);
  }

  getPagoPersonaEtiqueta(detalle: PagoMultaDetalle): string {
    const nombre = `${detalle.persona_nombre ?? ''} ${detalle.persona_apellidos ?? ''}`.trim();
    return nombre || 'Sin persona';
  }

  private toDraft(multa: Multa, aprobada: boolean): MultaDraft {
    return {
      departamentoId: multa.departamentoId,
      motivoId: multa.motivoId,
      personaNombre: (multa.personaNombre || '').trim(),
      personaApellidos: (multa.personaApellidos || '').trim(),
      personaCedula: (multa.personaCedula || '').trim(),
      descripcion: (multa.descripcion || '').trim(),
      monto: Number(multa.monto || 0),
      aprobada,
      fecha: multa.fecha
    };
  }

}
