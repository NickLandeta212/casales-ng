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
  private readonly brandColors = ['#14532d', '#3f8f31', '#7fbf3f', '#53624f'];
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
    return this.brandColors[Math.floor(Math.random() * this.brandColors.length)];
  }
}
