import { Routes } from '@angular/router';
import { StandingsComponent } from './views/standings/standings';
import { ScoreEntryComponent } from './views/score-entry/score-entry';
import { PairsComponent } from './views/pairs/pairs';
import { PairRankingsComponent } from './views/pair-rankings/pair-rankings';
import { ScheduleComponent } from './views/schedule/schedule';

export const routes: Routes = [
  { path: '', redirectTo: 'standings', pathMatch: 'full' },
  { path: 'standings', component: StandingsComponent },
  { path: 'score-entry', component: ScoreEntryComponent },
  { path: 'pairs', component: PairsComponent },
  { path: 'pair-rankings', component: PairRankingsComponent },
  { path: 'schedule', component: ScheduleComponent }
];
