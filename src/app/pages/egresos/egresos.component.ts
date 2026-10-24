import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { ADMINS } from '../../auth/permisos';
import { Categoria, Egreso, EgresosService, EstadoEgreso, Proveedor } from '../../services/egresos.service';
import { ComprobantesService } from '../../services/comprobantes.service';
import { TorresService } from '../../services/torres.service';
import { leerArchivo } from '../../shared/utils/leer-archivo';

function hoy(): string {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

const ESTADOS: Record<EstadoEgreso, string> = { pendiente: 'Por pagar', pagado: 'Pagado', anulado: 'Anulado' };

// Egresos: gastos y ordenes de compra con proveedor, RUC y comprobante.
// La administracion registra los del conjunto y cada tesorero los de sus torres (mismo criterio que Finanzas).
// Un egreso pagado entra solo a Finanzas como gasto; si se anula, sale de Finanzas y queda el motivo.
@Component({
  selector: 'app-egresos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './egresos.component.html',
  styleUrl: './egresos.component.scss'
})
export class EgresosComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly egresosService = inject(EgresosService);
  private readonly torresService = inject(TorresService);
  private readonly authService = inject(AuthService);
  readonly comprobantes = inject(ComprobantesService);

  readonly esAdmin = this.authService.hasRole(ADMINS);
  readonly estados = ESTADOS;
  vista: 'egresos' | 'proveedores' = 'egresos';

  egresos: Egreso[] = [];
  proveedores: Proveedor[] = [];
  categorias: Categoria[] = [];
  torres: Array<{ id: number; numero: number }> = [];
  cargando = false;
  guardando = false;
  procesandoId: number | null = null;
  errorMessage = '';
  successMessage = '';

  // Filtros de la lista
  anio = new Date().getFullYear();
  filtroEstado: '' | EstadoEgreso = '';
  filtroCategoria = '';

  mostrarFormulario = false;
  comprobanteNuevo: string | null = null;
  readonly form = this.fb.group({
    torre_id: [null as number | null],
    proveedor_id: [null as number | null, Validators.required],
    categoria: ['', Validators.required],
    concepto: ['', [Validators.required, Validators.maxLength(200)]],
    numero_documento: ['', Validators.maxLength(40)],
    fecha: [hoy(), Validators.required],
    valor: [null as number | null, [Validators.required, Validators.min(0.01)]],
    estado: ['pendiente' as 'pendiente' | 'pagado', Validators.required]
  });

  // Pago de un egreso pendiente
  egresoAPagar: Egreso | null = null;
  fechaPago = hoy();
  comprobantePago: string | null = null;

  // Proveedores
  proveedorEditandoId: number | null = null;
  readonly proveedorForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    ruc: ['', [Validators.required, Validators.pattern(/^\d{10}(\d{3})?$/)]],
    telefono: ['', Validators.maxLength(30)],
    email: ['', Validators.email]
  });

  ngOnInit(): void {
    this.egresosService.categorias().subscribe({ next: ({ categorias }) => (this.categorias = categorias) });
    this.cargarProveedores();
    this.cargar();

    if (!this.esAdmin) {
      const propias = this.authService.getAuthorizedTorreIds();
      this.torresService.list().subscribe({
        next: (res: any) => {
          const lista = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
          this.torres = lista
            .map((torre: any) => ({ id: Number(torre.id), numero: Number(torre.numero) }))
            .filter((torre: { id: number }) => propias.includes(torre.id))
            .sort((a: { numero: number }, b: { numero: number }) => a.numero - b.numero);
          this.form.patchValue({ torre_id: this.torres[0]?.id ?? null });
        }
      });
    }
  }

  get proveedoresActivos(): Proveedor[] {
    return this.proveedores.filter((p) => p.activo);
  }

  get egresosVisibles(): Egreso[] {
    return this.egresos.filter((e) =>
      (!this.filtroEstado || e.estado === this.filtroEstado) && (!this.filtroCategoria || e.categoria === this.filtroCategoria));
  }

  get totalPagado(): number {
    return this.sumar('pagado');
  }

  get totalPorPagar(): number {
    return this.sumar('pendiente');
  }

  get cantidadPorPagar(): number {
    return this.egresos.filter((e) => e.estado === 'pendiente').length;
  }

  private sumar(estado: EstadoEgreso): number {
    return this.egresos.filter((e) => e.estado === estado).reduce((acc, e) => acc + Number(e.valor), 0);
  }

  nombreCategoria(key: string): string {
    return this.categorias.find((c) => c.key === key)?.label || key;
  }

  cargar(): void {
    this.cargando = true;
    this.egresosService.listar(this.anio).subscribe({
      next: (egresos) => {
        this.egresos = egresos;
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.errorMessage = error?.error?.message || 'No se pudieron cargar los egresos.';
      }
    });
  }

  cargarProveedores(): void {
    this.egresosService.proveedores().subscribe({
      next: (proveedores) => (this.proveedores = proveedores),
      error: (error) => (this.errorMessage = error?.error?.message || 'No se pudieron cargar los proveedores.')
    });
  }

  private limpiarMensajes(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  async elegirComprobante(event: Event, destino: 'nuevo' | 'pago'): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const dataUrl = await leerArchivo(file);
      destino === 'nuevo' ? (this.comprobanteNuevo = dataUrl) : (this.comprobantePago = dataUrl);
    } catch (mensaje) {
      input.value = '';
      this.errorMessage = String(mensaje);
    }
  }

  registrar(): void {
    if (this.form.invalid || this.guardando) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();

    if (!this.esAdmin && !valor.torre_id) {
      this.errorMessage = 'Selecciona la torre del egreso.';
      return;
    }

    this.guardando = true;
    this.limpiarMensajes();

    this.egresosService.crear({
      alcance: this.esAdmin ? 'conjunto' : 'torre',
      torre_id: this.esAdmin ? null : Number(valor.torre_id),
      proveedor_id: Number(valor.proveedor_id),
      categoria: String(valor.categoria),
      concepto: String(valor.concepto).trim(),
      numero_documento: String(valor.numero_documento || '').trim() || null,
      fecha: String(valor.fecha),
      valor: Number(valor.valor),
      estado: valor.estado || 'pendiente',
      comprobante_base64: this.comprobanteNuevo
    }).subscribe({
      next: (egreso) => {
        this.guardando = false;
        this.successMessage = egreso.estado === 'pagado'
          ? 'Egreso registrado como pagado. Ya aparece en Finanzas.'
          : 'Egreso registrado como pendiente de pago.';
        this.form.patchValue({ concepto: '', numero_documento: '', valor: null, estado: 'pendiente' });
        this.form.markAsPristine();
        this.comprobanteNuevo = null;
        this.mostrarFormulario = false;
        this.cargar();
      },
      error: (error) => {
        this.guardando = false;
        this.errorMessage = error?.error?.message || 'No se pudo registrar el egreso.';
      }
    });
  }

  abrirPago(egreso: Egreso): void {
    this.egresoAPagar = egreso;
    this.fechaPago = hoy();
    this.comprobantePago = null;
  }

  confirmarPago(): void {
    const egreso = this.egresoAPagar;

    if (!egreso || this.procesandoId !== null) {
      return;
    }

    this.procesandoId = egreso.id;
    this.limpiarMensajes();

    this.egresosService.pagar(egreso.id, { fecha_pago: this.fechaPago, comprobante_base64: this.comprobantePago }).subscribe({
      next: () => {
        this.procesandoId = null;
        this.egresoAPagar = null;
        this.successMessage = `Pago de "${egreso.concepto}" registrado. Ya aparece en Finanzas.`;
        this.cargar();
      },
      error: (error) => {
        this.procesandoId = null;
        this.errorMessage = error?.error?.message || 'No se pudo registrar el pago.';
      }
    });
  }

  anular(egreso: Egreso): void {
    const aviso = egreso.estado === 'pagado' ? ' El gasto también saldrá de Finanzas.' : '';
    const motivo = window.prompt(`Motivo para anular "${egreso.concepto}" por $${Number(egreso.valor).toFixed(2)}.${aviso}`);

    if (motivo === null) {
      return;
    }

    if (motivo.trim().length < 10) {
      window.alert('El motivo debe tener al menos 10 caracteres.');
      return;
    }

    this.procesandoId = egreso.id;
    this.limpiarMensajes();

    this.egresosService.anular(egreso.id, motivo.trim().slice(0, 500)).subscribe({
      next: () => {
        this.procesandoId = null;
        this.successMessage = 'Egreso anulado.';
        this.cargar();
      },
      error: (error) => {
        this.procesandoId = null;
        this.errorMessage = error?.error?.message || 'No se pudo anular el egreso.';
      }
    });
  }

  // ---------- Proveedores ----------

  editarProveedor(proveedor: Proveedor): void {
    this.proveedorEditandoId = proveedor.id;
    this.proveedorForm.setValue({
      nombre: proveedor.nombre,
      ruc: proveedor.ruc,
      telefono: proveedor.telefono || '',
      email: proveedor.email || ''
    });
  }

  cancelarProveedor(): void {
    this.proveedorEditandoId = null;
    this.proveedorForm.reset({ nombre: '', ruc: '', telefono: '', email: '' });
  }

  guardarProveedor(): void {
    if (this.proveedorForm.invalid || this.guardando) {
      this.proveedorForm.markAllAsTouched();
      return;
    }

    const valor = this.proveedorForm.getRawValue();
    const actual = this.proveedores.find((p) => p.id === this.proveedorEditandoId);
    this.guardando = true;
    this.limpiarMensajes();

    this.egresosService.guardarProveedor({
      nombre: String(valor.nombre).trim(),
      ruc: String(valor.ruc).trim(),
      telefono: String(valor.telefono || '').trim() || null,
      email: String(valor.email || '').trim() || null,
      activo: actual ? actual.activo : true
    }, this.proveedorEditandoId ?? undefined).subscribe({
      next: (proveedor) => {
        this.guardando = false;
        this.successMessage = actual ? 'Proveedor actualizado.' : `Proveedor ${proveedor.nombre} agregado.`;
        this.cancelarProveedor();
        this.cargarProveedores();
      },
      error: (error) => {
        this.guardando = false;
        this.errorMessage = error?.error?.message || 'No se pudo guardar el proveedor.';
      }
    });
  }

  cambiarEstadoProveedor(proveedor: Proveedor): void {
    this.limpiarMensajes();
    this.egresosService.guardarProveedor({ ...proveedor, activo: !proveedor.activo }, proveedor.id).subscribe({
      next: () => {
        this.successMessage = proveedor.activo ? 'Proveedor desactivado: ya no aparecerá en nuevos egresos.' : 'Proveedor activado.';
        this.cargarProveedores();
      },
      error: (error) => (this.errorMessage = error?.error?.message || 'No se pudo actualizar el proveedor.')
    });
  }
}
