// Descarga un Blob recibido de la API con el nombre indicado.
export function descargarArchivo(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombre;
  link.click();
  URL.revokeObjectURL(url);
}

// Los errores de una peticion con responseType 'blob' llegan como Blob: extrae el mensaje JSON.
export async function mensajeDeErrorBlob(error: any, porDefecto: string): Promise<string> {
  const cuerpo = error?.error;

  if (cuerpo instanceof Blob) {
    try {
      return JSON.parse(await cuerpo.text())?.message || porDefecto;
    } catch {
      return porDefecto;
    }
  }

  return cuerpo?.message || porDefecto;
}
