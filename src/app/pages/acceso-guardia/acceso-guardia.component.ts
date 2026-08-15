import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { AuditService } from '../../services/audit.service';
import { LocalStoreService } from '../../services/local-store.service';
import { Persona, PersonasService } from '../../services/personas.service';

interface RegistroAcceso {
  id: string;
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
  autorizacion: 'pendiente' | 'autorizado' | 'rechazado';
  estado: 'en_porteria' | 'ingreso' | 'salio' | 'rechazado';
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
  readonly storageKey = 'casales_acceso_guardia';

  constructor(
    private fb: FormBuilder,
    private personasService: PersonasService,
    private auditService: AuditService,
    private localStore: LocalStoreService
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;
    const autorizado = value.autorizacion === 'autorizado';
    const registro: RegistroAcceso = {
      id: crypto.randomUUID(),
      fecha: new Date().toISOString().slice(0, 10),
      horaIngreso: this.currentTime(),
      torre: String(value.torre).trim(),
      departamento: String(value.departamento).trim(),
      duenioContactado: String(value.duenioContactado).trim(),
      visitante: String(value.visitante).trim(),
      documento: String(value.documento || '').trim(),
      placaVehiculo: String(value.placaVehiculo || '').trim(),
      horaIngresoVehiculo: String(value.horaIngresoVehiculo || '').trim(),
      autorizacion: value.autorizacion,
      estado: autorizado ? 'ingreso' : value.autorizacion === 'rechazado' ? 'rechazado' : 'en_porteria',
      observacion: String(value.observacion || '').trim()
    };

    this.registros = [registro, ...this.registros];
    this.persist();
    this.auditService.log(
      'Acceso',
      'Registrar visitante',
      `${registro.visitante} para ${registro.torre}/${registro.departamento} (${this.getEstadoLabel(registro)})`
    );
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
  }

  marcarAutorizado(registro: RegistroAcceso): void {
    this.updateRegistro(registro.id, {
      autorizacion: 'autorizado',
      estado: 'ingreso',
      horaIngreso: registro.horaIngreso || this.currentTime()
    });
    this.auditService.log('Acceso', 'Autorizar ingreso', `${registro.visitante} - ${registro.torre}/${registro.departamento}`);
  }

  marcarSalida(registro: RegistroAcceso): void {
    this.updateRegistro(registro.id, {
      estado: 'salio',
      horaSalida: this.currentTime()
    });
    this.auditService.log('Acceso', 'Registrar salida', `${registro.visitante} - ${registro.torre}/${registro.departamento}`);
  }

  marcarRechazado(registro: RegistroAcceso): void {
    this.updateRegistro(registro.id, {
      autorizacion: 'rechazado',
      estado: 'rechazado'
    });
    this.auditService.log('Acceso', 'Rechazar ingreso', `${registro.visitante} - ${registro.torre}/${registro.departamento}`);
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

  private updateRegistro(id: string, changes: Partial<RegistroAcceso>): void {
    this.registros = this.registros.map((registro) => registro.id === id ? { ...registro, ...changes } : registro);
    this.persist();
  }

  private load(): void {
    this.registros = this.localStore.read<RegistroAcceso[]>(this.storageKey, []);
  }

  private persist(): void {
    this.localStore.write(this.storageKey, this.registros);
  }

  private currentTime(): string {
    return new Intl.DateTimeFormat('es-EC', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date());
  }
}
