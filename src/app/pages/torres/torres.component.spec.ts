import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { TorresComponent } from './torres.component';

describe('TorresComponent', () => {
  let component: TorresComponent;
  let fixture: ComponentFixture<TorresComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TorresComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TorresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
