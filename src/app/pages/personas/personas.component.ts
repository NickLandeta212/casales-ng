import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { startWith } from 'rxjs/operators';
import { DepartamentosService } from '../../services/departamentos.service';
import { Persona, PersonaDraft, PersonasService } from '../../services/personas.service';

interface DepartamentoOption {
  id: number;
  numero: string;
  torreNumero: number;
}

@Component({
  selector: 'app-personas',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './personas.component.html',
  styleUrl: './personas.component.scss'
})
export class PersonasComponent implements OnInit {
  vistaActual: 'list' | 'create' = 'list';
  personaSeleccionada: Persona | null = null;
  personaSeleccionadaId: string | number | null = null;

  listaPersonas: Persona[] = [];
  departamentos: DepartamentoOption[] = [];

  torres: number[] = [];
  departamentosDisponibles: DepartamentoOption[] = [];

  torreControl = new FormControl<string>('');
  departamentoControl = new FormControl<string>('');
  nombresControl = new FormControl<string>('');
  apellidosControl = new FormControl<string>('');
  cedulaControl = new FormControl<string>('');
  celularControl = new FormControl<string>('');
  tipoControl = new FormControl<'dueno' | 'arrendatario'>('dueno');

  editTorreControl = new FormControl<string>('');
  editDepartamentoControl = new FormControl<string>('');
  editNombresControl = new FormControl<string>('');
  editApellidosControl = new FormControl<string>('');
  editCedulaControl = new FormControl<string>('');
  editCelularControl = new FormControl<string>('');
  editTipoControl = new FormControl<'dueno' | 'arrendatario'>('dueno');
  editDepartamentosDisponibles: DepartamentoOption[] = [];
  cargando = false;

  constructor(
    private route: ActivatedRoute,
    private personasService: PersonasService,
    private departamentosService: DepartamentosService
  ) {
    this.route.data.subscribe(data => {
      const mode = data['mode'];
      this.vistaActual = mode === 'create' ? 'create' : 'list';
    });

    this.personasService.personas$.subscribe(lista => {
      this.listaPersonas = lista;

      if (this.personaSeleccionadaId === null) {
        return;
      }

      const personaActual = lista.find(item => item.id?.toString() === this.personaSeleccionadaId?.toString());
      if (!personaActual) {
        this.personaSeleccionada = null;
        this.personaSeleccionadaId = null;
        return;
      }

      this.personaSeleccionada = personaActual;
    });

    this.setupBusquedaDepartamentos();
    this.setupBusquedaDepartamentosEdicion();
  }

