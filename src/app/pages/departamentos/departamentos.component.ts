import { Component, OnInit } from '@angular/core';
import { DepartamentosService } from '../../services/departamentos.service';
import { TorresService } from '../../services/torres.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { startWith } from 'rxjs/operators';

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
  
  torreFilterControl = new FormControl('');
  tipoFilterControl = new FormControl('');
  numeroFilterControl = new FormControl('');
  departamentoSeleccionado: any = null;

  constructor(
    private departamentoService: DepartamentosService,
    private torresService: TorresService
  ) { }

  ngOnInit(): void {
    this.cargarTorres();
    this.cargarDepartamentosGenerados();
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

  cargarDepartamentosGenerados() {
    const generados = this.generarDepartamentos();
    this.lista = generados;
    this.listaFiltrada = generados;
    this.tiposDisponibles = Array.from(new Set(generados.map(item => item.tipo))).sort();
    this.actualizarNumerosDisponibles();
    console.log('Departamentos generados:', generados);
  }

  private generarDepartamentos() {
    const departamentos: any[] = [];

    for (let torre = 1; torre <= 10; torre++) {
    
      if (torre <= 4 || torre === 8) {
        const subNumeros = ['101', '102', '201', '202'];
        subNumeros.forEach(numero => {
          departamentos.push({
            torre,
            tipo: 'SUB',
            numero,
            piso: `S${numero.startsWith('1') ? 1 : 2}`
          });
        });
      }

  
      const maxPb = torre >= 8 ? 4 : 8;
      for (let n = 1; n <= maxPb; n++) {
        departamentos.push({
          torre,
          tipo: 'PB',
          numero: n.toString().padStart(3, '0'),
          piso: 'PB'
        });
      }
      const maxDepPorPiso = torre >= 8 ? 4 : 8;
      for (let piso = 1; piso <= 7; piso++) {
        for (let n = 1; n <= maxDepPorPiso; n++) {
          departamentos.push({
            torre,
            tipo: 'DEP',
            numero: `${piso}${n.toString().padStart(2, '0')}`,
            piso
          });
        }
      }
    }

    return departamentos;
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
  }

  limpiarFiltros() {
    this.torreFilterControl.setValue('');
    this.tipoFilterControl.setValue('');
    this.numeroFilterControl.setValue('');
    this.listaFiltrada = this.lista;
  }

  seleccionarDepartamento(depto: any) {
    this.departamentoSeleccionado = depto;
  }

  cerrarDetalles() {
    this.departamentoSeleccionado = null;
  }

}
