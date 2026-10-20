// Catalogo unico de roles y permisos de pagina del frontend.
// Es copia de casales-core/src/config/permisos.js: si cambias algo aqui, actualiza tambien el backend.

export type Rol = 'admin_general' | 'admin_conjunto' | 'tesorero' | 'guardia' | 'condomino';

export const ROLES: Rol[] = ['admin_general', 'admin_conjunto', 'tesorero', 'guardia', 'condomino'];

export const ROL_LABELS: Record<Rol, string> = {
  admin_general: 'Admin general',
  admin_conjunto: 'Admin conjunto',
  tesorero: 'Tesorero',
  guardia: 'Guardia',
  condomino: 'Departamento'
};

export interface PaginaPermiso {
  key: string;
  label: string;
  description: string;
}

export const PAGINAS: PaginaPermiso[] = [
  { key: 'home', label: 'Inicio', description: 'Resumen general del conjunto.' },
  { key: 'torres', label: 'Torres', description: 'Listado e informacion de torres.' },
  { key: 'pagos_alicuota', label: 'Aprobar pagos', description: 'Aprobacion de alicuotas que pagan las torres.' },
  { key: 'pagos_alicuota_torre', label: 'Link de pago', description: 'Enlace de pago por torre.' },
  { key: 'pagos_torres', label: 'Pagos por torres', description: 'Control de pagos que administra el conjunto.' },
  { key: 'pagos_departamentos', label: 'Pagos departamentos', description: 'Pagos, estado de cuenta y morosidad de los departamentos.' },
  { key: 'departamentos', label: 'Departamentos', description: 'Informacion de departamentos autorizados.' },
  { key: 'control_acceso', label: 'Acceso', description: 'Registro de visitantes por guardia.' },
  { key: 'reservas', label: 'Reservas', description: 'Revision de reservas.' },
  { key: 'personas', label: 'Personas', description: 'Listado de residentes.' },
  { key: 'personas_crear', label: 'Crear personas', description: 'Registro de nuevos residentes.' },
  { key: 'multas', label: 'Multas', description: 'Listado de multas.' },
  { key: 'multas_crear', label: 'Crear multas', description: 'Registro de nuevas multas.' },
  { key: 'gastos_comunes', label: 'Finanzas', description: 'Ganancias, gastos y reportes.' },
  { key: 'valores_alicuota', label: 'Valor de alicuotas', description: 'Valor mensual por anio y torre.' },
  { key: 'cargos', label: 'Cargos del mes', description: 'Cargos extraordinarios a los departamentos.' },
  { key: 'auditoria', label: 'Auditoria', description: 'Seguimiento de acciones importantes.' },
  { key: 'usuarios', label: 'Usuarios', description: 'Listado e inspeccion de usuarios.' },
  { key: 'usuarios_crear', label: 'Crear usuarios', description: 'Alta de usuarios y permisos.' }
];

export const PAGINA_KEYS = PAGINAS.map((pagina) => pagina.key);

// Permisos que cada rol tiene por defecto (ademas de los asignados en page_permissions).
export const PERMISOS_POR_ROL: Record<Rol, string[]> = {
  admin_general: PAGINA_KEYS,
  admin_conjunto: [
    'home', 'torres', 'pagos_alicuota', 'pagos_alicuota_torre', 'pagos_torres', 'pagos_departamentos', 'departamentos', 'control_acceso',
    'reservas', 'personas', 'personas_crear', 'multas', 'multas_crear', 'usuarios', 'usuarios_crear',
    'gastos_comunes', 'valores_alicuota', 'cargos', 'auditoria'
  ],
  tesorero: [
    'home', 'torres', 'pagos_alicuota_torre', 'pagos_departamentos', 'departamentos', 'reservas', 'personas', 'multas',
    'gastos_comunes', 'cargos', 'valores_alicuota'
  ],
  guardia: ['home', 'control_acceso'],
  condomino: ['home', 'reservas', 'pagos_alicuota']
};

// Grupos de roles usados en rutas y menu.
export const ADMINS: Rol[] = ['admin_general', 'admin_conjunto'];
export const GESTION: Rol[] = ['admin_general', 'admin_conjunto', 'tesorero'];
export const SEGURIDAD: Rol[] = ['admin_general', 'admin_conjunto', 'guardia'];
export const TODOS: Rol[] = ROLES;
