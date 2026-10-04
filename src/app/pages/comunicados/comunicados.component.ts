import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { ADMINS } from '../../auth/permisos';
import { Comunicado, ComunicadosService } from '../../services/comunicados.service';

@Component({
  selector: 'app-comunicados',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './comunicados.component.html',
  styleUrl: './comunicados.component.scss'
})
export class ComunicadosComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly comunicadosService = inject(ComunicadosService);

  // Solo la administracion publica; el resto de roles lee.
  readonly puedePublicar = inject(AuthService).hasRole(ADMINS);

  comunicados: Comunicado[] = [];
  editando: Comunicado | null = null;
  cargando = true;
  guardando = false;
  errorMessage = '';
  successMessage = '';

  readonly form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    contenido: ['', [Validators.required, Validators.maxLength(5000)]],
    fijado: [false]
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.comunicadosService.listar().subscribe({
      next: (comunicados) => {
        this.comunicados = comunicados;
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.errorMessage = error?.error?.message || 'No se pudieron cargar los comunicados.';
      }
    });
  }

  guardar(): void {
    if (this.form.invalid || this.guardando) {
      this.form.markAllAsTouched();
      return;
    }

    const draft = this.form.getRawValue();
    const peticion = this.editando
      ? this.comunicadosService.actualizar(this.editando.id, draft)
      : this.comunicadosService.crear(draft);

    this.guardando = true;
    this.errorMessage = '';
    this.successMessage = '';

    peticion.subscribe({
      next: () => {
        this.successMessage = this.editando ? 'Comunicado actualizado.' : 'Comunicado publicado.';
        this.guardando = false;
        this.cancelarEdicion();
        this.cargar();
      },
      error: (error) => {
        this.guardando = false;
        this.errorMessage = error?.error?.message || 'No se pudo guardar el comunicado.';
      }
    });
  }

  editar(comunicado: Comunicado): void {
    this.editando = comunicado;
    this.successMessage = '';
    this.errorMessage = '';
    this.form.setValue({ titulo: comunicado.titulo, contenido: comunicado.contenido, fijado: comunicado.fijado });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicion(): void {
    this.editando = null;
    this.form.reset({ titulo: '', contenido: '', fijado: false });
  }

  alternarFijado(comunicado: Comunicado): void {
    this.comunicadosService.actualizar(comunicado.id, {
      titulo: comunicado.titulo,
      contenido: comunicado.contenido,
      fijado: !comunicado.fijado
    }).subscribe({
      next: () => this.cargar(),
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudo actualizar el comunicado.';
      }
    });
  }

  eliminar(comunicado: Comunicado): void {
    if (!window.confirm(`Eliminar el comunicado "${comunicado.titulo}"? Dejara de verse para todos.`)) {
      return;
    }

    this.comunicadosService.eliminar(comunicado.id).subscribe({
      next: () => {
        if (this.editando?.id === comunicado.id) {
          this.cancelarEdicion();
        }

        this.cargar();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudo eliminar el comunicado.';
      }
    });
  }

  fueEditado(comunicado: Comunicado): boolean {
    return new Date(comunicado.updated_at).getTime() - new Date(comunicado.created_at).getTime() > 60000;
  }
}
