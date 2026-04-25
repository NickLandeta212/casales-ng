import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TorresService } from '../../services/torres.service';

interface UsuarioItem {
  id: number;
  nombre: string;
  email: string;
  role: string;
  torreEtiqueta: string;
  departamentos: string[];
}

interface DepartamentoUsuarioItem {
  usuarioId: number | null;
  torreNumero: number;
  numero: string;
}

interface TorreOption {
  id: number;
  numero: number;
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss'
})
export class UsuariosComponent implements OnInit {
  vistaActual: 'list' | 'create' = 'list';
  listaUsuarios: UsuarioItem[] = [];
  usuarioSeleccionado: UsuarioItem | null = null;
  torres: TorreOption[] = [];
  cargando = false;

  nombreControl = new FormControl<string>('');
  emailControl = new FormControl<string>('');
  passwordControl = new FormControl<string>('');
  roleControl = new FormControl<'admin_general' | 'admin_conjunto' | 'tesorero'>('tesorero');
  torreControl = new FormControl<string>('');

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private torresService: TorresService
  ) { }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      const mode = data['mode'];
      this.vistaActual = mode === 'create' ? 'create' : 'list';
      this.cargarVistaActual();
    });
  }

  private cargarVistaActual() {
    if (this.vistaActual === 'create') {
      this.cargarTorres();
      return;
    }

    this.cargarUsuarios();
  }

  seleccionarUsuario(usuario: UsuarioItem) {
    this.usuarioSeleccionado = usuario;
  }

  crearUsuario() {
    if (!this.formularioValido()) {
      return;
    }

    const payload = {
      nombre: (this.nombreControl.value || '').trim(),
      email: (this.emailControl.value || '').trim(),
      password: this.passwordControl.value || '',
      role: this.roleControl.value || 'tesorero',
      torre_id: Number(this.torreControl.value)
    };

    this.http.post<any>(`${environment.endpoint}/usuarios`, payload).subscribe({
      next: () => {
        this.limpiarFormulario();
        this.router.navigate(['/dashboard/usuarios']);
      },
      error: (error) => {
        console.error('Error creando usuario', error);
      }
    });
  }

  limpiarFormulario() {
    this.nombreControl.setValue('');
    this.emailControl.setValue('');
    this.passwordControl.setValue('');
    this.roleControl.setValue('tesorero');
    this.torreControl.setValue('');
  }

  private cargarUsuarios() {
    this.cargando = true;

    forkJoin({
      usuarios: this.http.get<any>(`${environment.endpoint}/usuarios`),
      departamentos: this.http.get<any>(`${environment.endpoint}/departamentos`)
    }).subscribe({
      next: ({ usuarios, departamentos }) => {
        const usuariosNormalizados = this.normalizarUsuarios(usuarios);
        const departamentosNormalizados = this.normalizarDepartamentos(departamentos);

        this.listaUsuarios = usuariosNormalizados.map((usuario) => ({
          ...usuario,
          torreEtiqueta: this.resolverTorreEtiqueta(usuario.id, departamentosNormalizados),
          departamentos: this.resolverDepartamentosUsuario(usuario.id, departamentosNormalizados)
        }));

        this.cargando = false;
      },
      error: (error) => {
        console.error('Error cargando usuarios', error);
        this.listaUsuarios = [];
        this.usuarioSeleccionado = null;
        this.cargando = false;
      }
    });
  }

  private cargarTorres() {
    this.cargando = true;

    this.torresService.list().subscribe({
      next: (respuesta: any) => {
        const raw = Array.isArray(respuesta) ? respuesta : respuesta?.data;
        const lista = Array.isArray(raw) ? raw : [];

        this.torres = lista
          .map((item: any) => ({
            id: Number(item.id),
            numero: Number(item.numero)
          }))
          .filter((item: TorreOption) => item.id > 0 && item.numero > 0)
          .sort((a: TorreOption, b: TorreOption) => a.numero - b.numero);

        this.cargando = false;
      },
      error: (error) => {
        console.error('Error cargando torres', error);
        this.torres = [];
        this.cargando = false;
      }
    });
  }

  private formularioValido(): boolean {
    return Boolean(
      (this.nombreControl.value || '').trim() &&
      (this.emailControl.value || '').trim() &&
      (this.passwordControl.value || '').trim() &&
      this.roleControl.value &&
      this.torreControl.value
    );
  }

  getIniciales(nombre: string): string {
    return (nombre || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join('');
  }

  private normalizarUsuarios(respuesta: any): Array<Pick<UsuarioItem, 'id' | 'nombre' | 'email' | 'role'>> {
    const raw = Array.isArray(respuesta) ? respuesta : respuesta?.data;
    const lista = Array.isArray(raw) ? raw : [];

    return lista
      .map((item: any) => ({
        id: Number(item.id),
        nombre: String(item.nombre ?? '').trim(),
        email: String(item.email ?? '').trim(),
        role: String(item.role ?? '').trim()
      }))
      .filter((item) => item.id > 0);
  }

  private normalizarDepartamentos(respuesta: any): DepartamentoUsuarioItem[] {
    const raw = Array.isArray(respuesta) ? respuesta : respuesta?.data;
    const lista = Array.isArray(raw) ? raw : [];

    return lista
      .map((item: any) => ({
        usuarioId: item.usuario_id !== undefined && item.usuario_id !== null ? Number(item.usuario_id) : null,
        torreNumero: Number(item.torre_numero ?? item.torreNumero ?? 0),
        numero: String(item.numero ?? '').trim()
      }))
      .filter((item) => Number.isFinite(item.torreNumero) && item.torreNumero > 0);
  }

  private resolverTorreEtiqueta(usuarioId: number, departamentos: DepartamentoUsuarioItem[]): string {
    const torres = Array.from(
      new Set(
        departamentos
          .filter((item) => item.usuarioId === usuarioId)
          .map((item) => item.torreNumero)
      )
    ).sort((a, b) => a - b);

    if (torres.length === 0) {
      return 'Sin torre';
    }

    if (torres.length === 1) {
      return `Torre ${torres[0]}`;
    }

    return torres.map((torre) => `Torre ${torre}`).join(', ');
  }

  private resolverDepartamentosUsuario(usuarioId: number, departamentos: DepartamentoUsuarioItem[]): string[] {
    return departamentos
      .filter((item) => item.usuarioId === usuarioId)
      .map((item) => `Torre ${item.torreNumero} · Dpto ${item.numero}`)
      .sort((a, b) => a.localeCompare(b));
  }

}
