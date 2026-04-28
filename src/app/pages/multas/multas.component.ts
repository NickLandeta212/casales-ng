import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { startWith } from 'rxjs/operators';
import { DepartamentosService } from '../../services/departamentos.service';
import { MotivoOption, Multa, MultaDraft, MultasService } from '../../services/multas.service';

interface DepartamentoOption {
  id: number;
  numero: string;
  torreNumero: number;
}

@Component({
  selector: 'app-multas',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './multas.component.html',
  styleUrl: './multas.component.scss'
})
export class MultasComponent implements OnInit {
  vistaActual: 'list' | 'create' = 'list';
  multaSeleccionada: Multa | null = null;
  multaSeleccionadaId: string | number | null = null;

  listaMultas: Multa[] = [];
  departamentos: DepartamentoOption[] = [];
  departamentosDisponibles: DepartamentoOption[] = [];
  motivos: MotivoOption[] = [];
  torres: number[] = [];

  torreControl = new FormControl<string>('');
  departamentoControl = new FormControl<string>('');
  personaControl = new FormControl<string>('');
  personaCedulaControl = new FormControl<string>('');
  motivoIdControl = new FormControl<string>('');
  descripcionControl = new FormControl<string>('');
  montoControl = new FormControl<number | null>(null);

  editTorreControl = new FormControl<string>('');
  editDepartamentoControl = new FormControl<string>('');
  editPersonaControl = new FormControl<string>('');
  editPersonaCedulaControl = new FormControl<string>('');
  editMotivoIdControl = new FormControl<string>('');
  editDescripcionControl = new FormControl<string>('');
  editMontoControl = new FormControl<number | null>(null);
  editDepartamentosDisponibles: DepartamentoOption[] = [];
  cargando = false;

  constructor(
    private route: ActivatedRoute,
    private multasService: MultasService,
    private departamentosService: DepartamentosService
  ) {
    this.route.data.subscribe(data => {
      const mode = data['mode'];
      this.vistaActual = mode === 'create' ? 'create' : 'list';
    });

    this.multasService.multas$.subscribe(lista => {
      this.listaMultas = lista;

      if (this.multaSeleccionadaId === null) {
        return;
      }

      const multaActual = lista.find(item => item.id?.toString() === this.multaSeleccionadaId?.toString());
      if (!multaActual) {
        this.multaSeleccionada = null;
        this.multaSeleccionadaId = null;
        return;
      }

      this.multaSeleccionada = multaActual;
    });

    this.multasService.motivos$.subscribe(lista => {
      this.motivos = lista;
    });

    this.setupBusquedaDepartamentos();
    this.setupBusquedaDepartamentosEdicion();
  }

  ngOnInit(): void {
    this.cargando = true;
    this.cargarDepartamentos();
    this.cargarMotivos();

    this.multasService.loadMultas().subscribe({
      next: () => {
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando multas', err);
        this.cargando = false;
      }
    });
  }