  ngOnInit(): void {
    this.cargando = true;

    this.cargarDepartamentos();

    this.personasService.loadPersonas().subscribe({
      next: () => {
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando personas', err);
        this.cargando = false;
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
        console.error('Error cargando departamentos para personas', err);
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

  private filtrarDepartamentosPorTorre(torre: number): DepartamentoOption[] {
    if (Number.isNaN(torre) || torre <= 0) {
      return [];
    }

    return this.departamentos.filter((item) => item.torreNumero === torre);
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

  seleccionarPersona(persona: Persona) {
    this.personaSeleccionada = persona;
    this.personaSeleccionadaId = persona.id ?? null;

    const torreNumero = this.resolveTorreNumero(persona);
    const departamentoId = this.resolveDepartamentoId(persona, torreNumero);

    this.editTorreControl.setValue(torreNumero > 0 ? torreNumero.toString() : '');
    this.editDepartamentoControl.setValue(departamentoId > 0 ? departamentoId.toString() : '');
    this.editNombresControl.setValue(persona.nombres);
    this.editApellidosControl.setValue(persona.apellidos);
    this.editCedulaControl.setValue(persona.cedula);
    this.editCelularControl.setValue(persona.telefono);
    this.editTipoControl.setValue(persona.tipoResidencia);
  }

  private resolveTorreNumero(persona: Persona): number {
    const torre = Number(persona.torreNumero);
    if (!Number.isNaN(torre) && torre > 0) {
      return torre;
    }

    if (persona.departamentoCodigo) {
      const match = persona.departamentoCodigo.match(/^T(\d+)/i);
      if (match?.[1]) {
        return Number(match[1]);
      }
    }

    return 0;
  }

  private resolveDepartamentoId(persona: Persona, torreNumero: number): number {
    const departamentoId = Number(persona.departamentoId);
    if (!Number.isNaN(departamentoId) && departamentoId > 0) {
      return departamentoId;
    }

    if (persona.departamentoCodigo) {
      const match = this.departamentos.find((item) => item.numero === persona.departamentoCodigo);
      if (match) {
        return match.id;
      }
    }

    const fallback = this.departamentos.find((item) => item.torreNumero === torreNumero);
    return fallback ? fallback.id : 0;
  }

  guardarEdicionPersona() {
    if (this.personaSeleccionadaId === null || !this.formularioEdicionValido()) {
      return;
    }

    const personaActualizada: PersonaDraft = {
      departamentoId: Number(this.editDepartamentoControl.value),
      nombres: (this.editNombresControl.value || '').trim(),
      apellidos: (this.editApellidosControl.value || '').trim(),
      cedula: (this.editCedulaControl.value || '').trim(),
      telefono: (this.editCelularControl.value || '').trim(),
      tipoResidencia: this.editTipoControl.value || 'dueno'
    };

    this.personasService.updatePersona(this.personaSeleccionadaId, personaActualizada).subscribe({
      error: (err) => {
        console.error('Error actualizando persona', err);
      }
    });
  }

  eliminarPersonaSeleccionada() {
    if (this.personaSeleccionadaId === null) {
      return;
    }

    this.personasService.deletePersona(this.personaSeleccionadaId).subscribe({
      next: () => {
        this.personaSeleccionada = null;
        this.personaSeleccionadaId = null;
      },
      error: (err) => {
        console.error('Error eliminando persona', err);
      }
    });
  }

  private formularioEdicionValido(): boolean {
    return Boolean(
      this.editTorreControl.value &&
      this.editDepartamentoControl.value &&
      (this.editNombresControl.value || '').trim() &&
      (this.editApellidosControl.value || '').trim() &&
      (this.editCedulaControl.value || '').trim() &&
      (this.editCelularControl.value || '').trim() &&
      this.editTipoControl.value
    );
  }

  crearPersona() {
    if (!this.formularioValido()) {
      return;
    }

    const payload: PersonaDraft = {
      departamentoId: Number(this.departamentoControl.value),
      nombres: (this.nombresControl.value || '').trim(),
      apellidos: (this.apellidosControl.value || '').trim(),
      cedula: (this.cedulaControl.value || '').trim(),
      telefono: (this.celularControl.value || '').trim(),
      tipoResidencia: this.tipoControl.value || 'dueno'
    };

    this.personasService.addPersona(payload).subscribe({
      next: () => {
        this.limpiarFormulario();
        this.vistaActual = 'list';
      },
      error: (err) => {
        console.error('Error creando persona', err);
      }
    });
  }

  private formularioValido(): boolean {
    return Boolean(
      this.torreControl.value &&
      this.departamentoControl.value &&
      (this.nombresControl.value || '').trim() &&
      (this.apellidosControl.value || '').trim() &&
      (this.cedulaControl.value || '').trim() &&
      (this.celularControl.value || '').trim() &&
      this.tipoControl.value
    );
  }

  limpiarFormulario() {
    this.torreControl.setValue('');
    this.departamentoControl.setValue('');
    this.nombresControl.setValue('');
    this.apellidosControl.setValue('');
    this.cedulaControl.setValue('');
    this.celularControl.setValue('');
    this.tipoControl.setValue('dueno');
  }

  getTipoLabel(tipo: Persona['tipoResidencia']): string {
    return tipo === 'dueno' ? 'Dueño' : 'Arrendatario';
  }

  getNombreCompleto(persona: Persona): string {
    return `${persona.nombres} ${persona.apellidos}`.trim();
  }

  getDepartamentoEtiqueta(persona: Persona): string {
    if (persona.departamentoCodigo) {
      return persona.departamentoCodigo;
    }

    return `T${persona.torreNumero}D${persona.departamentoNumero}`;
  }
}
