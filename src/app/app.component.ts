import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header.component';

@Component({
  standalone: true,
  selector: 'pwl-root',
  imports: [RouterOutlet, HeaderComponent],
  template: `
    <app-header />
    <main>
      <router-outlet />
    </main>
  `,
  styles: [`
    main {
      min-height: 100vh;
      padding: 0 24px 32px;
    }

    @media (max-width: 768px) {
      main {
        padding: 0 12px 20px;
      }
    }
  `]
})
export class AppComponent {
  title = 'Personal Work Logger';
}
