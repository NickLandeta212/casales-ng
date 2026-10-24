// Lectura de archivos elegidos por el usuario para enviarlos a la API como data URL (base64).

export const MAX_ARCHIVO_BYTES = 4 * 1024 * 1024;
export const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/webp'];
export const TIPOS_IMAGEN_O_PDF = [...TIPOS_IMAGEN, 'application/pdf'];

// Valida tipo y tamano y devuelve el contenido como data URL. Rechaza con un mensaje listo para mostrar.
export function leerArchivo(file: File, tipos: string[] = TIPOS_IMAGEN_O_PDF): Promise<string> {
  if (!tipos.includes(file.type)) {
    const nombres = tipos.map((tipo) => tipo.split('/')[1].replace('jpeg', 'jpg').toUpperCase()).join(', ');
    return Promise.reject(`El archivo debe ser ${nombres}.`);
  }

  if (file.size > MAX_ARCHIVO_BYTES) {
    return Promise.reject('El archivo supera el máximo de 4MB.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject('No se pudo leer el archivo.');
    reader.readAsDataURL(file);
  });
}

// Reduce una foto (p. ej. del celular) a un JPG de lado maximo `maxLado`, para que varias quepan en un envio.
export function comprimirImagen(file: File, maxLado = 1280, calidad = 0.8): Promise<string> {
  if (!file.type.startsWith('image/')) {
    return Promise.reject('Solo se pueden adjuntar fotos.');
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', calidad));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject('No se pudo leer la foto.');
    };
    img.src = url;
  });
}
