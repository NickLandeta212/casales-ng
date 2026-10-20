# casales-ng (frontend)

Angular 19 con componentes standalone, rutas lazy y hash routing (`/#/dashboard/...`).

## Memoria compartida (leer antes de trabajar)
@../casales-core/docs/memoria/estado.md
@../casales-core/docs/memoria/decisiones.md
@../casales-core/docs/memoria/dominio.md

## Comandos
- `npm run start:proxy`: `ng serve` con proxy `/api` al backend (`proxy.conf.json`; el puerto debe coincidir con `PORT` del backend).
- `npm run build`: build de produccion. Hay avisos de presupuesto de scss que ya existian.

## Convenciones
- Cada pantalla en `src/app/pages/<nombre>/`, servicios HTTP en `src/app/services/`.
- Acceso: `RoleGuard` + permisos de pagina en `src/app/auth/permisos.ts` (espejo de `casales-core/src/config/permisos.js`).
- Menu lateral en `src/app/layout/sidebar-menu/`.
- Estilos con variables `--sl-*`; paneles y tablas reutilizan `shared/styles/_panel.scss` (`@use '../../shared/styles/panel';`).
- Descargas de PDF con `shared/utils/descargar-archivo.ts`.
- Probar en movil (390 px) sin scroll horizontal.
