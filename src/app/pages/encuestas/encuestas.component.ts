import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';
import { ADMINS } from '../../auth/permisos';
import { Encuesta, EncuestaOpcion, EncuestasService } from '../../services/encuestas.service';

const OPCIONES_MIN = 2;
const OPCIONES_MAX = 10;

@Component({
  selector: 'app-encuestas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './encuestas.component.html',
  styleUrl: './encuestas.component.scss'
})
export class EncuestasComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly encuestasService = inject(EncuestasService);
  private readonly authService = inject(AuthService);

  // La administracion crea y cierra; cada departamento vota una vez; tesoreria solo consulta.
  readonly puedeAdministrar = this.authService.hasRole(ADMINS);
  readonly esResidente = this.authService.getUserRole() === 'condomino';

  encuestas: Encuesta[] = [];
  // Opcion marcada en cada encuesta antes de confirmar el voto.
  seleccion: Record<number, number> = {};
  cargando = true;
  guardando = false;
  errorMessage = '';
  successMessage = '';

  readonly form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    descripcion: ['', Validators.maxLength(2000)],
    opciones: this.fb.nonNullable.array([this.nuevaOpcion(), this.nuevaOpcion()])
  });

  ngOnInit(): void {
    this.cargar();
  }

  get opciones(): FormArray {
    return this.form.controls.opciones;
  }

  get puedeAgregarOpcion(): boolean {
    return this.opciones.length < OPCIONES_MAX;
  }

  get puedeQuitarOpcion(): boolean {
    return this.opciones.length > OPCIONES_MIN;
  }

  agregarOpcion(): void {
    this.opciones.push(this.nuevaOpcion());
  }

  quitarOpcion(indice: number): void {
    this.opciones.removeAt(indice);
  }

  porcentaje(encuesta: Encuesta, opcion: EncuestaOpcion): number {
    return encuesta.total_votos ? Math.round(((opcion.votos || 0) / encuesta.total_votos) * 100) : 0;
  }

  participacion(encuesta: Encuesta): number {
    return encuesta.total_departamentos ? Math.round(((encuesta.total_votos || 0) / encuesta.total_departamentos) * 100) : 0;
  }

  puedeVotar(encuesta: Encuesta): boolean {
    return this.esResidente && encuesta.estado === 'abierta' && !encuesta.mi_voto;
  }

  cargar(): void {
    this.encuestasService.listar().subscribe({
      next: (encuestas) => {
        this.encuestas = encuestas;
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.errorMessage = error?.error?.message || 'No se pudieron cargar las encuestas.';
      }
    });
  }

  crear(): void {
    if (this.form.invalid || this.guardando) {
      this.form.markAllAsTouched();
      return;
    }

    const { titulo, descripcion, opciones } = this.form.getRawValue();

    this.ejecutar(this.encuestasService.crear({ titulo, descripcion, opciones }), 'Encuesta publicada.', () => {
      this.opciones.clear();
      this.opciones.push(this.nuevaOpcion());
      this.opciones.push(this.nuevaOpcion());
      this.form.reset({ titulo: '', descripcion: '', opciones: ['', ''] });
    });
  }

  votar(encuesta: Encuesta): void {
    const opcion = encuesta.opciones.find((o) => o.id === this.seleccion[encuesta.id]);

    if (!opcion || this.guardando) {
      return;
    }

    if (window.confirm(`Confirmas tu voto por "${opcion.texto}"? Es un voto por departamento y no se puede cambiar.`)) {
      this.ejecutar(this.encuestasService.votar(encuesta.id, opcion.id), 'Voto registrado.');
    }
  }

  cerrar(encuesta: Encuesta): void {
    if (window.confirm(`Cerrar la encuesta "${encuesta.titulo}"? Ya no se podrá votar.`)) {
      this.ejecutar(this.encuestasService.cerrar(encuesta.id), 'Encuesta cerrada.');
    }
  }

  eliminar(encuesta: Encuesta): void {
    if (window.confirm(`Eliminar la encuesta "${encuesta.titulo}" y todos sus votos? No se puede deshacer.`)) {
      this.ejecutar(this.encuestasService.eliminar(encuesta.id), 'Encuesta eliminada.');
    }
  }

  private nuevaOpcion() {
    return this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(150)]);
  }

  private ejecutar(peticion: Observable<unknown>, mensaje: string, alTerminar?: () => void): void {
    this.guardando = true;
    this.errorMessage = '';
    this.successMessage = '';

    peticion.subscribe({
      next: () => {
        this.guardando = false;
        this.successMessage = mensaje;
        alTerminar?.();
        this.cargar();
      },
      error: (error) => {
        this.guardando = false;
        this.errorMessage = error?.error?.message || 'No se pudo completar la acción.';
        this.cargar();
      }
    });
  }
}
