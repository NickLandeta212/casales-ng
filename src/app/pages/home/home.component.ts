import { Component, OnInit } from '@angular/core';
import { LoginService } from '../../auth/services/login.service';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit{

  constructor(private service: LoginService) { }

  ngOnInit(): void {
    
  }
}
