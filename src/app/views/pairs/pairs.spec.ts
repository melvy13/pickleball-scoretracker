import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PairsComponent } from './pairs';

describe('PairsComponent', () => {
  let component: PairsComponent;
  let fixture: ComponentFixture<PairsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PairsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PairsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
