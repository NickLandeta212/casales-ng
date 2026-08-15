# Mejoras aplicadas a Casales

## Arquitectura detectada

- Frontend Angular 19 con componentes standalone y rutas lazy.
- Layout autenticado con navbar, sidebar y dashboard.
- Servicios HTTP existentes para torres, departamentos, personas, usuarios, reservas, multas y alícuotas.
- Autenticación con token, interceptor HTTP y guards de rol/permisos.
- Variables visuales globales en `src/styles.scss`.

## Cambios aplicados

- Se reforzaron roles: `superadmin`, `admin_general`, `admin_conjunto`, `tesorero`, `guardia`, `residente`, `propietario` y `proveedor`.
- Se añadieron permisos por defecto por rol para que el menú muestre opciones útiles aunque el backend todavía no envíe todos los permisos nuevos.
- Se creó un componente reutilizable de gestión con formulario, validación, búsqueda, tabla, edición y eliminación.
- Se agregaron módulos reales con almacenamiento local mientras se conectan endpoints backend.
- Se retiró la pantalla de guía/catálogo y se eliminaron referencias visuales a funciones no implementadas como IA, marketplace, marca blanca y multi-conjunto.
- Se retiró el apartado separado de conjuntos.
- Se retiró el apartado de operación.
- Vehículo y parqueadero dejaron de ser módulos separados y ahora se asignan directamente a cada persona dentro del detalle del departamento.
- Finanzas ahora está separado por rol: conjunto solo para administradores y torres solo para tesorero.
- Finanzas integra pagos de alícuotas aprobados como ganancias automáticas cuando el API responde.
- Acceso muestra residentes sugeridos por torre/departamento y audita autorizaciones, rechazos e ingresos/salidas.
- Se agregó una pantalla de Auditoría para administradores.
- Inicio muestra alertas operativas: visitantes dentro, reservas de hoy, multas recientes y saldo financiero manual.
- Se mantuvieron los módulos existentes: torres, departamentos, personas, usuarios, reservas, multas y pagos.
- Se ajustó el dashboard para hablar de herramientas activas y módulos reales de operación/finanzas.

## Módulos agregados

- Visitantes.
- Control de acceso por guardia: torre, departamento, llamada al dueño/residente, autorización, ingreso y salida.
- Dashboard financiero para administradores de torre y administrador general.
- Asignación de vehículo y parqueadero por persona dentro de departamentos.
- Auditoría local de acciones sensibles.
- Alertas operativas en inicio.

## Pendiente recomendado

- Crear tablas/modelos backend para acceso, finanzas manuales, auditoría y movilidad de personas.
- Reemplazar almacenamiento local por servicios HTTP cuando existan endpoints.
- Implementar reportes financieros reales de ingresos, egresos y morosidad.
- Implementar exportación PDF/Excel para reportes.
- Conectar recordatorios a correo o WhatsApp desde backend.
- Agregar pruebas unitarias para permisos, guards y el componente reutilizable de gestión.

## Ejecución

```bash
npm install
npm start
```

Build de producción:

```bash
npm run build
```

Verificación realizada: `npm run build` compila correctamente. Angular mantiene warnings de presupuesto de bundle/SCSS, pero no errores de compilación.
