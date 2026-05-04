import { Component, OnInit } from '@angular/core';
import { TorresService } from '../../services/torres.service';
import { DepartamentosService } from '../../services/departamentos.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  userName = 'Usuario';
  authorizedTorreIds: number[] = [];
  authorizedTorreNumeros: number[] = [];
  totalTorres = 0;
  totalDepartamentos = 0;
  totalCondominos = 0;
  totalUsuarios = 0;
  totalReservas = 0;
  totalMultas = 0;

  reservasRecientes: any[] = [];
  multasRecientes: any[] = [];

  constructor(
    private http: HttpClient,
    private torresService: TorresService,
    private departamentosService: DepartamentosService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  cargarEstadisticas() {
    this.userName = localStorage.getItem('user_display_name') || 'Usuario';
    this.authorizedTorreIds = this.authService.getAuthorizedTorreIds();

    forkJoin({
      torres: this.torresService.list().pipe(catchError(() => of([]))),
      departamentos: this.departamentosService.list().pipe(catchError(() => of([]))),
      usuarios: this.fetchCollection('/usuarios'),
      condominos: this.fetchCollection('/personas'),
      reservas: this.fetchCollection('/reservas'),
      multas: this.fetchCollection('/multas')
    }).subscribe({
      next: (resultados: any) => {
        const torres = this.normalizeList(resultados.torres);
        const departamentos = this.normalizeList(resultados.departamentos);
        const usuarios = this.normalizeList(resultados.usuarios);
        const condominos = this.normalizeList(resultados.condominos);
        const reservas = this.normalizeList(resultados.reservas);
        const multas = this.normalizeList(resultados.multas);
        const torresAutorizadas = this.getTorresAutorizadas(torres);

        this.authorizedTorreNumeros = torresAutorizadas.map((torre: any) => Number(torre.numero));

        const departamentosAutorizados = this.filterByAuthorizedTorres(departamentos);
        const reservasAutorizadas = this.filterByAuthorizedTorres(reservas);
        const multasAutorizadas = this.filterByAuthorizedTorres(multas);

        this.totalTorres = torresAutorizadas.length;
        this.totalDepartamentos = departamentosAutorizados.length;
        this.totalUsuarios = this.countUsuariosAutorizados(usuarios, departamentosAutorizados);
        this.totalCondominos = this.filterByAuthorizedTorres(condominos).length;
        this.totalReservas = reservasAutorizadas.length;
        this.totalMultas = multasAutorizadas.length;
        this.reservasRecientes = reservasAutorizadas.slice(0, 5);
        this.multasRecientes = multasAutorizadas.slice(0, 5);
      },
      error: (error) => console.error('Error cargando estadisticas:', error)
    });
  }

  private fetchCollection(path: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.endpoint}${path}`).pipe(
      catchError(() => of([]))
    );
  }

  private normalizeList(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.items)) {
      return response.items;
    }

    return [];
  }

  private getTorresAutorizadas(torres: any[]): any[] {
    if (this.authService.getUserRole() === 'admin_general' || this.authorizedTorreIds.length === 0) {
      return torres;
    }

    return torres.filter((torre) => this.authorizedTorreIds.includes(Number(torre.id)));
  }

  private filterByAuthorizedTorres(items: any[]): any[] {
    if (this.authService.getUserRole() === 'admin_general' || this.authorizedTorreIds.length === 0) {
      return items;
    }

    return items.filter((item) => {
      const torreId = Number(item.torre_id ?? item.torreId ?? 0);
      const torreNumero = Number(item.torre_numero ?? item.torreNumero ?? 0);

      return this.authorizedTorreIds.includes(torreId) || this.authorizedTorreNumeros.includes(torreNumero);
    });
  }

  private countUsuariosAutorizados(usuarios: any[], departamentos: any[]): number {
    if (this.authService.getUserRole() === 'admin_general') {
      return usuarios.length;
    }

    const ids = new Set(
      departamentos
        .map((departamento) => Number(departamento.usuario_id ?? departamento.usuarioId ?? 0))
        .filter((id) => id > 0)
    );

    return ids.size;
  }
}
