import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TorresService {

  private apiUrl = `${environment.endpoint}/torres`;


  constructor(private http: HttpClient) { }

  list(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

}