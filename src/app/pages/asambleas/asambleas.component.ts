import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { ADMINS } from '../../auth/permisos';
import { Asamblea, AsambleasService } from '../../services/asambleas.service';
import { descargarArchivo, mensajeDeErrorBlob } from '../../shared/utils/descargar-archivo';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const ESTADOS: Record<Asamblea['estado'], string> = { convocada: 'Convocada', realizada: 'Realizada', cancelada: 'Cancelada' };

// Asambleas: la administracion convoca con orden del dia; al convocar se publica un comunicado fijado
// y se envia la convocatoria en PDF por correo. Todos pueden descargar la convocatoria.
@Component({
  selector: 'app-asambleas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asambleas.component.html',
  styleUrl: './asambleas.component.scss'
})
export class AsambleasComponent implements OnInit {
  private readonly asambleasService = inject(AsambleasService);
  private readonly authService = inject(AuthService);

  readonly esAdmin = this.authService.hasRole(ADMINS);
  readonly estados = ESTADOS;
  asambleas: Asamblea[] = [];
  cargando = false;
  guardando = false;
  procesandoId: number | null = null;
  errorMessage = '';
  successMessage = '';

  mostrarFormulario = false;
  nueva = this.formularioVacio();

  ngOnInit(): void {
    this.cargar();
  }

  private formularioVacio() {
    return {
      titulo: '',
      tipo: 'ordinaria' as 'ordinaria' | 'extraordinaria',
      fecha_hora: '',
      lugar: 'Salón comunal',
      puntos: ['Constatación del quórum', 'Lectura y aprobación del acta anterior', 'Informe de la administración', 'Varios'],
      publicar_comunicado: true,
      enviar_correo: true
    };
  }

  get proximas(): Asamblea[] {
    return this.asambleas.filter((a) => a.estado === 'convocada').sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
  }

  get anteriores(): Asamblea[] {
    return this.asambleas.filter((a) => a.estado !== 'convocada');
  }

  get minFechaHora(): string {
    const ahora = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return ahora.toISOString().slice(0, 16);
  }

  get puedeConvocar(): boolean {
    return this.nueva.titulo.trim().length >= 3 && !!this.nueva.fecha_hora && this.nueva.lugar.trim().length > 0
      && this.nueva.puntos.some((p) => p.trim());
  }

  mesCorto(fecha: string): string {
    const d = new Date(fecha);
    return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
  }

  trackIndex(index: number): number {
    return index;
  }

  agregarPunto(): void {
    this.nueva.puntos.push('');
  }

  quitarPunto(index: number): void {
    this.nueva.puntos.splice(index, 1);
  }

  cargar(): void {
    this.cargando = true;
    this.asambleasService.listar().subscribe({
      next: (asambleas) => {
        this.asambleas = asambleas;
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.errorMessage = error?.error?.message || 'No se pudieron cargar las asambleas.';
      }
    });
  }

  convocar(): void {
    if (!this.puedeConvocar || this.guardando) {
      return;
    }

    const puntos = this.nueva.puntos.map((p) => p.trim()).filter(Boolean);
    const aviso = this.nueva.enviar_correo ? ' Se enviará la convocatoria por correo a los residentes.' : '';

    if (!window.confirm(`Convocar "${this.nueva.titulo.trim()}" con ${puntos.length} punto(s) en el orden del día?${aviso}`)) {
      return;
    }

    this.guardando = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.asambleasService.convocar({
      titulo: this.nueva.titulo.trim(),
      tipo: this.nueva.tipo,
      fecha_hora: this.nueva.fecha_hora,
      lugar: this.nueva.lugar.trim(),
      orden_del_dia: puntos,
      publicar_comunicado: this.nueva.publicar_comunicado,
      enviar_correo: this.nueva.enviar_correo
    }).subscribe({
      next: (res) => {
        this.guardando = false;
        this.successMessage = res.message;
        this.nueva = this.formularioVacio();
        this.mostrarFormulario = false;
        this.cargar();
      },
      error: (error) => {
        this.guardando = false;
        this.errorMessage = error?.error?.message || 'No se pudo convocar la asamblea.';
      }
    });
  }

  cerrar(asamblea: Asamblea, estado: 'realizada' | 'cancelada'): void {
    const pregunta = estado === 'realizada'
      ? `Resume lo resuelto en "${asamblea.titulo}" (decisiones, votaciones):`
      : `Motivo de la cancelación de "${asamblea.titulo}" (se avisará por correo):`;
    const resultado = window.prompt(pregunta);

    if (resultado === null) {
      return;
    }

    if (resultado.trim().length < 10) {
      window.alert('Escribe al menos 10 caracteres.');
      return;
    }

    this.procesandoId = asamblea.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.asambleasService.cerrar(asamblea.id, { estado, resultado: resultado.trim().slice(0, 3000) }).subscribe({
      next: (res) => {
        this.procesandoId = null;
        this.successMessage = res.message;
        this.cargar();
      },
      error: (error) => {
        this.procesandoId = null;
        this.errorMessage = error?.error?.message || 'No se pudo actualizar la asamblea.';
      }
    });
  }

  descargar(asamblea: Asamblea): void {
    this.asambleasService.convocatoriaPdf(asamblea.id).subscribe({
      next: (blob) => descargarArchivo(blob, `convocatoria-asamblea-${asamblea.id}.pdf`),
      error: async (error) => (this.errorMessage = await mensajeDeErrorBlob(error, 'No se pudo descargar la convocatoria.'))
    });
  }
}