  private cargarMotivos() {
    this.multasService.loadMotivos().subscribe({
      error: (err) => {
        console.error('Error cargando motivos para multas', err);
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
        console.error('Error cargando departamentos para multas', err);
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

  private filtrarDepartamentosPorTorre(torre: number): DepartamentoOption[] {
    if (Number.isNaN(torre) || torre <= 0) {
      return [];
    }

    return this.departamentos.filter((item) => item.torreNumero === torre);
  }

  seleccionarMulta(multa: Multa) {
    this.multaSeleccionada = multa;
    this.multaSeleccionadaId = multa.id ?? null;

    this.editTorreControl.setValue(multa.torreNumero > 0 ? multa.torreNumero.toString() : '');
    this.editDepartamentoControl.setValue(multa.departamentoId > 0 ? multa.departamentoId.toString() : '');
    this.editPersonaControl.setValue(this.getPersonaEtiqueta(multa));
    this.editPersonaCedulaControl.setValue(multa.personaCedula ?? '');
    this.editMotivoIdControl.setValue(multa.motivoId > 0 ? multa.motivoId.toString() : '');
    this.editDescripcionControl.setValue(multa.descripcion);
    this.editMontoControl.setValue(multa.monto);
  }

  guardarEdicionMulta() {
    if (this.multaSeleccionadaId === null || !this.formularioEdicionValido()) {
      return;
    }

    const payload: MultaDraft = {
      departamentoId: Number(this.editDepartamentoControl.value),
      motivoId: Number(this.editMotivoIdControl.value),
      ...this.parsePersonaCompleta(this.editPersonaControl.value),
      personaCedula: (this.editPersonaCedulaControl.value || '').trim(),
      descripcion: (this.editDescripcionControl.value || '').trim(),
      monto: Number(this.editMontoControl.value),
    };

    this.multasService.updateMulta(this.multaSeleccionadaId, payload).subscribe({
      error: (err) => {
        console.error('Error actualizando multa', err);
      }
    });
  }

  eliminarMultaSeleccionada() {
    if (this.multaSeleccionadaId === null) {
      return;
    }

    this.multasService.deleteMulta(this.multaSeleccionadaId).subscribe({
      next: () => {
        this.multaSeleccionada = null;
        this.multaSeleccionadaId = null;
      },
      error: (err) => {
        console.error('Error eliminando multa', err);
      }
    });
  }

  crearMulta() {
    if (!this.formularioValido()) {
      return;
    }

    const payload: MultaDraft = {
      departamentoId: Number(this.departamentoControl.value),
      motivoId: Number(this.motivoIdControl.value),
      ...this.parsePersonaCompleta(this.personaControl.value),
      personaCedula: (this.personaCedulaControl.value || '').trim(),
      descripcion: (this.descripcionControl.value || '').trim(),
      monto: Number(this.montoControl.value),
    };

    this.multasService.addMulta(payload).subscribe({
      next: () => {
        this.limpiarFormulario();
        this.vistaActual = 'list';
      },
      error: (err) => {
        console.error('Error creando multa', err);
      }
    });
  }

  limpiarFormulario() {
    this.torreControl.setValue('');
    this.departamentoControl.setValue('');
    this.personaControl.setValue('');
    this.personaCedulaControl.setValue('');
    this.motivoIdControl.setValue('');
    this.descripcionControl.setValue('');
    this.montoControl.setValue(null);
  }

  private formularioValido(): boolean {
    return Boolean(
      this.torreControl.value &&
      this.departamentoControl.value &&
      (this.personaControl.value || '').trim() &&
      (this.personaCedulaControl.value || '').trim() &&
      this.motivoIdControl.value &&
      (this.descripcionControl.value || '').trim() &&
      this.montoControl.value
    );
  }

  private formularioEdicionValido(): boolean {
    return Boolean(
      this.editTorreControl.value &&
      this.editDepartamentoControl.value &&
      (this.editPersonaControl.value || '').trim() &&
      (this.editPersonaCedulaControl.value || '').trim() &&
      this.editMotivoIdControl.value &&
      (this.editDescripcionControl.value || '').trim() &&
      this.editMontoControl.value
    );
  }

  private parsePersonaCompleta(valor: string | null): Pick<MultaDraft, 'personaNombre' | 'personaApellidos'> {
    const texto = (valor || '').trim();

    if (!texto) {
      return { personaNombre: '', personaApellidos: '' };
    }

    const partes = texto.split(/\s+/).filter(Boolean);

    if (partes.length === 1) {
      return { personaNombre: partes[0], personaApellidos: '' };
    }

    return {
      personaNombre: partes.slice(0, -1).join(' '),
      personaApellidos: partes.slice(-1).join(' ')
    };
  }

  getDepartamentoEtiqueta(multa: Multa): string {
    if (multa.departamentoNumero) {
      return multa.departamentoNumero;
    }

    return `T${multa.torreNumero}D${multa.departamentoId}`;
  }

  getPersonaEtiqueta(multa: Multa): string {
    const nombre = `${multa.personaNombre ?? ''} ${multa.personaApellidos ?? ''}`.trim();
    return nombre || 'Sin persona';
  }

}
