import { Component, OnInit } from '@angular/core';
import { NotificationsComponent } from '../notifications/notifications.component';
import { UserMenuComponent } from '../user-menu/user-menu.component';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [UserMenuComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit {
  title: string = '';

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    const role = this.authService.getUserRole();
    if (role === 'admin_general') {
      this.title = 'Casales San Pedro';
    } 
  }
}

