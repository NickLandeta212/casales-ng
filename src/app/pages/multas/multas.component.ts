import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { startWith } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DepartamentosService } from '../../services/departamentos.service';
import { MotivoOption, Multa, MultaDraft, MultasService, PagoMulta, PagoMultaDetalle } from '../../services/multas.service';

interface DepartamentoOption {
  id: number;
  numero: string;
  torreNumero: number;
}

@Component({
  selector: 'app-multas',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
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

  torreControl = new FormControl<string>('');
  departamentoControl = new FormControl<string>('');
  personaControl = new FormControl<string>('');
  personaCedulaControl = new FormControl<string>('');
  motivoIdControl = new FormControl<string>('');
  descripcionControl = new FormControl<string>('');
  montoControl = new FormControl<number | null>(null);

  editTorreControl = new FormControl<string>('');
  editDepartamentoControl = new FormControl<string>('');
  editPersonaControl = new FormControl<string>('');
  editPersonaCedulaControl = new FormControl<string>('');
  editMotivoIdControl = new FormControl<string>('');
  editDescripcionControl = new FormControl<string>('');
  editMontoControl = new FormControl<number | null>(null);
  editDepartamentosDisponibles: DepartamentoOption[] = [];
  cargando = false;
  approvingId: string | number | null = null;
  approvingPagoId: string | number | null = null;
  errorMessage = '';
  successMessage = '';

  constructor(
    private route: ActivatedRoute,
    private multasService: MultasService,
    private departamentosService: DepartamentosService
  ) {
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
    this.setupBusquedaDepartamentosEdicion();
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

  private setupBusquedaDepartamentosEdicion() {
    this.editTorreControl.valueChanges
      .pipe(startWith(this.editTorreControl.value))
      .subscribe((torreSeleccionada) => {
        const torre = Number(torreSeleccionada);
        this.editDepartamentosDisponibles = this.filtrarDepartamentosPorTorre(torre);

        const deptoActual = Number(this.editDepartamentoControl.value);
        if (!this.editDepartamentosDisponibles.some((item) => item.id === deptoActual)) {
          this.editDepartamentoControl.setValue('');
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

    this.editTorreControl.setValue(multa.torreNumero > 0 ? multa.torreNumero.toString() : '');
    this.editDepartamentoControl.setValue(multa.departamentoId > 0 ? multa.departamentoId.toString() : '');
    this.editPersonaControl.setValue(this.getPersonaEtiqueta(multa));
    this.editPersonaCedulaControl.setValue(multa.personaCedula ?? '');
    this.editMotivoIdControl.setValue(multa.motivoId > 0 ? multa.motivoId.toString() : '');
    this.editDescripcionControl.setValue(multa.descripcion);
    this.editMontoControl.setValue(multa.monto);
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
    if (pago.estado === 'aprobado' || this.approvingPagoId !== null) {
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
        this.multasService.loadMultas().subscribe({
          next: () => this.cargarPagosMultas(),
          error: () => this.cargarPagosMultas()
        });
        this.successMessage = 'Pago aprobado correctamente. Las multas pagadas fueron eliminadas del listado pendiente.';
      },
      error: (err) => {
        console.error('Error aprobando pago de multas', err);
        this.approvingPagoId = null;
        this.errorMessage = err?.error?.message || 'No se pudo aprobar el pago de multas.';
      }
    });
  }

  aprobarMulta(multa: Multa): void {
    if (multa.aprobada || multa.id === undefined || multa.id === null || this.approvingId !== null) {
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

  guardarEdicionMulta() {
    if (this.multaSeleccionadaId === null || !this.formularioEdicionValido()) {
      return;
    }

    const payload: MultaDraft = {
      departamentoId: Number(this.editDepartamentoControl.value),
      motivoId: Number(this.editMotivoIdControl.value),
      ...this.parsePersonaCompleta(this.editPersonaControl.value),
      personaCedula: (this.editPersonaCedulaControl.value || '').trim(),
      descripcion: (this.editDescripcionControl.value || '').trim(),
      monto: Number(this.editMontoControl.value),
      aprobada: this.multaSeleccionada?.aprobada ?? false,
      fecha: this.multaSeleccionada?.fecha,
    };

    this.multasService.updateMulta(this.multaSeleccionadaId, payload).subscribe({
      error: (err) => {
        console.error('Error actualizando multa', err);
      }
    });
  }

  eliminarMultaSeleccionada() {
    if (this.multaSeleccionadaId === null) {
      return;
    }

    this.multasService.deleteMulta(this.multaSeleccionadaId).subscribe({
      next: () => {
        this.multaSeleccionada = null;
        this.multaSeleccionadaId = null;
      },
      error: (err) => {
        console.error('Error eliminando multa', err);
      }
    });
  }

  crearMulta() {
    if (!this.formularioValido()) {
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

    this.multasService.addMulta(payload).subscribe({
      next: () => {
        this.limpiarFormulario();
        this.vistaActual = 'list';
      },
      error: (err) => {
        console.error('Error creando multa', err);
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
    return Boolean(
      this.torreControl.value &&
      this.departamentoControl.value &&
      (this.personaControl.value || '').trim() &&
      (this.personaCedulaControl.value || '').trim() &&
      this.motivoIdControl.value &&
      (this.descripcionControl.value || '').trim() &&
      this.montoControl.value
    );
  }

  private formularioEdicionValido(): boolean {
    return Boolean(
      this.editTorreControl.value &&
      this.editDepartamentoControl.value &&
      (this.editPersonaControl.value || '').trim() &&
      (this.editPersonaCedulaControl.value || '').trim() &&
      this.editMotivoIdControl.value &&
      (this.editDescripcionControl.value || '').trim() &&
      this.editMontoControl.value
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
    return multa.aprobada ? 'Aprobada' : 'En proceso';
  }

  getFechaEtiqueta(multa: Multa): string {
    return multa.fecha ? String(multa.fecha).slice(0, 10) : '-';
  }

  getFechaPago(pago: PagoMulta): string {
    return pago.created_at ? String(pago.created_at).slice(0, 10) : '-';
  }

  getPagoEstadoLabel(pago: PagoMulta): string {
    return pago.estado === 'aprobado' ? 'Aprobado' : 'En proceso';
  }

  getPagoDepartamentoEtiqueta(pago: PagoMulta): string {
    const torre = pago.torre_numero ? `Torre ${pago.torre_numero}` : 'Torre -';
    const departamento = pago.departamento_numero || pago.departamento_id;
    return `${torre} / Dep. ${departamento}`;
  }

  getPagoComprobanteUrl(pago: PagoMulta): string {
    const rawUrl = String(pago.comprobante_url || '').trim();

    if (!rawUrl) {
      return '';
    }

    if (/^https?:\/\//i.test(rawUrl)) {
      return rawUrl;
    }

    if (rawUrl.startsWith('/')) {
      return `${this.getApiOrigin()}${rawUrl}`;
    }

    return rawUrl;
  }

  getPagoPersonaEtiqueta(detalle: PagoMultaDetalle): string {
    const nombre = `${detalle.persona_nombre ?? ''} ${detalle.persona_apellidos ?? ''}`.trim();
    return nombre || 'Sin persona';
  }

  private getApiOrigin(): string {
    if (/^https?:\/\//i.test(environment.endpoint)) {
      return new URL(environment.endpoint).origin;
    }

    return environment.production ? window.location.origin : 'http://localhost:3000';
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
