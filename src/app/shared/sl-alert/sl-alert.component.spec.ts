import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SlAlertComponent } from './sl-alert.component';

describe('SlAlertComponent', () => {
  let component: SlAlertComponent;
  let fixture: ComponentFixture<SlAlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlAlertComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SlAlertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
