// En produccion el frontend y la API se sirven desde el mismo dominio (la API en /api/v1).
// Si la API vive en otro dominio, reemplaza por la URL completa, ej. 'https://api.tudominio.com/api/v1'.
export const environment = {
  production: true,
  endpoint: '/api/v1',
};
