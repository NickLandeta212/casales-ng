import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LoginService } from '../../auth/services/login.service';
import { NavbarComponent } from "../navbar/navbar.component";
import { SidebarComponent } from "../sidebar/sidebar.component";
import { SidebarMenuComponent } from "../sidebar-menu/sidebar-menu.component";


@Component({
  selector: 'app-dashboard',
  imports: [RouterModule, NavbarComponent, SidebarComponent, SidebarMenuComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {

  constructor(private loginService: LoginService) { }

  ngOnInit(): void {

  }

}
