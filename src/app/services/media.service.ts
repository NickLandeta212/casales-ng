import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private apiUrl = `${environment.endpoint}/upload-images`;

  constructor(private http: HttpClient) { }

  // Subir una sola imagen
  uploadImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post(this.apiUrl, formData);
  }

  // Subir varias imágenes
  uploadImages(files: File[]): Observable<any[]> {
    const requests = files.map(file => this.uploadImage(file));
    return forkJoin(requests); // Ejecuta en paralelo y espera todas las respuestas
  }

  uploadMultipleImages(formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData);
  }

}