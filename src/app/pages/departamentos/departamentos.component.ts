import { Component, OnInit } from '@angular/core';
import { DepartamentosService } from '../../services/departamentos.service';
import { TorresService } from '../../services/torres.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { startWith } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
  selector: 'app-departamentos',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './departamentos.component.html',
  styleUrl: './departamentos.component.scss'
})
export class DepartamentosComponent implements OnInit {

  lista: any[] = [];
  listaFiltrada: any[] = [];
  torres: any[] = [];
  tiposDisponibles: string[] = [];
  numerosDisponibles: string[] = [];
  paginaActual = 1;
  elementosPorPagina = 10;
  
  torreFilterControl = new FormControl('');
  tipoFilterControl = new FormControl('');
  numeroFilterControl = new FormControl('');
  departamentoSeleccionado: any = null;

  constructor(
    private departamentoService: DepartamentosService,
    private torresService: TorresService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarTorres();
    this.cargarDepartamentos();
    this.setupSearch();
  }

  cargarTorres() {
    this.torresService.list().subscribe((res: any) => {
      const torresApi = Array.isArray(res) ? res : [];
      const torresBase = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(numero => ({ numero }));
      const torresMap = new Map<number, any>();

      torresBase.forEach(torre => torresMap.set(torre.numero, torre));
      torresApi.forEach(torre => {
        const numero = Number(torre?.numero);
        if (!Number.isNaN(numero)) {
          torresMap.set(numero, { ...torre, numero });
        }
      });

      this.torres = Array.from(torresMap.values()).sort((a, b) => a.numero - b.numero);
      console.log('Torres cargadas:', this.torres);
    }, () => {
      // Fallback local en caso de que el endpoint de torres no responda
      this.torres = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(numero => ({ numero }));
    });
  }

  cargarDepartamentos() {
    this.departamentoService.list().subscribe((res: any) => {
      const raw = Array.isArray(res) ? res : res?.data;
      const departamentos = Array.isArray(raw) ? raw : [];

      const normalizados = departamentos.map((item: any) => {
        const parsed = this.parseCodigoDepartamento((item?.numero ?? '').toString());

        return {
          id: Number(item?.id),
          torreId: Number(item?.torre_id ?? item?.torreId ?? 0),
          codigo: (item?.numero ?? '').toString(),
          torre: Number(item?.torre_numero ?? parsed.torre ?? 0),
          tipo: parsed.tipo,
          numero: parsed.numero,
          piso: parsed.piso
        };
      });

      this.lista = normalizados;
      this.listaFiltrada = normalizados;
      this.tiposDisponibles = Array.from(new Set(normalizados.map(item => item.tipo))).sort();
      this.actualizarNumerosDisponibles();
      this.irAPagina(1);
      console.log('Departamentos cargados:', normalizados);
    }, () => {
      this.lista = [];
      this.listaFiltrada = [];
      this.tiposDisponibles = [];
      this.numerosDisponibles = [];
    });
  }

  private parseCodigoDepartamento(codigo: string) {
    const match = codigo.match(/^T(\d+)(SS|PB|D)(\d+)$/i);
    if (!match) {
      return {
        torre: 0,
        tipo: 'DEP',
        numero: codigo,
        piso: ''
      };
    }

    const torre = Number(match[1]);
    const tipoRaw = match[2].toUpperCase();
    const numero = match[3];
    const tipo = tipoRaw === 'SS' ? 'SUB' : tipoRaw === 'PB' ? 'PB' : 'DEP';
    const piso = tipo === 'DEP'
      ? numero.charAt(0)
      : tipo === 'SUB'
        ? `S${numero.charAt(0)}`
        : 'PB';

    return {
      torre,
      tipo,
      numero,
      piso
    };
  }

