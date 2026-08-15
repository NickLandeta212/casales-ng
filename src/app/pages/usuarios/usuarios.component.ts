import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, from } from 'rxjs';
import { concatMap, toArray } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { TorresService } from '../../services/torres.service';
import { UsuarioDraft, UsuariosService } from '../../services/usuarios.service';

interface UsuarioItem {
  id: number;
  username: string;
  nombre: string;
  email: string;
  role: string;
  pagePermissions: string[];
  torreIds: number[];
  torreEtiqueta: string;
  torreNumero: number;
  departamentoNumero: string;
  departamentoTipo: string;
  departamentos: string[];
}

interface DepartamentoUsuarioItem {
  usuarioId: number | null;
  torreId: number;
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

type EditableRole = 'superadmin' | 'admin_general' | 'admin_conjunto' | 'guardia' | 'tesorero' | 'condomino';

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
  creandoUsuario = false;
  creandoUsuariosDepartamentos = false;
  errorMessage = '';
  successMessage = '';
  usuariosDepartamentoResultado = '';

  busquedaControl = new FormControl<string>('');
  filtroTorreControl = new FormControl<string>('todas');
  filtroTipoControl = new FormControl<string>('todos');
  filtroNumeroControl = new FormControl<string>('todos');
  usernameControl = new FormControl<string>('', [Validators.maxLength(30), Validators.pattern(/^[A-Za-z0-9._-]*$/)]);
  nombreControl = new FormControl<string>('', [Validators.required, Validators.maxLength(80)]);
  emailControl = new FormControl<string>('', [Validators.required, Validators.email]);
  passwordControl = new FormControl<string>('', [
    Validators.required,
    Validators.minLength(8),
    Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
  ]);
  torreControl = new FormControl<string>('', Validators.required);
  createRoleControl = new FormControl<EditableRole>('tesorero');
  editUsernameControl = new FormControl<string>('', [Validators.maxLength(30), Validators.pattern(/^[A-Za-z0-9._-]*$/)]);
  editNombreControl = new FormControl<string>('', [Validators.required, Validators.maxLength(80)]);
  editEmailControl = new FormControl<string>('', [Validators.required, Validators.email]);
  editPasswordControl = new FormControl<string>('', [
    Validators.minLength(8),
    Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
  ]);
  editRoleControl = new FormControl<EditableRole>('tesorero');
  pagePermissionsControl = new FormControl<string[]>([]);
  torreIdsControl = new FormControl<number[]>([]);
  pageSizeControl = new FormControl<number>(10);
  paginaActual = 1;
  departamentosPasswordControl = new FormControl<string>('', [
    Validators.required,
    Validators.minLength(8),
    Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
  ]);

