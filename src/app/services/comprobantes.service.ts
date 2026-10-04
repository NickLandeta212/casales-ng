import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ComprobantesService {
  private readonly apiUrl = `${environment.endpoint}/comprobantes`;

  constructor(private http: HttpClient) {}

  // Nombre del archivo a partir del valor que guarda la API (/uploads/comprobantes/<archivo>), o '' si no es valido.
  getArchivo(rawUrl: string | null | undefined): string {
    const archivo = String(rawUrl || '').trim().split('/').pop() || '';

    return /^[a-z0-9-]+\.(png|jpg|webp)$/.test(archivo) ? archivo : '';
  }

  // Los comprobantes son privados: la API valida la sesion y devuelve un enlace temporal a la imagen.
  abrir(event: Event, rawUrl: string | null | undefined): void {
    event.preventDefault();

    const archivo = this.getArchivo(rawUrl);

    if (!archivo) {
      window.alert('Este pago no tiene un comprobante valido.');
      return;
    }

    // La pestana se abre en el mismo clic; si se abre al llegar la respuesta, el navegador la bloquea.
    const tab = window.open('', '_blank');

    if (!tab) {
      window.alert('Permite las ventanas emergentes de este sitio para ver el comprobante.');
      return;
    }

    tab.opener = null;

    this.http.get<{ url: string }>(`${this.apiUrl}/${archivo}/enlace`).subscribe({
      next: ({ url }) => {
        if (/^https:\/\//i.test(String(url))) {
          tab.location.replace(url);
        } else {
          tab.close();
          window.alert('No se pudo abrir el comprobante.');
        }
      },
      error: (error) => {
        tab.close();
        window.alert(error?.error?.message || 'No se pudo abrir el comprobante.');
      }
    });
  }
}
