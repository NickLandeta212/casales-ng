import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { EgresosService, Proveedor } from '../../services/egresos.service';
import { EjecucionMantenimiento, Frecuencia, Mantenimiento, MantenimientosService } from '../../services/mantenimientos.service';

function hoy(): string {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

export const FRECUENCIAS: Record<Frecuencia, string> = {
  unica: 'Una sola vez',
  mensual: 'Mensual',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual'
};

// Mantenimientos programados del conjunto. La app envia un correo a la administracion
// cuando un mantenimiento entra en sus dias de aviso. Al marcarlo realizado, la proxima fecha avanza sola.
@Component({
  selector: 'app-mantenimientos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './mantenimientos.component.html',
  styleUrl: './mantenimientos.component.scss'
})
export class MantenimientosComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly mantenimientosService = inject(MantenimientosService);
  private readonly egresosService = inject(EgresosService);

  readonly frecuencias = FRECUENCIAS;
  readonly frecuenciaKeys = Object.keys(FRECUENCIAS) as Frecuencia[];
  mantenimientos: Mantenimiento[] = [];
  proveedores: Proveedor[] = [];
  cargando = false;
  guardando = false;
  errorMessage = '';
  successMessage = '';
  mostrarInactivos = false;

  mostrarFormulario = false;
  editandoId: number | null = null;
  readonly form = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(150)]],
    area: ['', Validators.maxLength(100)],
    descripcion: ['', Validators.maxLength(1000)],
    proveedor_id: [null as number | null],
    costo_estimado: [null as number | null, Validators.min(0)],
    frecuencia: ['mensual' as Frecuencia, Validators.required],
    proxima_fecha: [hoy(), Validators.required],
    dias_aviso: [7, [Validators.required, Validators.min(0), Validators.max(60)]]
  });

  // Registro de un mantenimiento realizado
  realizando: Mantenimiento | null = null;
  ejecucion = { fecha: hoy(), observaciones: '', costo: null as number | null };

  // Historial abierto
  historialDe: number | null = null;
  historial: EjecucionMantenimiento[] = [];

  ngOnInit(): void {
    this.cargar();
    this.egresosService.proveedores(true).subscribe({ next: (proveedores) => (this.proveedores = proveedores) });
  }

  get visibles(): Mantenimiento[] {
    return this.mostrarInactivos ? this.mantenimientos : this.mantenimientos.filter((m) => m.activo);
  }

  get atrasados(): number {
    return this.mantenimientos.filter((m) => m.activo && m.dias_restantes < 0).length;
  }

  get proximos30(): number {
    return this.mantenimientos.filter((m) => m.activo && m.dias_restantes >= 0 && m.dias_restantes <= 30).length;
  }

  get inactivos(): number {
    return this.mantenimientos.filter((m) => !m.activo).length;
  }

  cuando(m: Mantenimiento): string {
    if (!m.activo) {
      return 'Inactivo';
    }

    if (m.dias_restantes < 0) {
      return `Atrasado ${-m.dias_restantes} día(s)`;
    }

    return m.dias_restantes === 0 ? 'Hoy' : `En ${m.dias_restantes} día(s)`;
  }

  estadoClase(m: Mantenimiento): string {
    if (!m.activo) {
      return '';
    }

    if (m.dias_restantes < 0) {
      return 'bad';
    }

    return m.dias_restantes <= m.dias_aviso ? 'review' : 'ok';
  }

  cargar(): void {
    this.cargando = true;
    this.mantenimientosService.listar().subscribe({
      next: (mantenimientos) => {
        this.mantenimientos = mantenimientos;
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.errorMessage = error?.error?.message || 'No se pudieron cargar los mantenimientos.';
      }
    });
  }

  nuevo(): void {
    this.editandoId = null;
    this.form.reset({ titulo: '', area: '', descripcion: '', proveedor_id: null, costo_estimado: null, frecuencia: 'mensual', proxima_fecha: hoy(), dias_aviso: 7 });
    this.mostrarFormulario = true;
  }

  editar(m: Mantenimiento): void {
    this.editandoId = m.id;
    this.form.setValue({
      titulo: m.titulo,
      area: m.area || '',
      descripcion: m.descripcion || '',
      proveedor_id: m.proveedor_id,
      costo_estimado: m.costo_estimado !== null ? Number(m.costo_estimado) : null,
      frecuencia: m.frecuencia,
      proxima_fecha: m.proxima_fecha,
      dias_aviso: m.dias_aviso
    });
    this.mostrarFormulario = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  guardar(activo?: boolean, base?: Mantenimiento): void {
    if (!base && (this.form.invalid || this.guardando)) {
      this.form.markAllAsTouched();
      return;
    }

    const v = base
      ? { ...base, costo_estimado: base.costo_estimado !== null ? Number(base.costo_estimado) : null }
      : this.form.getRawValue();
    const actual = this.mantenimientos.find((m) => m.id === (base?.id ?? this.editandoId));
    const id = base?.id ?? this.editandoId ?? undefined;

    this.guardando = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.mantenimientosService.guardar({
      titulo: String(v.titulo).trim(),
      area: String(v.area || '').trim() || null,
      descripcion: String(v.descripcion || '').trim() || null,
      proveedor_id: v.proveedor_id ? Number(v.proveedor_id) : null,
      costo_estimado: v.costo_estimado === null || (v.costo_estimado as any) === '' ? null : Number(v.costo_estimado),
      frecuencia: v.frecuencia as Frecuencia,
      proxima_fecha: String(v.proxima_fecha),
      dias_aviso: Number(v.dias_aviso),
      activo: activo ?? actual?.activo ?? true
    }, id).subscribe({
      next: () => {
        this.guardando = false;
        this.successMessage = base ? (activo ? 'Mantenimiento reactivado.' : 'Mantenimiento desactivado.') : id ? 'Mantenimiento actualizado.' : 'Mantenimiento programado.';
        if (!base) {
          this.mostrarFormulario = false;
          this.editandoId = null;
        }
        this.cargar();
      },
      error: (error) => {
        this.guardando = false;
        this.errorMessage = error?.error?.message || 'No se pudo guardar el mantenimiento.';
      }
    });
  }

  cambiarActivo(m: Mantenimiento): void {
    if (m.activo && !window.confirm(`Desactivar "${m.titulo}"? Dejará de enviar recordatorios.`)) {
      return;
    }

    this.guardar(!m.activo, m);
  }

  abrirRealizado(m: Mantenimiento): void {
    this.realizando = m;
    this.ejecucion = { fecha: hoy(), observaciones: '', costo: m.costo_estimado !== null ? Number(m.costo_estimado) : null };
  }

  confirmarRealizado(): void {
    const m = this.realizando;

    if (!m || this.guardando) {
      return;
    }

    this.guardando = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.mantenimientosService.realizar(m.id, {
      fecha: this.ejecucion.fecha,
      observaciones: this.ejecucion.observaciones.trim() || null,
      costo: this.ejecucion.costo === null || (this.ejecucion.costo as any) === '' ? null : Number(this.ejecucion.costo)
    }).subscribe({
      next: (res) => {
        this.guardando = false;
        this.realizando = null;
        this.successMessage = res.message;
        if (this.historialDe === m.id) {
          this.verHistorial(m, true);
        }
        this.cargar();
      },
      error: (error) => {
        this.guardando = false;
        this.errorMessage = error?.error?.message || 'No se pudo registrar el mantenimiento.';
      }
    });
  }

  verHistorial(m: Mantenimiento, forzar = false): void {
    if (this.historialDe === m.id && !forzar) {
      this.historialDe = null;
      return;
    }

    this.historialDe = m.id;
    this.historial = [];
    this.mantenimientosService.ejecuciones(m.id).subscribe({
      next: (ejecuciones) => (this.historial = ejecuciones),
      error: (error) => (this.errorMessage = error?.error?.message || 'No se pudo cargar el historial.')
    });
  }
}
