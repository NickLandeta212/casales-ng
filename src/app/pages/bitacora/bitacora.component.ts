import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { BitacoraService, Novedad, TipoNovedad } from '../../services/bitacora.service';
import { ComprobantesService } from '../../services/comprobantes.service';
import { DepartamentoPorteria, PorteriaService } from '../../services/porteria.service';
import { comprimirImagen } from '../../shared/utils/leer-archivo';

const TIPOS: Record<TipoNovedad, { label: string; icono: string }> = {
  ronda: { label: 'Ronda', icono: 'bi-signpost-split' },
  incidente: { label: 'Incidente', icono: 'bi-exclamation-octagon' },
  mantenimiento: { label: 'Daño o mantenimiento', icono: 'bi-wrench' },
  entrega_turno: { label: 'Entrega de turno', icono: 'bi-arrow-left-right' },
  otro: { label: 'Otro', icono: 'bi-chat-square-text' }
};
const FOTOS_MAX = 4;

function fechaLocal(fecha = new Date()): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

// Bitacora de guardia: la guardia registra las novedades de su turno (con fotos) y la administracion las revisa.
// Lo registrado no se edita ni se borra, para que sirva como respaldo.
@Component({
  selector: 'app-bitacora',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bitacora.component.html',
  styleUrl: './bitacora.component.scss'
})
export class BitacoraComponent implements OnInit {
  private readonly bitacoraService = inject(BitacoraService);
  private readonly porteriaService = inject(PorteriaService);
  private readonly comprobantesService = inject(ComprobantesService);
  private readonly authService = inject(AuthService);

  // Registra la guardia (y el admin general, que tiene acceso a todo); el admin del conjunto solo revisa.
  readonly puedeRegistrar = this.authService.hasRole(['guardia', 'admin_general']);
  readonly tipos = TIPOS;
  readonly tipoKeys = Object.keys(TIPOS) as TipoNovedad[];
  readonly fotosMax = FOTOS_MAX;
  novedades: Novedad[] = [];
  departamentos: DepartamentoPorteria[] = [];
  cargando = false;
  guardando = false;
  errorMessage = '';
  successMessage = '';

  filtros = { desde: fechaLocal(new Date(Date.now() - 7 * 86400000)), hasta: fechaLocal(), tipo: '' };
  nueva = { tipo: 'ronda' as TipoNovedad, descripcion: '', departamento_id: null as number | null, fotos: [] as string[] };

  ngOnInit(): void {
    this.cargar();
    this.porteriaService.listarDepartamentos().subscribe({ next: (departamentos) => (this.departamentos = departamentos) });
  }

  cargar(): void {
    this.cargando = true;
    this.bitacoraService.listar(this.filtros).subscribe({
      next: (novedades) => {
        this.novedades = novedades;
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.errorMessage = error?.error?.message || 'No se pudo cargar la bitácora.';
      }
    });
  }

  async agregarFotos(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const archivos = Array.from(input.files || []).slice(0, FOTOS_MAX - this.nueva.fotos.length);

    try {
      for (const archivo of archivos) {
        this.nueva.fotos.push(await comprimirImagen(archivo));
      }
    } catch (mensaje) {
      this.errorMessage = String(mensaje);
    }

    input.value = '';
  }

  quitarFoto(index: number): void {
    this.nueva.fotos.splice(index, 1);
  }

  registrar(): void {
    if (this.nueva.descripcion.trim().length < 5 || this.guardando) {
      return;
    }

    this.guardando = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.bitacoraService.registrar({
      tipo: this.nueva.tipo,
      descripcion: this.nueva.descripcion.trim(),
      departamento_id: this.nueva.departamento_id,
      fotos_base64: this.nueva.fotos
    }).subscribe({
      next: () => {
        this.guardando = false;
        this.successMessage = 'Novedad registrada en la bitácora.';
        this.nueva = { tipo: 'ronda', descripcion: '', departamento_id: null, fotos: [] };
        this.filtros.hasta = fechaLocal();
        this.cargar();
      },
      error: (error) => {
        this.guardando = false;
        this.errorMessage = error?.error?.message || 'No se pudo registrar la novedad.';
      }
    });
  }

  verFoto(event: Event, foto: string): void {
    this.comprobantesService.abrirEnlace(this.bitacoraService.enlaceFoto(foto), event);
  }
}
