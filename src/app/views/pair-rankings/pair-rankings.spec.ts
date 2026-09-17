import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PairRankingsComponent } from './pair-rankings';

describe('PairRankingsComponent', () => {
  let component: PairRankingsComponent;
  let fixture: ComponentFixture<PairRankingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PairRankingsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PairRankingsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
