import { Routes } from '@angular/router';
import { StandingsComponent } from './views/standings/standings';
import { ScoreEntryComponent } from './views/score-entry/score-entry';
import { PairsComponent } from './views/pairs/pairs';

export const routes: Routes = [
  { path: '', redirectTo: 'standings', pathMatch: 'full' },
  { path: 'standings', component: StandingsComponent },
  { path: 'score-entry', component: ScoreEntryComponent },
  { path: 'pairs', component: PairsComponent }
];
