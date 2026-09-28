import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { AccesosService, RegistroAcceso as RegistroApi } from '../../services/accesos.service';
import { Persona, PersonasService } from '../../services/personas.service';

// Vista del registro con los nombres que usa la plantilla.
interface RegistroAcceso {
  id: number;
  fecha: string;
  horaIngreso: string;
  horaSalida?: string;
  torre: string;
  departamento: string;
  duenioContactado: string;
  visitante: string;
  documento: string;
  placaVehiculo: string;
  horaIngresoVehiculo: string;
  autorizacion: RegistroApi['autorizacion'];
  estado: RegistroApi['estado'];
  observacion: string;
}

@Component({
  selector: 'app-acceso-guardia',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './acceso-guardia.component.html',
  styleUrl: './acceso-guardia.component.scss'
})
export class AccesoGuardiaComponent implements OnInit {
  form!: FormGroup;
  registros: RegistroAcceso[] = [];
  personas: Persona[] = [];
  guardando = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private personasService: PersonasService,
    private accesosService: AccesosService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      torre: ['', Validators.required],
      departamento: ['', Validators.required],
      duenioContactado: ['', Validators.required],
      visitante: ['', Validators.required],
      documento: [''],
      placaVehiculo: [''],
      horaIngresoVehiculo: [this.currentTime()],
      autorizacion: ['pendiente', Validators.required],
      observacion: ['']
    });

    this.load();
    this.personasService.loadPersonas().pipe(
      catchError(() => of([]))
    ).subscribe(() => {
      this.personas = this.personasService.getSnapshot();
    });
  }

  get registrosFiltrados(): RegistroAcceso[] {
    return this.registros;
  }

  get residentesSugeridos(): Persona[] {
    const torre = String(this.form?.value?.torre || '').replace(/\D/g, '');
    const departamento = String(this.form?.value?.departamento || '').trim().toLowerCase();

    if (!torre && !departamento) {
      return [];
    }

    return this.personas
      .filter((persona) => {
        const torreOk = !torre || String(persona.torreNumero || '').includes(torre);
        const departamentoOk = !departamento ||
          String(persona.departamentoNumero || '').toLowerCase().includes(departamento) ||
          String(persona.departamentoCodigo || '').toLowerCase().includes(departamento);

        return torreOk && departamentoOk;
      })
      .slice(0, 4);
  }

  registrar(): void {
    if (this.form.invalid || this.guardando) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;
    this.guardando = true;
    this.errorMessage = '';

    this.accesosService.registrar({
      torre: String(value.torre).trim(),
      departamento: String(value.departamento).trim(),
      duenio_contactado: String(value.duenioContactado).trim(),
      visitante: String(value.visitante).trim(),
      documento: String(value.documento || '').trim(),
      placa_vehiculo: String(value.placaVehiculo || '').trim(),
      hora_ingreso_vehiculo: String(value.horaIngresoVehiculo || '').trim(),
      autorizacion: value.autorizacion,
      observacion: String(value.observacion || '').trim()
    }).subscribe({
      next: (registro) => {
        this.guardando = false;
        this.registros = [this.toVista(registro), ...this.registros];
        this.form.reset({
          torre: value.torre,
          departamento: value.departamento,
          duenioContactado: '',
          visitante: '',
          documento: '',
          placaVehiculo: '',
          horaIngresoVehiculo: this.currentTime(),
          autorizacion: 'pendiente',
          observacion: ''
        });
      },
      error: (error) => {
        this.guardando = false;
        this.errorMessage = error?.error?.message || 'No se pudo registrar el visitante.';
      }
    });
  }

  marcarAutorizado(registro: RegistroAcceso): void {
    this.cambiarEstado(registro, 'autorizar');
  }

  marcarSalida(registro: RegistroAcceso): void {
    this.cambiarEstado(registro, 'salida');
  }

  marcarRechazado(registro: RegistroAcceso): void {
    this.cambiarEstado(registro, 'rechazar');
  }

  usarResidente(persona: Persona): void {
    const nombre = `${persona.nombres} ${persona.apellidos}`.trim();
    this.form.patchValue({
      duenioContactado: nombre,
      torre: persona.torreNumero ? `Torre ${persona.torreNumero}` : this.form.value.torre,
      departamento: persona.departamentoNumero || persona.departamentoCodigo || this.form.value.departamento
    });
  }

  getEstadoLabel(registro: RegistroAcceso): string {
    const labels: Record<RegistroAcceso['estado'], string> = {
      en_porteria: 'En portería',
      ingreso: 'Ingresó',
      salio: 'Salió',
      rechazado: 'Rechazado'
    };

    return labels[registro.estado];
  }

  private cambiarEstado(registro: RegistroAcceso, accion: 'autorizar' | 'rechazar' | 'salida'): void {
    this.errorMessage = '';

    this.accesosService.cambiarEstado(registro.id, accion).subscribe({
      next: (actualizado) => {
        this.registros = this.registros.map((item) => item.id === registro.id ? this.toVista(actualizado) : item);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudo actualizar el registro.';
        this.load();
      }
    });
  }

  private load(): void {
    this.accesosService.listar().subscribe({
      next: (registros) => {
        this.registros = registros.map((registro) => this.toVista(registro));
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudieron cargar los registros de acceso.';
      }
    });
  }

  private toVista(registro: RegistroApi): RegistroAcceso {
    return {
      id: registro.id,
      fecha: String(registro.created_at || '').slice(0, 10),
      horaIngreso: this.formatTime(registro.ingreso_at) || '-',
      horaSalida: this.formatTime(registro.salida_at) || undefined,
      torre: registro.torre,
      departamento: registro.departamento,
      duenioContactado: registro.duenio_contactado,
      visitante: registro.visitante,
      documento: registro.documento || '',
      placaVehiculo: registro.placa_vehiculo || '',
      horaIngresoVehiculo: registro.hora_ingreso_vehiculo || '',
      autorizacion: registro.autorizacion,
      estado: registro.estado,
      observacion: registro.observacion || ''
    };
  }

  private formatTime(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat('es-EC', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
      : '';
  }

  private currentTime(): string {
    return new Intl.DateTimeFormat('es-EC', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date());
  }
}