  pageOptions: PagePermissionOption[] = [
    { key: 'home', label: 'Inicio', description: 'Resumen general del conjunto.' },
    { key: 'torres', label: 'Torres', description: 'Listado e informacion de torres.' },
    { key: 'pagos_alicuota', label: 'Aprobar pagos', description: 'Aprobacion de alicuotas que pagan las torres.' },
    { key: 'pagos_alicuota_torre', label: 'Link de pago', description: 'Enlace de pago por torre.' },
    { key: 'pagos_torres', label: 'Pagos por torres', description: 'Control de pagos que administra el conjunto.' },
    { key: 'pagos_departamentos', label: 'Pagos departamentos', description: 'Aprobacion de alicuotas por departamento.' },
    { key: 'departamentos', label: 'Departamentos', description: 'Informacion de departamentos autorizados.' },
    { key: 'control_acceso', label: 'Acceso', description: 'Registro de visitantes por guardia.' },
    { key: 'reservas', label: 'Reservas', description: 'Revision de reservas.' },
    { key: 'personas', label: 'Personas', description: 'Listado de residentes.' },
    { key: 'personas_crear', label: 'Crear personas', description: 'Registro de nuevos residentes.' },
    { key: 'multas', label: 'Multas', description: 'Listado de multas.' },
    { key: 'multas_crear', label: 'Crear multas', description: 'Registro de nuevas multas.' },
    { key: 'gastos_comunes', label: 'Finanzas', description: 'Ganancias, gastos y reportes.' },
    { key: 'auditoria', label: 'Auditoria', description: 'Seguimiento de acciones importantes.' },
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
    this.editRoleControl.valueChanges.subscribe((role) => this.aplicarPermisosPorRol(role || 'tesorero'));
    this.busquedaControl.valueChanges.subscribe(() => this.resetPagina());
    this.filtroTorreControl.valueChanges.subscribe(() => this.resetPagina());
    this.filtroTipoControl.valueChanges.subscribe(() => this.resetPagina());
    this.filtroNumeroControl.valueChanges.subscribe(() => this.resetPagina());
    this.pageSizeControl.valueChanges.subscribe(() => this.resetPagina());

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
    if (this.esUsuarioDepartamento(usuario)) {
      this.usuarioSeleccionado = null;
      return;
    }

    this.usuarioSeleccionado = usuario;
    this.editUsernameControl.setValue(usuario.username);
    this.editNombreControl.setValue(usuario.nombre);
    this.editEmailControl.setValue(usuario.email);
    this.editPasswordControl.setValue('');
    this.editRoleControl.setValue(this.normalizarRolAdministrativo(usuario.role), { emitEvent: false });
    this.pagePermissionsControl.setValue([...usuario.pagePermissions]);
    this.torreIdsControl.setValue([...usuario.torreIds]);
  }

