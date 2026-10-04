import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';
import { DepartamentoPorteria, Paquete, PorteriaService, VisitaAnunciada } from '../../services/porteria.service';

function fechaLocal(date: Date): string {
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${mes}-${dia}`;
}

@Component({
  selector: 'app-porteria',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './porteria.component.html',
  styleUrl: './porteria.component.scss'
})
export class PorteriaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly porteriaService = inject(PorteriaService);

  // El residente anuncia visitas y ve sus paquetes; la guardia y la administracion operan la porteria.
  readonly esResidente = inject(AuthService).getUserRole() === 'condomino';

  readonly hoy = fechaLocal(new Date());
  readonly fechaMaxima = fechaLocal(new Date(Date.now() + 30 * 86400000));

  visitas: VisitaAnunciada[] = [];
  paquetes: Paquete[] = [];
  departamentos: DepartamentoPorteria[] = [];
  guardando = false;
  errorMessage = '';
  successMessage = '';

  readonly visitaForm = this.fb.nonNullable.group({
    visitante: ['', [Validators.required, Validators.maxLength(120)]],
    documento: ['', Validators.maxLength(40)],
    placa_vehiculo: ['', Validators.maxLength(20)],
    fecha: [this.hoy, Validators.required],
    nota: ['', Validators.maxLength(300)]
  });

  readonly paqueteForm = this.fb.group({
    torre: [null as number | null, Validators.required],
    departamento_id: [null as number | null, Validators.required],
    descripcion: ['', [Validators.required, Validators.maxLength(200)]]
  });

  ngOnInit(): void {
    this.cargar();

    if (!this.esResidente) {
      this.porteriaService.listarDepartamentos().subscribe({
        next: (departamentos) => {
          this.departamentos = departamentos;
        },
        error: (error) => this.mostrarError(error, 'No se pudieron cargar los departamentos.')
      });
    }
  }

  get torres(): number[] {
    return Array.from(new Set(this.departamentos.map((d) => d.torre_numero))).sort((a, b) => a - b);
  }

  get departamentosDeTorre(): DepartamentoPorteria[] {
    const torre = Number(this.paqueteForm.value.torre);

    return this.departamentos.filter((d) => d.torre_numero === torre);
  }

  get visitasHoy(): VisitaAnunciada[] {
    return this.visitas.filter((v) => v.es_hoy);
  }

  get visitasProximas(): VisitaAnunciada[] {
    return this.visitas.filter((v) => !v.es_hoy);
  }

  get paquetesEnPorteria(): Paquete[] {
    return this.paquetes.filter((p) => p.estado === 'en_porteria');
  }

  get paquetesEntregados(): Paquete[] {
    return this.paquetes.filter((p) => p.estado === 'entregado');
  }

  estadoVisita(visita: VisitaAnunciada): string {
    return { anunciada: 'Anunciada', ingreso: 'Ingresó', cancelada: 'Cancelada' }[visita.estado];
  }

  cargar(): void {
    this.porteriaService.listarVisitas().subscribe({
      next: (visitas) => {
        this.visitas = visitas;
      },
      error: (error) => this.mostrarError(error, 'No se pudieron cargar las visitas.')
    });
    this.porteriaService.listarPaquetes().subscribe({
      next: (paquetes) => {
        this.paquetes = paquetes;
      },
      error: (error) => this.mostrarError(error, 'No se pudieron cargar los paquetes.')
    });
  }

  anunciarVisita(): void {
    if (this.visitaForm.invalid || this.guardando) {
      this.visitaForm.markAllAsTouched();
      return;
    }

    this.ejecutar(this.porteriaService.anunciarVisita(this.visitaForm.getRawValue()), 'Visita anunciada. La guardia ya la tiene en su lista.', () => {
      this.visitaForm.reset({ visitante: '', documento: '', placa_vehiculo: '', fecha: this.hoy, nota: '' });
    });
  }

  cancelarVisita(visita: VisitaAnunciada): void {
    if (window.confirm(`Cancelar la visita de ${visita.visitante}?`)) {
      this.ejecutar(this.porteriaService.cancelarVisita(visita.id), 'Visita cancelada.');
    }
  }

  registrarIngreso(visita: VisitaAnunciada): void {
    if (window.confirm(`Registrar el ingreso de ${visita.visitante} a Torre ${visita.torre_numero}, ${visita.departamento_numero}?`)) {
      this.ejecutar(this.porteriaService.registrarIngreso(visita.id), 'Ingreso registrado. Quedó en el registro de accesos.');
    }
  }

  alCambiarTorre(): void {
    this.paqueteForm.patchValue({ departamento_id: null });
  }

  registrarPaquete(): void {
    if (this.paqueteForm.invalid || this.guardando) {
      this.paqueteForm.markAllAsTouched();
      return;
    }

    const { departamento_id, descripcion, torre } = this.paqueteForm.getRawValue();

    this.ejecutar(
      this.porteriaService.registrarPaquete({ departamento_id: Number(departamento_id), descripcion: String(descripcion).trim() }),
      'Paquete registrado. El residente lo verá en su cuenta.',
      () => this.paqueteForm.reset({ torre, departamento_id: null, descripcion: '' })
    );
  }

  entregarPaquete(paquete: Paquete): void {
    const nombre = window.prompt(`Quién retira el paquete de Torre ${paquete.torre_numero}, ${paquete.departamento_numero}?`);

    if (nombre === null) {
      return;
    }

    if (!nombre.trim()) {
      window.alert('Escribe el nombre de quien retira el paquete.');
      return;
    }

    this.ejecutar(this.porteriaService.entregarPaquete(paquete.id, nombre.trim().slice(0, 120)), 'Paquete entregado.');
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
        this.mostrarError(error, 'No se pudo completar la acción.');
        this.cargar();
      }
    });
  }

  private mostrarError(error: any, porDefecto: string): void {
    this.errorMessage = error?.error?.message || porDefecto;
  }
}
