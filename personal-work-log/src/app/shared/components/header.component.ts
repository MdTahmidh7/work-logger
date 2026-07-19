import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { WorkLog } from '../core/models/work-log.model';

interface NavigationItem {
  label: string;
  path: string;
  icon: string;
}

import { ChangeDetectorRef } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  title = 'Personal Work Logger';
  subtitle = 'Track and visualize your productivity';

  navigationItems: NavigationItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Add Work Log', path: '/work-log', icon: 'add' },
    { label: 'Settings', path: '/settings', icon: 'settings' }
  ];

  currentTheme: 'light' | 'dark' = 'light';

  get totalTasks(): number {
    return 0; // TODO: Connect to actual data service
  }

  get totalHours(): number {
    return 0; // TODO: Connect to actual data service
  }

  constructor(private cdr: ChangeDetectorRef) {
    this.checkSystemTheme();
  }

  private checkSystemTheme(): void {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.currentTheme = systemPrefersDark ? 'dark' : 'light';
    this.updateTheme(this.currentTheme);
  }

  private updateTheme(theme: 'light' | 'dark'): void {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    this.cdr.detectChanges();
  }

  toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.updateTheme(this.currentTheme);
  }

  toggleSidenav(): void {
    // This would typically emit an event to the layout component
    console.log('Toggle sidenav');
  }

  openHelp(): void {
    console.log('Open help');
  }

  openAbout(): void {
    console.log('Open about');
  }
}