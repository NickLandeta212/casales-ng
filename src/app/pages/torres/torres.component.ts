import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TorresService } from '../../services/torres.service';

@Component({
  selector: 'app-torres',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './torres.component.html',
  styleUrl: './torres.component.scss'
})
export class TorresComponent implements OnInit {

  lista: any[] = [];

  constructor(private torreService: TorresService) { }

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.torreService.list().subscribe((res: any) => {
      this.lista = res;
      console.log(res)
    });
  }

}
