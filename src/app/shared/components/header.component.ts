import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  template: `
    <header class="header">
      <div class="header-left">
        <div class="brand">
          <div class="brand-icon">
            <mat-icon>schedule</mat-icon>
          </div>
          <div class="brand-text">
            <span class="brand-name">Work Logger</span>
          </div>
        </div>
      </div>

      <nav class="header-nav">
        <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">
          <mat-icon>dashboard</mat-icon>
          <span>Dashboard</span>
        </a>
        <a routerLink="/work-log" routerLinkActive="active" class="nav-link">
          <mat-icon>add_circle</mat-icon>
          <span>Add Log</span>
        </a>
        <a routerLink="/settings" routerLinkActive="active" class="nav-link">
          <mat-icon>settings</mat-icon>
          <span>Settings</span>
        </a>
      </nav>

      <div class="header-right">
        <button mat-icon-button class="theme-toggle" (click)="toggleTheme()">
          <mat-icon>{{ isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 70px;
      background: var(--pwl-surface);
      border-bottom: 1px solid var(--pwl-divider);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      z-index: 1000;
      backdrop-filter: blur(20px);
    }

    .header-left {
      display: flex;
      align-items: center;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand-icon mat-icon {
      color: white;
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .brand-name {
      font-size: 18px;
      font-weight: 700;
      color: var(--pwl-text-primary);
      letter-spacing: -0.3px;
    }

    .header-nav {
      display: flex;
      gap: 4px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 10px;
      color: var(--pwl-text-secondary);
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .nav-link:hover {
      background: var(--pwl-surface-variant);
      color: var(--pwl-text-primary);
    }

    .nav-link.active {
      background: var(--pwl-primary-light);
      color: var(--pwl-primary);
    }

    .nav-link mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .theme-toggle {
      color: var(--pwl-text-secondary);
    }

    @media (max-width: 768px) {
      .header {
        padding: 0 16px;
      }

      .brand-name {
        display: none;
      }

      .nav-link span {
        display: none;
      }

      .nav-link {
        padding: 8px;
      }
    }
  `]
})
export class HeaderComponent {
  isDark = signal(false);

  constructor() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      this.isDark.set(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  toggleTheme(): void {
    this.isDark.update(v => !v);
    const theme = this.isDark() ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }
}
