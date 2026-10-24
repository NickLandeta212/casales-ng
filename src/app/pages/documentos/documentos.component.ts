import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { ADMINS } from '../../auth/permisos';
import { CategoriaDocumento, Documento, DocumentosService } from '../../services/documentos.service';
import { ComprobantesService } from '../../services/comprobantes.service';
import { leerArchivo } from '../../shared/utils/leer-archivo';

const CATEGORIAS: Record<CategoriaDocumento, { label: string; icono: string }> = {
  reglamento: { label: 'Reglamentos', icono: 'bi-journal-text' },
  acta: { label: 'Actas', icono: 'bi-file-earmark-check' },
  contrato: { label: 'Contratos', icono: 'bi-file-earmark-medical' },
  otro: { label: 'Otros', icono: 'bi-file-earmark' }
};

// Archivo de documentos del conjunto. La administracion los sube; cada usuario ve los que le corresponden
// (los marcados "Solo administración y tesorería" no los ven los residentes ni la guardia).
@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './documentos.component.html',
  styleUrl: './documentos.component.scss'
})
export class DocumentosComponent implements OnInit {
  private readonly documentosService = inject(DocumentosService);
  private readonly comprobantesService = inject(ComprobantesService);
  private readonly authService = inject(AuthService);

  readonly esAdmin = this.authService.hasRole(ADMINS);
  readonly categorias = CATEGORIAS;
  readonly categoriaKeys = Object.keys(CATEGORIAS) as CategoriaDocumento[];
  lista: Documento[] = [];
  busqueda = '';
  cargando = false;
  guardando = false;
  errorMessage = '';
  successMessage = '';

  mostrarFormulario = false;
  nuevo = this.formularioVacio();

  ngOnInit(): void {
    this.cargar();
  }

  private formularioVacio() {
    return { titulo: '', categoria: 'reglamento' as CategoriaDocumento, descripcion: '', visibilidad: 'todos', archivo: null as string | null };
  }

  porCategoria(categoria: CategoriaDocumento): Documento[] {
    const texto = this.busqueda.trim().toLowerCase();
    return this.lista.filter((d) => d.categoria === categoria
      && (!texto || d.titulo.toLowerCase().includes(texto) || (d.descripcion || '').toLowerCase().includes(texto)));
  }

  get hayResultados(): boolean {
    return this.categoriaKeys.some((c) => this.porCategoria(c).length > 0);
  }

  esPdf(documento: Documento): boolean {
    return documento.archivo_url.endsWith('.pdf');
  }

  cargar(): void {
    this.cargando = true;
    this.documentosService.listar().subscribe({
      next: (documentos) => {
        this.lista = documentos;
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.errorMessage = error?.error?.message || 'No se pudieron cargar los documentos.';
      }
    });
  }

  async elegirArchivo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      this.nuevo.archivo = await leerArchivo(file);

      if (!this.nuevo.titulo.trim()) {
        this.nuevo.titulo = file.name.replace(/\.[^.]+$/, '').slice(0, 150);
      }
    } catch (mensaje) {
      input.value = '';
      this.nuevo.archivo = null;
      this.errorMessage = String(mensaje);
    }
  }

  subir(): void {
    if (!this.nuevo.archivo || !this.nuevo.titulo.trim() || this.guardando) {
      return;
    }

    this.guardando = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.documentosService.subir({
      titulo: this.nuevo.titulo.trim(),
      categoria: this.nuevo.categoria,
      descripcion: this.nuevo.descripcion.trim() || null,
      visibilidad: this.nuevo.visibilidad,
      archivo_base64: this.nuevo.archivo
    }).subscribe({
      next: (documento) => {
        this.guardando = false;
        this.successMessage = `"${documento.titulo}" se subió al archivo.`;
        this.nuevo = this.formularioVacio();
        this.mostrarFormulario = false;
        this.cargar();
      },
      error: (error) => {
        this.guardando = false;
        this.errorMessage = error?.error?.message || 'No se pudo subir el documento.';
      }
    });
  }

  abrir(event: Event, documento: Documento): void {
    this.comprobantesService.abrirEnlace(this.documentosService.enlace(documento.id), event);
  }

  eliminar(documento: Documento): void {
    if (!window.confirm(`Eliminar "${documento.titulo}"? El archivo se borrará y no se puede recuperar.`)) {
      return;
    }

    this.documentosService.eliminar(documento.id).subscribe({
      next: () => {
        this.successMessage = 'Documento eliminado.';
        this.cargar();
      },
      error: (error) => (this.errorMessage = error?.error?.message || 'No se pudo eliminar el documento.')
    });
  }
}
