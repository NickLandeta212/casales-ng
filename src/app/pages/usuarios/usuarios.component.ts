import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TorresService } from '../../services/torres.service';
import { UsuariosService } from '../../services/usuarios.service';

interface UsuarioItem {
  id: number;
  nombre: string;
  email: string;
  role: string;
  pagePermissions: string[];
  torreIds: number[];
  torreEtiqueta: string;
  departamentos: string[];
}

interface DepartamentoUsuarioItem {
  usuarioId: number | null;
  torreNumero: number;
  numero: string;
  usuarioNombre: string;
  usuarioEmail: string;
  usuarioRole: string;
}

interface TorreOption {
  id: number;
  numero: number;
}

interface PagePermissionOption {
  key: string;
  label: string;
  description: string;
}

interface TorreAutorizadaDetalle {
  id: number;
  numero: number;
  departamentos: DepartamentoUsuarioItem[];
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
  departamentos: DepartamentoUsuarioItem[] = [];
  cargando = false;

  nombreControl = new FormControl<string>('');
  emailControl = new FormControl<string>('');
  passwordControl = new FormControl<string>('');
  torreControl = new FormControl<string>('');
  editRoleControl = new FormControl<'admin_general' | 'admin_conjunto' | 'tesorero' | 'condomino'>('condomino');
  pagePermissionsControl = new FormControl<string[]>([]);
  torreIdsControl = new FormControl<number[]>([]);

