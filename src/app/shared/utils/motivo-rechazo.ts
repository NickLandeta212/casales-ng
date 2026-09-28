// Pide al usuario el motivo de un rechazo. Devuelve null si cancela o el texto es muy corto.
export function pedirMotivoRechazo(descripcion: string): string | null {
  const motivo = window.prompt(`Motivo del rechazo de ${descripcion} (se informara al residente):`);

  if (motivo === null) {
    return null;
  }

  const limpio = motivo.trim();

  if (limpio.length < 5) {
    window.alert('El motivo debe tener al menos 5 caracteres.');
    return null;
  }

  return limpio.slice(0, 500);
}
