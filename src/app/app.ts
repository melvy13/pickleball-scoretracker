import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  title = 'pickleball-scoretracker';
}