  pageOptions: PagePermissionOption[] = [
    { key: 'home', label: 'Inicio', description: 'Resumen general del conjunto.' },
    { key: 'torres', label: 'Torres', description: 'Listado e informacion de torres.' },
    { key: 'pagos_alicuota', label: 'Pagos alicuota', description: 'Aprobacion de pagos por torre.' },
    { key: 'departamentos', label: 'Departamentos', description: 'Informacion de departamentos autorizados.' },
    { key: 'reservas', label: 'Reservas', description: 'Revision de reservas.' },
    { key: 'personas', label: 'Personas', description: 'Listado de residentes.' },
    { key: 'personas_crear', label: 'Crear personas', description: 'Registro de nuevos residentes.' },
    { key: 'multas', label: 'Multas', description: 'Listado de multas.' },
    { key: 'multas_crear', label: 'Crear multas', description: 'Registro de nuevas multas.' },
    { key: 'usuarios', label: 'Usuarios', description: 'Listado e inspeccion de usuarios.' },
    { key: 'usuarios_crear', label: 'Crear usuarios', description: 'Alta de usuarios y permisos.' }
  ];

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private torresService: TorresService,
    private usuariosService: UsuariosService
  ) { }

  ngOnInit(): void {
    this.editRoleControl.valueChanges.subscribe((role) => this.aplicarPermisosPorRol(role || 'condomino'));

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

    this.cargarTorres();
    this.cargarUsuarios();
  }

  seleccionarUsuario(usuario: UsuarioItem) {
    this.usuarioSeleccionado = usuario;
    this.editRoleControl.setValue(usuario.role as 'admin_general' | 'admin_conjunto' | 'tesorero' | 'condomino', { emitEvent: false });
    this.pagePermissionsControl.setValue([...usuario.pagePermissions]);
    this.torreIdsControl.setValue([...usuario.torreIds]);
  }

  crearUsuario() {
    if (!this.formularioValido()) {
      return;
    }

    const payload = {
      nombre: (this.nombreControl.value || '').trim(),
      email: (this.emailControl.value || '').trim(),
      password: this.passwordControl.value || '',
      role: 'condomino',
      torre_id: Number(this.torreControl.value)
    };

    this.usuariosService.addUsuario(payload).subscribe({
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
    this.torreControl.setValue('');
  }

  private cargarUsuarios() {
    this.cargando = true;

    forkJoin({
      usuarios: this.usuariosService.loadUsers(),
      departamentos: this.http.get<any>(`${environment.endpoint}/departamentos`)
    }).subscribe({
      next: ({ usuarios, departamentos }) => {
        const usuariosNormalizados = Array.isArray(usuarios) ? usuarios : [];
        const departamentosNormalizados = this.normalizarDepartamentos(departamentos);
        this.departamentos = departamentosNormalizados;

        this.listaUsuarios = usuariosNormalizados.map((usuario: any) => ({
          id: Number(usuario.id),
          nombre: String(usuario.nombre ?? '').trim(),
          email: String(usuario.email ?? '').trim(),
          role: String(usuario.role ?? '').trim(),
          pagePermissions: Array.isArray(usuario.page_permissions) ? usuario.page_permissions : [],
          torreIds: Array.isArray(usuario.torre_ids) ? usuario.torre_ids.map((id: any) => Number(id)).filter((id: number) => id > 0) : [],
          torreEtiqueta: this.resolverTorreEtiqueta(Number(usuario.id), departamentosNormalizados),
          departamentos: this.resolverDepartamentosUsuario(Number(usuario.id), departamentosNormalizados)
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
    const nombre = (this.nombreControl.value || '').trim();
    const email = (this.emailControl.value || '').trim();
    const password = this.passwordControl.value || '';
    const torreId = this.torreControl.value;
    const hasNombre = nombre.length > 0;
    const hasEmail = email.length > 0;
    const hasPassword = (password || '').length > 0;
    const hasTorre = torreId !== undefined && torreId !== null && String(torreId).trim() !== '';

    return hasNombre && hasEmail && hasPassword && hasTorre;
  }

  guardarAutorizaciones() {
    if (!this.usuarioSeleccionado) {
      return;
    }

    const usuarioActual = this.usuarioSeleccionado;
    const payload = {
      nombre: usuarioActual.nombre,
      email: usuarioActual.email,
      role: this.editRoleControl.value || 'condomino',
      page_permissions: this.pagePermissionsControl.value || [],
      torre_ids: this.torreIdsControl.value || []
    };

    this.usuariosService.updateUsuario(usuarioActual.id, payload).subscribe({
      next: (usuarios) => {
        const actualizado = usuarios.find((usuario) => Number(usuario.id) === usuarioActual.id);
        if (actualizado) {
          this.usuarioSeleccionado = {
            ...usuarioActual,
            role: actualizado.role,
            pagePermissions: actualizado.page_permissions,
            torreIds: actualizado.torre_ids
          };
        }
      },
      error: (error) => {
        console.error('Error guardando autorizaciones', error);
      }
    });
  }

  eliminarUsuarioSeleccionado() {
    if (!this.usuarioSeleccionado) {
      return;
    }

    const usuarioActual = this.usuarioSeleccionado;
    const confirmado = window.confirm(`Eliminar usuario ${usuarioActual.nombre}?`);

    if (!confirmado) {
      return;
    }

    this.usuariosService.deleteUsuario(usuarioActual.id).subscribe({
      next: (usuarios) => {
        this.listaUsuarios = usuarios.map((usuario: any) => ({
          id: Number(usuario.id),
          nombre: String(usuario.nombre ?? '').trim(),
          email: String(usuario.email ?? '').trim(),
          role: String(usuario.role ?? '').trim(),
          pagePermissions: Array.isArray(usuario.page_permissions) ? usuario.page_permissions : [],
          torreIds: Array.isArray(usuario.torre_ids) ? usuario.torre_ids.map((id: any) => Number(id)).filter((id: number) => id > 0) : [],
          torreEtiqueta: this.resolverTorreEtiqueta(Number(usuario.id), this.departamentos),
          departamentos: this.resolverDepartamentosUsuario(Number(usuario.id), this.departamentos)
        }));
        this.usuarioSeleccionado = null;
      },
      error: (error) => {
        console.error('Error eliminando usuario', error);
      }
    });
  }

  togglePagePermission(permission: string) {
    const current = this.pagePermissionsControl.value || [];
    const next = current.includes(permission)
      ? current.filter((item) => item !== permission)
      : [...current, permission];

    this.pagePermissionsControl.setValue(next);
  }

  hasPagePermission(permission: string): boolean {
    return (this.pagePermissionsControl.value || []).includes(permission);
  }

  toggleTorreAutorizada(torreId: number) {
    const current = this.torreIdsControl.value || [];
    const next = current.includes(torreId)
      ? current.filter((item) => item !== torreId)
      : [...current, torreId];

    this.torreIdsControl.setValue(next.sort((a, b) => a - b));
  }

  hasTorreAutorizada(torreId: number): boolean {
    return (this.torreIdsControl.value || []).includes(torreId);
  }

  getPageLabels(keys: string[]): string {
    if (!keys || keys.length === 0) {
      return 'Sin paginas autorizadas';
    }

    return keys
      .map((key) => this.pageOptions.find((option) => option.key === key)?.label || key)
      .join(', ');
  }

  getTorreLabels(ids: number[]): string {
    if (!ids || ids.length === 0) {
      return 'Sin torres autorizadas';
    }

    return ids
      .map((id) => {
        const torre = this.torres.find((item) => item.id === id);
        return torre ? `Torre ${torre.numero}` : `Torre ${id}`;
      })
      .join(', ');
  }

  getTorresAutorizadasDetalle(): TorreAutorizadaDetalle[] {
    const torreIds = this.torreIdsControl.value || [];

    return torreIds
      .map((id) => this.torres.find((torre) => torre.id === id))
      .filter((torre): torre is TorreOption => Boolean(torre))
      .map((torre) => ({
        ...torre,
        departamentos: this.departamentos.filter((departamento) => departamento.torreNumero === torre.numero)
      }))
      .sort((a, b) => a.numero - b.numero);
  }

  getDepartamentosAsignados(departamentos: DepartamentoUsuarioItem[]): number {
    return departamentos.filter((departamento) => departamento.usuarioId !== null).length;
  }

  aplicarPermisosPorRol(role: string) {
    if (role === 'admin_general') {
      this.pagePermissionsControl.setValue(this.pageOptions.map((option) => option.key));
      this.torreIdsControl.setValue(this.torres.map((torre) => torre.id));
      return;
    }

    if ((this.pagePermissionsControl.value || []).length === 0) {
      this.pagePermissionsControl.setValue(['home', 'departamentos', 'reservas']);
    }
  }

  getIniciales(nombre: string): string {
    return (nombre || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join('');
  }

  private normalizarUsuarios(respuesta: any): Array<Pick<UsuarioItem, 'id' | 'nombre' | 'email' | 'role' | 'pagePermissions' | 'torreIds'>> {
    const raw = Array.isArray(respuesta) ? respuesta : respuesta?.data;
    const lista = Array.isArray(raw) ? raw : [];

    return lista
      .map((item: any) => ({
        id: Number(item.id),
        nombre: String(item.nombre ?? '').trim(),
        email: String(item.email ?? '').trim(),
        role: String(item.role ?? '').trim(),
        pagePermissions: Array.isArray(item.page_permissions) ? item.page_permissions.map((value: any) => String(value)) : [],
        torreIds: Array.isArray(item.torre_ids)
          ? item.torre_ids.map((value: any) => Number(value)).filter((value: number) => Number.isInteger(value) && value > 0)
          : []
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
        numero: String(item.numero ?? '').trim(),
        usuarioNombre: String(item.usuario_nombre ?? '').trim(),
        usuarioEmail: String(item.usuario_email ?? '').trim(),
        usuarioRole: String(item.usuario_role ?? '').trim()
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
