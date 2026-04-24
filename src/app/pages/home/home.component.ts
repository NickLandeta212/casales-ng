import { Component, OnInit } from '@angular/core';
import { TorresService } from '../../services/torres.service';
import { DepartamentosService } from '../../services/departamentos.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit{

  // Estadísticas
  totalTorres: number = 0;
  totalDepartamentos: number = 0;
  totalCondominos: number = 0;
  totalUsuarios: number = 0;
  totalReservas: number = 0;
  totalMultas: number = 0;

  reservasRecientes: any[] = [];
  multasRecientes: any[] = [];

  constructor(
    private http: HttpClient,
    private torresService: TorresService,
    private departamentosService: DepartamentosService
  ) { }

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  cargarEstadisticas() {
    forkJoin({
      torres: this.torresService.list(),
      departamentos: this.departamentosService.list(),
      usuarios: this.fetchCollection('/usuarios'),
      condominos: this.fetchCollection('/personas')
    }).subscribe(
      (resultados: any) => {
        this.totalTorres = resultados.torres?.length || 0;
        this.totalDepartamentos = resultados.departamentos?.length || 0;
        this.totalUsuarios = resultados.usuarios?.length || 0;
        this.totalCondominos = resultados.condominos?.length || 0;
        console.log('Estadísticas cargadas:', {
          torres: this.totalTorres,
          departamentos: this.totalDepartamentos,
          usuarios: this.totalUsuarios,
          condominos: this.totalCondominos
        });
      },
      error => console.error('Error cargando estadísticas:', error)
    );
  }

  private fetchCollection(path: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.endpoint}${path}`).pipe(
      catchError(() => of([]))
    );
  }
}

