import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LoaderServiceService } from './loader-service.service';
import { interval, Subscription } from 'rxjs';


@Component({
  selector: 'app-loader',
  imports: [CommonModule],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss'
})
export class LoaderComponent {

  loading$: typeof this.loaderService.loading$;
  letters: { char: string; color: string }[] = [];
  text = 'Casales';
  private intervalSub?: Subscription;


  constructor(private loaderService: LoaderServiceService) {
    this.loading$ = this.loaderService.loading$;
    this.generateLetters();
  }

 generateLetters(): void {
    this.letters = this.text.split('').map(char => ({
      char,
      color: this.randomColor()
    }));
  }

  randomColor(): string {
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A8', '#FFC300', '#DAF7A6'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}