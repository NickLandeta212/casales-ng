import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DepartamentosService {

  private apiUrl = `${environment.endpoint}/departamentos`;

  constructor(private http: HttpClient) { }

   list(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

}