  setupSearch() {
    this.torreFilterControl.valueChanges
      .pipe(startWith(''))
      .subscribe(() => {
        this.actualizarNumerosDisponibles();
        this.filtrar();
      });

    this.tipoFilterControl.valueChanges
      .pipe(startWith(''))
      .subscribe(() => {
        this.actualizarNumerosDisponibles();
        this.filtrar();
      });

    this.numeroFilterControl.valueChanges
      .pipe(startWith(''))
      .subscribe(() => {
        this.filtrar();
      });
  }

  private actualizarNumerosDisponibles() {
    const torreSeleccionada = this.torreFilterControl.value;
    const tipoSeleccionado = this.tipoFilterControl.value;

    const base = this.lista.filter(depto => {
      const cumpleTorre = !torreSeleccionada ||
        (depto.torre && depto.torre.toString() === torreSeleccionada.toString());

      const cumpleTipo = !tipoSeleccionado ||
        (depto.tipo && depto.tipo.toString() === tipoSeleccionado.toString());

      return cumpleTorre && cumpleTipo;
    });

    this.numerosDisponibles = Array.from(new Set(base.map(item => item.numero)))
      .sort((a, b) => Number(a) - Number(b));

    const numeroActual = this.numeroFilterControl.value;
    if (numeroActual && !this.numerosDisponibles.includes(numeroActual)) {
      this.numeroFilterControl.setValue('', { emitEvent: false });
    }
  }

  filtrar() {
    const torreSeleccionada = this.torreFilterControl.value;
    const tipoSeleccionado = this.tipoFilterControl.value;
    const numeroSeleccionado = this.numeroFilterControl.value;

    this.listaFiltrada = this.lista.filter(depto => {
      const cumpleTorre = !torreSeleccionada || 
        (depto.torre && depto.torre.toString() === torreSeleccionada.toString());

      const cumpleTipo = !tipoSeleccionado ||
        (depto.tipo && depto.tipo.toString() === tipoSeleccionado.toString());

      const cumpleNumero = !numeroSeleccionado ||
        (depto.numero && depto.numero.toString() === numeroSeleccionado.toString());

      return cumpleTorre && cumpleTipo && cumpleNumero;
    });

    this.irAPagina(1);
  }

  limpiarFiltros() {
    this.torreFilterControl.setValue('');
    this.tipoFilterControl.setValue('');
    this.numeroFilterControl.setValue('');
    this.listaFiltrada = this.lista;
    this.irAPagina(1);
  }

  get totalPaginas(): number {
    return Math.max(Math.ceil(this.listaFiltrada.length / this.elementosPorPagina), 1);
  }

  get listaPaginada(): any[] {
    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    return this.listaFiltrada.slice(inicio, inicio + this.elementosPorPagina);
  }

  get inicioRegistro(): number {
    if (!this.listaFiltrada.length) {
      return 0;
    }

    return (this.paginaActual - 1) * this.elementosPorPagina + 1;
  }

  get finRegistro(): number {
    return Math.min(this.paginaActual * this.elementosPorPagina, this.listaFiltrada.length);
  }

  get paginasVisibles(): number[] {
    const maxBotones = 5;
    const mitad = Math.floor(maxBotones / 2);
    let inicio = Math.max(this.paginaActual - mitad, 1);
    const fin = Math.min(inicio + maxBotones - 1, this.totalPaginas);

    inicio = Math.max(fin - maxBotones + 1, 1);

    return Array.from({ length: fin - inicio + 1 }, (_, index) => inicio + index);
  }

  irAPagina(pagina: number) {
    this.paginaActual = Math.min(Math.max(pagina, 1), this.totalPaginas);
  }

  cambiarElementosPorPagina(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.elementosPorPagina = Number(select.value);
    this.irAPagina(1);
  }

  seleccionarDepartamento(depto: any) {
    if (!depto?.id) {
      return;
    }

    this.router.navigate(['/dashboard/departamentos', depto.id, 'personas'], {
      queryParams: {
        codigo: depto.codigo || `T${depto.torre}${depto.tipo}${depto.numero}`,
        torreId: depto.torreId
      }
    });
  }

  cerrarDetalles() {
    this.departamentoSeleccionado = null;
  }

}
