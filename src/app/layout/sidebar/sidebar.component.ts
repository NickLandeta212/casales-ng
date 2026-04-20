import { Component, OnInit } from '@angular/core';
import { SidebarMenuComponent } from "../sidebar-menu/sidebar-menu.component";

@Component({
  selector: 'app-sidebar',
  imports: [SidebarMenuComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {

  ngOnInit(): void {

  }
}
