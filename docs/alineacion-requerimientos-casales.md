# Alineacion de requerimientos - Casales San Pedro

Este documento fija la guia de trabajo para mantener la aplicacion alineada con el
avance de requerimientos del proyecto HabitatOS / Gestion automatizada de Casales
San Pedro, sin cambiar los flujos ya establecidos salvo que se solicite
explicitamente.

## Objetivo del sistema

Reducir en mas de 60% las tareas manuales de la administracion mediante una
plataforma web que centralice informacion, reservas, pagos, multas y reportes.

La prioridad practica de desarrollo queda asi:

1. Multas e infracciones.
2. Reservas de areas comunes.
3. Pagos de alicuotas.
4. Gestion de condominos/residentes.
5. Reportes y control.

## Modulos requeridos

### Gestion de condominos / residentes

Debe permitir:

- Registrar residentes con datos personales, torre y departamento.
- Consultar por torre, departamento, nombre o cedula.
- Modificar telefono, correo y estado de residencia.
- Dar de baja registros que ya no pertenecen al conjunto.
- Evitar duplicados en cedula, identificadores y asignaciones sensibles.

KPI guia: mas del 90% de registros actualizados.

### Reservas de areas comunes

Debe permitir:

- Crear reservas por fecha, hora y area comun.
- Ver calendario de disponibilidad y reservas activas.
- Modificar reservas existentes.
- Cancelar reservas.
- Evitar conflictos de horario antes de confirmar.

KPI guia: completar una reserva en menos de 3 minutos y en 4 pasos o menos.

### Pagos de alicuotas

Debe permitir:

- Registrar pagos por metodos definidos por la administracion.
- Consultar historial de pagos por condominio/departamento.
- Corregir errores de registro con control administrativo.
- Anular pagos mal registrados solo con validacion administrativa.
- Mantener comprobantes digitales y estado de revision claro.

KPI guia: reducir la verificacion de pagos a menos de 1 hora.

### Multas e infracciones

Debe permitir:

- Registrar multas por ruido, uso indebido de areas, danos u otros motivos.
- Consultar multas por condominio o tipo de infraccion.
- Modificar valores o estados.
- Eliminar o anular solo por error o apelacion aceptada.
- Mostrar trazabilidad suficiente para mejorar transparencia.

KPI guia: mas del 90% de multas registradas correctamente.

### Reportes y control

Debe permitir:

- Generar reportes de pagos, multas, reservas y datos administrativos.
- Mostrar graficos o paneles intuitivos para toma de decisiones.
- Actualizar datos en tiempo real o bajo demanda.
- Evitar reportes duplicados u obsoletos.

KPI guia: mas del 80% de reportes generados automaticamente.

## Reglas no funcionales

Estas reglas deben guiar cualquier cambio futuro:

- Cada operacion debe responder idealmente en menos de 3 segundos.
- Disponibilidad mensual esperada: al menos 95%.
- Recuperacion frente a fallas criticas: maximo 2 horas, idealmente menos de
  30 minutos.
- La aplicacion debe funcionar correctamente en celular, tablet y escritorio.
- Una tarea comun debe completarse en 4 pasos promedio o menos.
- El sistema debe soportar al menos 300 usuarios simultaneos sin degradacion
  perceptible.
- Deben existir respaldos al menos cada 24 horas en el entorno de despliegue.

## Seguridad y privacidad

La privacidad es un requisito no negociable. El 94.6% de encuestados espera que
solo el residente y la administracion puedan ver datos personales.

Cualquier implementacion debe respetar:

- Autenticacion mediante API REST y token JWT.
- Control de acceso basado en roles.
- Permisos estrictamente limitados por modulo y accion.
- Validacion de datos en frontend y backend.
- Sanitizacion de texto visible y errores recibidos desde API.
- No enviar tokens a dominios externos.
- No exponer datos personales de otros residentes.
- Encriptacion de datos sensibles en backend/base de datos segun arquitectura
  final del proyecto.

## Criterios de aceptacion antes de cambiar una pantalla

Antes de agregar o modificar una funcionalidad, verificar:

- El cambio pertenece a uno de los modulos requeridos.
- No rompe permisos, roles ni privacidad.
- Mantiene o reduce la cantidad de pasos del flujo.
- Conserva una interfaz responsive.
- Usa la paleta visual del proyecto y los estilos existentes.
- Evita duplicados o estados inconsistentes.
- Tiene mensajes claros para exito, error y carga.
- No introduce dependencias innecesarias.

## Alineacion con la app actual

La app actual ya refleja varios bloques del documento:

- Condominios/residentes: `departamentos`, `personas`, `usuarios`.
- Reservas: `reservas` y formulario publico `reserva`.
- Pagos: pagos de alicuotas por torre/departamento y comprobantes.
- Multas: listado, creacion y pago de multas.
- Control: panel `home` con resumen y actividad.
- Seguridad: guardias, roles, permisos y sesion con token.

Cuando haya que priorizar mejoras, usar el orden de la encuesta: multas,
reservas, pagos, residentes y reportes.

