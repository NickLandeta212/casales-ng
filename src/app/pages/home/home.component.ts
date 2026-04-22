import { Component, OnInit } from '@angular/core';
import { LoginService } from '../../auth/services/login.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit{

  constructor(private service: LoginService) { }

  ngOnInit(): void {
    
  }
}