  crearUsuario() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.formularioValido()) {
      this.usernameControl.markAsTouched();
      this.nombreControl.markAsTouched();
      this.emailControl.markAsTouched();
      this.passwordControl.markAsTouched();
      this.torreControl.markAsTouched();
      return;
    }

    const payload = {
      username: this.resolverUsernameCreacion(),
      nombre: (this.nombreControl.value || '').trim(),
      email: (this.emailControl.value || '').trim(),
      password: this.passwordControl.value || '',
      role: this.createRoleControl.value || 'tesorero',
      torre_id: Number(this.torreControl.value),
      page_permissions: this.permisosBasePorRol(this.createRoleControl.value || 'tesorero'),
      torre_ids: this.torresAutorizadasParaRol(this.createRoleControl.value || 'tesorero', Number(this.torreControl.value))
    };

    this.creandoUsuario = true;
    this.usuariosService.addUsuario(payload).subscribe({
      next: () => {
        this.creandoUsuario = false;
        this.successMessage = 'Usuario creado y correo de confirmacion enviado.';
        this.limpiarFormulario();
        this.router.navigate(['/dashboard/usuarios']);
      },
      error: (error) => {
        this.creandoUsuario = false;
        this.errorMessage = error?.error?.message || 'No se pudo crear el usuario ni enviar la confirmacion.';
        console.error('Error creando usuario', error);
      }
    });
  }

  limpiarFormulario() {
    this.usernameControl.setValue('');
    this.nombreControl.setValue('');
    this.emailControl.setValue('');
    this.passwordControl.setValue('');
    this.torreControl.setValue('');
    this.createRoleControl.setValue('tesorero');
  }

  crearUsuariosParaDepartamentos() {
    this.errorMessage = '';
    this.successMessage = '';
    this.usuariosDepartamentoResultado = '';

    if (this.departamentosPasswordControl.invalid) {
      this.departamentosPasswordControl.markAsTouched();
      return;
    }

    const confirmado = window.confirm('Se creara un usuario para cada departamento que todavia no tenga usuario. Continuar?');

    if (!confirmado) {
      return;
    }

    this.creandoUsuariosDepartamentos = true;

    forkJoin({
      torres: this.torresService.list(),
      departamentos: this.http.get<any>(`${environment.endpoint}/departamentos`),
      usuarios: this.usuariosService.loadUsers()
    }).subscribe({
      next: ({ torres, departamentos, usuarios }) => {
        this.torres = this.normalizarTorres(torres);
        const departamentosNormalizados = this.normalizarDepartamentos(departamentos);
        const emailsExistentes = new Set((usuarios || []).map((usuario) => String(usuario.email || '').toLowerCase()));
        const usernamesExistentes = new Set((usuarios || []).map((usuario) => this.obtenerUsernameUsuario(usuario).toLowerCase()).filter(Boolean));
        const usuariosNuevos = this.construirUsuariosDepartamentos(departamentosNormalizados)
          .filter((usuario) => !emailsExistentes.has(usuario.email.toLowerCase()) && !usernamesExistentes.has(String(usuario.username || '').toLowerCase()));

        if (usuariosNuevos.length === 0) {
          this.creandoUsuariosDepartamentos = false;
          this.usuariosDepartamentoResultado = departamentosNormalizados.length === 0
            ? 'No se encontraron departamentos validos para generar usuarios.'
            : 'No hay departamentos pendientes. Los usuarios ya existen.';
          return;
        }

        from(usuariosNuevos).pipe(
          concatMap((usuario) => this.usuariosService.createUsuario(usuario)),
          toArray()
        ).subscribe({
          next: () => {
            this.creandoUsuariosDepartamentos = false;
            this.departamentosPasswordControl.setValue('');
            this.successMessage = `Se crearon ${usuariosNuevos.length} usuarios de departamentos.`;
            this.usuariosDepartamentoResultado = `Listo: ${usuariosNuevos.length} usuarios nuevos.`;
            this.vistaActual = 'list';
            this.router.navigate(['/dashboard/usuarios']).then(() => this.cargarUsuarios());
          },
          error: (error) => {
            this.creandoUsuariosDepartamentos = false;
            this.errorMessage = error?.error?.message || 'No se pudieron crear todos los usuarios de departamentos.';
            console.error('Error creando usuarios de departamentos', error);
          }
        });
      },
      error: (error) => {
        this.creandoUsuariosDepartamentos = false;
        this.errorMessage = error?.error?.message || 'No se pudo leer la lista de departamentos.';
        console.error('Error preparando usuarios de departamentos', error);
      }
    });
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
          username: this.obtenerUsernameUsuario(usuario),
          nombre: String(usuario.nombre ?? '').trim(),
          email: String(usuario.email ?? '').trim(),
          role: String(usuario.role ?? '').trim(),
          pagePermissions: Array.isArray(usuario.page_permissions) ? usuario.page_permissions : [],
          torreIds: Array.isArray(usuario.torre_ids) ? usuario.torre_ids.map((id: any) => Number(id)).filter((id: number) => id > 0) : [],
          torreEtiqueta: this.resolverTorreEtiqueta(Number(usuario.id), departamentosNormalizados),
          ...this.resolverDepartamentoPrincipal(Number(usuario.id), departamentosNormalizados),
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
        this.torres = this.normalizarTorres(raw);

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
    const torreId = this.torreControl.value;
    const hasNombre = nombre.length > 0;
    const hasEmail = email.length > 0;
    const hasPassword = this.passwordControl.valid;
    const hasTorre = torreId !== undefined && torreId !== null && String(torreId).trim() !== '';

    return hasNombre && hasEmail && this.usernameControl.valid && this.emailControl.valid && hasPassword && hasTorre;
  }

  guardarAutorizaciones() {
    if (!this.usuarioSeleccionado) {
      return;
    }

    const usuarioActual = this.usuarioSeleccionado;
    const username = (this.editUsernameControl.value || '').trim();
    const nombre = (this.editNombreControl.value || '').trim();
    const email = (this.editEmailControl.value || '').trim();
    const password = this.editPasswordControl.value || '';

    if (!nombre || !email || this.editUsernameControl.invalid || this.editEmailControl.invalid || this.editPasswordControl.invalid) {
      this.editUsernameControl.markAsTouched();
      this.editEmailControl.markAsTouched();
      this.editPasswordControl.markAsTouched();
      return;
    }

    const payload = {
      username,
      nombre,
      email,
      role: this.editRoleControl.value || 'tesorero',
      page_permissions: this.pagePermissionsControl.value || [],
      torre_ids: this.torreIdsControl.value || [],
      ...(password ? { password } : {})
    };

    this.usuariosService.updateUsuario(usuarioActual.id, payload).subscribe({
      next: (usuarios) => {
        const actualizado = usuarios.find((usuario) => Number(usuario.id) === usuarioActual.id);
        if (actualizado) {
          this.usuarioSeleccionado = {
            ...usuarioActual,
            username: this.obtenerUsernameUsuario(actualizado),
            nombre: actualizado.nombre,
            email: actualizado.email,
            role: actualizado.role,
            pagePermissions: actualizado.page_permissions,
            torreIds: actualizado.torre_ids
          };
          this.listaUsuarios = this.listaUsuarios.map((usuario) =>
            usuario.id === usuarioActual.id
              ? {
                  ...usuario,
                  username: this.obtenerUsernameUsuario(actualizado),
                  nombre: actualizado.nombre,
                  email: actualizado.email,
                  role: actualizado.role,
                  pagePermissions: actualizado.page_permissions,
                  torreIds: actualizado.torre_ids
                }
              : usuario
          );
          this.editPasswordControl.setValue('');
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
          username: this.obtenerUsernameUsuario(usuario),
          nombre: String(usuario.nombre ?? '').trim(),
          email: String(usuario.email ?? '').trim(),
          role: String(usuario.role ?? '').trim(),
          pagePermissions: Array.isArray(usuario.page_permissions) ? usuario.page_permissions : [],
          torreIds: Array.isArray(usuario.torre_ids) ? usuario.torre_ids.map((id: any) => Number(id)).filter((id: number) => id > 0) : [],
          torreEtiqueta: this.resolverTorreEtiqueta(Number(usuario.id), this.departamentos),
          ...this.resolverDepartamentoPrincipal(Number(usuario.id), this.departamentos),
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
    const related = this.getRelatedPermissions(permission);
    const shouldRemove = current.includes(permission);
    const next = shouldRemove
      ? current.filter((item) => !related.includes(item))
      : Array.from(new Set([...current, ...related]));

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

  getCorreoVisible(usuario: UsuarioItem): string {
    return this.esCorreoTecnicoDepartamento(usuario.email) ? 'Pendiente' : usuario.email;
  }

  esUsuarioDepartamento(usuario: UsuarioItem): boolean {
    return usuario.role === 'condomino' && /^T\d+D[A-Z0-9]+$/i.test(usuario.username);
  }

  get usuariosFiltrados(): UsuarioItem[] {
    const termino = (this.busquedaControl.value || '').trim().toLowerCase();
    const torre = this.filtroTorreControl.value || 'todas';
    const tipo = this.filtroTipoControl.value || 'todos';
    const numero = this.filtroNumeroControl.value || 'todos';

    return this.listaUsuarios.filter((usuario) => {
      const matchesText = !termino ||
        usuario.nombre.toLowerCase().includes(termino) ||
        usuario.username.toLowerCase().includes(termino) ||
        usuario.email.toLowerCase().includes(termino) ||
        usuario.role.toLowerCase().includes(termino) ||
        usuario.torreEtiqueta.toLowerCase().includes(termino) ||
        usuario.departamentos.some((departamento) => departamento.toLowerCase().includes(termino));
      const matchesTorre = torre === 'todas' || usuario.torreNumero === Number(torre);
      const matchesTipo = tipo === 'todos' || usuario.departamentoTipo === tipo;
      const matchesNumero = numero === 'todos' || usuario.departamentoNumero === numero;

      return matchesText && matchesTorre && matchesTipo && matchesNumero;
    });
  }

  get usuariosPaginados(): UsuarioItem[] {
    const size = this.pageSizeControl.value || 10;
    const start = (this.paginaActual - 1) * size;

    return this.usuariosFiltrados.slice(start, start + size);
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.usuariosFiltrados.length / (this.pageSizeControl.value || 10)));
  }

  get paginasVisibles(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, index) => index + 1).slice(0, 5);
  }

  get rangoInicio(): number {
    return this.usuariosFiltrados.length === 0 ? 0 : (this.paginaActual - 1) * (this.pageSizeControl.value || 10) + 1;
  }

  get rangoFin(): number {
    return Math.min(this.usuariosFiltrados.length, this.paginaActual * (this.pageSizeControl.value || 10));
  }

  get torresFiltro(): number[] {
    return Array.from(new Set(this.listaUsuarios.map((usuario) => usuario.torreNumero).filter((numero) => numero > 0))).sort((a, b) => a - b);
  }

  get tiposFiltro(): string[] {
    return Array.from(new Set(this.listaUsuarios.map((usuario) => usuario.departamentoTipo).filter(Boolean))).sort();
  }

  get numerosFiltro(): string[] {
    return Array.from(new Set(this.listaUsuarios.map((usuario) => usuario.departamentoNumero).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  limpiarFiltros() {
    this.busquedaControl.setValue('');
    this.filtroTorreControl.setValue('todas');
    this.filtroTipoControl.setValue('todos');
    this.filtroNumeroControl.setValue('todos');
    this.resetPagina();
  }

  cambiarPagina(pagina: number) {
    this.paginaActual = Math.min(Math.max(pagina, 1), this.totalPaginas);
  }

  aplicarPermisosPorRol(role: string) {
    if (role === 'superadmin' || role === 'admin_general') {
      this.pagePermissionsControl.setValue(this.pageOptions.map((option) => option.key));
      this.torreIdsControl.setValue(this.torres.map((torre) => torre.id));
      return;
    }

    if (role === 'admin_conjunto') {
      this.pagePermissionsControl.setValue(['home', 'torres', 'pagos_alicuota', 'pagos_torres', 'departamentos', 'control_acceso', 'reservas', 'personas', 'multas', 'usuarios', 'usuarios_crear', 'gastos_comunes', 'auditoria']);
      this.torreIdsControl.setValue(this.torres.map((torre) => torre.id));
      return;
    }

    if (role === 'guardia') {
      this.pagePermissionsControl.setValue(['home', 'control_acceso']);
      this.torreIdsControl.setValue(this.torres.map((torre) => torre.id));
      return;
    }

    if (role === 'condomino') {
      this.pagePermissionsControl.setValue(['home', 'reservas', 'pagos_alicuota']);
      this.torreIdsControl.setValue([]);
      return;
    }

    if ((this.pagePermissionsControl.value || []).length === 0) {
      this.pagePermissionsControl.setValue(['home', 'torres', 'pagos_departamentos', 'departamentos', 'reservas', 'gastos_comunes']);
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

  private normalizarUsuarios(respuesta: any): Array<Pick<UsuarioItem, 'id' | 'username' | 'nombre' | 'email' | 'role' | 'pagePermissions' | 'torreIds'>> {
    const raw = Array.isArray(respuesta) ? respuesta : respuesta?.data;
    const lista = Array.isArray(raw) ? raw : [];

    return lista
      .map((item: any) => ({
        id: Number(item.id),
        username: this.obtenerUsernameUsuario(item),
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

  private normalizarTorres(respuesta: any): TorreOption[] {
    const raw = Array.isArray(respuesta) ? respuesta : respuesta?.data;
    const lista = Array.isArray(raw) ? raw : [];

    return lista
      .map((item: any) => ({
        id: Number(item.id),
        numero: Number(item.numero)
      }))
      .filter((item: TorreOption) => item.id > 0 && item.numero > 0)
      .sort((a: TorreOption, b: TorreOption) => a.numero - b.numero);
  }

  private normalizarRolAdministrativo(role: string): EditableRole {
    if (role === 'superadmin' || role === 'admin_general' || role === 'admin_conjunto' || role === 'guardia' || role === 'tesorero' || role === 'condomino') {
      return role;
    }

    return 'tesorero';
  }

  private getRelatedPermissions(permission: string): string[] {
    const role = this.editRoleControl.value || 'tesorero';
    const groups: Record<string, string[]> = {
      torres: role === 'superadmin' || role === 'admin_general'
        ? ['torres', 'pagos_alicuota', 'pagos_alicuota_torre', 'pagos_torres', 'pagos_departamentos']
        : role === 'admin_conjunto'
        ? ['torres', 'pagos_alicuota']
        : ['torres', 'pagos_departamentos'],
      departamentos: role === 'admin_conjunto'
        ? ['departamentos']
        : ['departamentos', 'pagos_departamentos'],
      personas: ['personas', 'personas_crear'],
      multas: ['multas', 'multas_crear'],
      usuarios: ['usuarios', 'usuarios_crear'],
      gastos_comunes: ['gastos_comunes'],
      control_acceso: ['control_acceso'],
      auditoria: ['auditoria']
    };

    return groups[permission] || [permission];
  }

  private normalizarDepartamentos(respuesta: any): DepartamentoUsuarioItem[] {
    const raw = Array.isArray(respuesta) ? respuesta : respuesta?.data;
    const lista = Array.isArray(raw) ? raw : [];

    return lista
      .map((item: any) => ({
        usuarioId: item.usuario_id !== undefined && item.usuario_id !== null ? Number(item.usuario_id) : null,
        torreId: Number(item.torre_id ?? item.torreId ?? 0),
        torreNumero: this.resolverNumeroTorreDepartamento(item),
        numero: String(item.numero ?? '').trim(),
        usuarioNombre: String(item.usuario_nombre ?? '').trim(),
        usuarioEmail: String(item.usuario_email ?? '').trim(),
        usuarioRole: String(item.usuario_role ?? '').trim()
      }))
      .filter((item) => Number.isFinite(item.torreNumero) && item.torreNumero > 0 && item.numero.length > 0);
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

  private resolverDepartamentoPrincipal(usuarioId: number, departamentos: DepartamentoUsuarioItem[]): Pick<UsuarioItem, 'torreNumero' | 'departamentoNumero' | 'departamentoTipo'> {
    const departamento = departamentos.find((item) => item.usuarioId === usuarioId);

    if (!departamento) {
      return {
        torreNumero: 0,
        departamentoNumero: '',
        departamentoTipo: 'GENERAL'
      };
    }

    return {
      torreNumero: departamento.torreNumero,
      departamentoNumero: departamento.numero,
      departamentoTipo: this.resolverTipoDepartamento(departamento.numero)
    };
  }

  private resolverTipoDepartamento(numero: string): string {
    const normalized = String(numero || '').trim().toUpperCase();

    if (normalized.startsWith('SS')) {
      return 'SS';
    }

    if (/^0/.test(normalized)) {
      return 'PB';
    }

    return 'SUB';
  }

  private permisosBasePorRol(role: EditableRole): string[] {
    const permisos: Record<EditableRole, string[]> = {
      superadmin: this.pageOptions.map((option) => option.key),
      admin_general: this.pageOptions.map((option) => option.key),
      admin_conjunto: ['home', 'torres', 'pagos_alicuota', 'pagos_alicuota_torre', 'pagos_torres', 'departamentos', 'control_acceso', 'reservas', 'personas', 'personas_crear', 'multas', 'multas_crear', 'usuarios', 'usuarios_crear', 'gastos_comunes', 'auditoria'],
      guardia: ['home', 'control_acceso'],
      tesorero: ['home', 'torres', 'pagos_departamentos', 'departamentos', 'reservas', 'personas', 'multas', 'gastos_comunes'],
      condomino: ['home', 'reservas', 'pagos_alicuota']
    };

    return permisos[role];
  }

  private torresAutorizadasParaRol(role: EditableRole, torreBase: number): number[] {
    if (role === 'superadmin' || role === 'admin_general' || role === 'admin_conjunto' || role === 'guardia') {
      return this.torres.map((torre) => torre.id);
    }

    return torreBase > 0 ? [torreBase] : [];
  }

  private construirUsuariosDepartamentos(departamentos: DepartamentoUsuarioItem[]): UsuarioDraft[] {
    const password = this.departamentosPasswordControl.value || '';
    const permisosDepartamento = this.permisosBasePorRol('condomino');
    const departamentosUnicos = new Map<string, DepartamentoUsuarioItem>();

    departamentos.forEach((departamento) => {
      const key = `${departamento.torreNumero}-${departamento.numero}`;
      if (!departamentosUnicos.has(key)) {
        departamentosUnicos.set(key, departamento);
      }
    });

    return Array.from(departamentosUnicos.values())
      .map((departamento) => {
        const torre = this.torres.find((item) => item.numero === departamento.torreNumero || item.id === departamento.torreId);
        const torreId = torre?.id || 0;

        return {
          nombre: `Torre ${departamento.torreNumero} Departamento ${departamento.numero}`,
          username: this.generarCodigoDepartamento(departamento.torreNumero, departamento.numero),
          email: this.generarCorreoTecnicoDepartamento(departamento.torreNumero, departamento.numero),
          password,
          role: 'condomino',
          torre_id: torreId,
          page_permissions: permisosDepartamento,
          torre_ids: torreId > 0 ? [torreId] : []
        };
      })
      .filter((usuario) => usuario.torre_id > 0);
  }

  private resolverNumeroTorreDepartamento(item: any): number {
    const directo = Number(item?.torre_numero ?? item?.torreNumero ?? item?.torre ?? 0);

    if (Number.isFinite(directo) && directo > 0) {
      return directo;
    }

    const torreId = Number(item?.torre_id ?? item?.torreId ?? 0);
    const torre = this.torres.find((opcion) => opcion.id === torreId);

    if (torre) {
      return torre.numero;
    }

    const texto = String(item?.torre_nombre ?? item?.torreNombre ?? item?.nombre_torre ?? item?.nombreTorre ?? '').trim();
    const match = texto.match(/\d+/);

    return match ? Number(match[0]) : 0;
  }

  private generarCodigoDepartamento(torreNumero: number, departamentoNumero: string): string {
    const departamento = String(departamentoNumero || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    return `T${torreNumero}D${departamento}`;
  }

  private generarCorreoTecnicoDepartamento(torreNumero: number, departamentoNumero: string): string {
    const departamento = String(departamentoNumero || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    return `t${torreNumero}d${departamento}@casales.app`;
  }

  private obtenerUsernameUsuario(usuario: any): string {
    const username = String(usuario?.username ?? usuario?.usuario ?? '').trim();

    if (username) {
      return username;
    }

    const email = String(usuario?.email ?? '').trim().toLowerCase();
    const match = email.match(/^t(\d+)d([a-z0-9]+)@casales\.app$/);

    if (match) {
      return `T${match[1]}D${match[2].toUpperCase()}`;
    }

    return email.includes('@') ? email.split('@')[0] : email;
  }

  private esCorreoTecnicoDepartamento(email: string): boolean {
    return /^t\d+d[a-z0-9]+@casales\.app$/i.test(String(email || '').trim());
  }

  private resolverUsernameCreacion(): string {
    const username = (this.usernameControl.value || '').trim();

    if (username) {
      return username;
    }

    return (this.emailControl.value || '').trim().split('@')[0] || '';
  }

  private resetPagina() {
    this.paginaActual = 1;
  }

}
