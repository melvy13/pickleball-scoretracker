import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScoreEntryComponent } from './score-entry';

describe('ScoreEntryComponent', () => {
  let component: ScoreEntryComponent;
  let fixture: ComponentFixture<ScoreEntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoreEntryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScoreEntryComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
