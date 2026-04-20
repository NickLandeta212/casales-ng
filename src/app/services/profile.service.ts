import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  private apiUrl = `${environment.endpoint}/profile`;


  constructor(private http: HttpClient) { }

  getProfile(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  createOrUpdateProfile(profile: any): Observable<any> {
    return this.http.post(this.apiUrl, profile);
  }

}
