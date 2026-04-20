import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
 constructor() { }

  isAuthenticated() {
    if (sessionStorage.getItem('token')) {
      return true;
    }
    return false;
  }
}
