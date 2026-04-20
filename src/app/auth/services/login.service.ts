import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.endpoint}/auth/login`;

  onLogin(credentials: { username: string; password: string }): Observable<any> {
    return this.http.post(this.apiUrl, credentials);
  }

}
