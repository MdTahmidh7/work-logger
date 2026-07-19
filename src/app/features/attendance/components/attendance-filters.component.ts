import { Component, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

@Component({
  standalone: true,
  selector: 'app-attendance-filters',
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="date-filter">
      @for (filter of filters; track filter.value) {
        <button class="filter-btn" [class.active]="selected() === filter.value"
                (click)="select(filter.value)">
          <mat-icon>{{ filter.icon }}</mat-icon>
          <span>{{ filter.label }}</span>
        </button>
      }
      <button class="filter-btn custom-btn" [class.active]="selected() === 'custom'"
              (click)="showCustom.set(!showCustom())">
        <mat-icon>tune</mat-icon>
        <span>Custom</span>
      </button>
      @if (showCustom()) {
        <div class="custom-range">
          <input type="date" [value]="customStart()" (change)="onStartChange($event)" class="date-input">
          <span class="range-sep">to</span>
          <input type="date" [value]="customEnd()" (change)="onEndChange($event)" class="date-input">
        </div>
      }
    </div>
  `,
  styles: [`
    .date-filter { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .filter-btn {
      display: flex; align-items: center; gap: 5px; padding: 8px 14px;
      border-radius: 10px; border: 1px solid var(--pwl-divider);
      background: var(--pwl-surface); color: var(--pwl-text-secondary);
      font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s;
      font-family: 'Inter', sans-serif;
    }
    .filter-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .filter-btn:hover { background: var(--pwl-surface-variant); color: var(--pwl-text-primary); }
    .filter-btn.active { background: var(--pwl-primary-light); color: var(--pwl-primary); border-color: var(--pwl-primary); }

    .custom-range {
      display: flex; align-items: center; gap: 6px;
      margin-left: 8px; padding: 4px 8px; background: var(--pwl-surface-variant);
      border-radius: 10px;
    }
    .date-input {
      border: 1px solid var(--pwl-divider); border-radius: 8px;
      padding: 6px 10px; font-size: 13px; font-family: 'Inter', sans-serif;
      background: var(--pwl-surface); color: var(--pwl-text-primary);
    }
    .range-sep { color: var(--pwl-text-tertiary); font-size: 13px; }
  `]
})
export class AttendanceFiltersComponent {
  rangeChange = output<{ startDate: string; endDate: string }>();

  filters = [
    { value: 'today', label: 'Today', icon: 'today' },
    { value: 'yesterday', label: 'Yesterday', icon: 'history' },
    { value: 'thisWeek', label: 'This Week', icon: 'date_range' },
    { value: 'lastWeek', label: 'Last Week', icon: 'date_range' },
    { value: 'thisMonth', label: 'This Month', icon: 'calendar_today' },
    { value: 'lastMonth', label: 'Last Month', icon: 'calendar_today' },
    { value: 'thisYear', label: 'This Year', icon: 'event' }
  ];

  selected = signal('thisMonth');
  showCustom = signal(false);
  customStart = signal(new Date().toISOString().split('T')[0]);
  customEnd = signal(new Date().toISOString().split('T')[0]);

  constructor() {
    const range = this.getDateRange('thisMonth');
    this.rangeChange.emit(range);
  }

  select(value: string): void {
    this.selected.set(value);
    this.showCustom.set(false);
    const range = this.getDateRange(value);
    this.rangeChange.emit(range);
  }

  onStartChange(event: Event): void {
    this.customStart.set((event.target as HTMLInputElement).value);
    this.emitCustom();
  }

  onEndChange(event: Event): void {
    this.customEnd.set((event.target as HTMLInputElement).value);
    this.emitCustom();
  }

  private emitCustom(): void {
    this.selected.set('custom');
    this.rangeChange.emit({
      startDate: this.customStart(),
      endDate: this.customEnd()
    });
  }

  private getDateRange(type: string): { startDate: string; endDate: string } {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');

    switch (type) {
      case 'today':
        return { startDate: today, endDate: today };
      case 'yesterday': {
        const yesterday = subDays(now, 1);
        const dateStr = format(yesterday, 'yyyy-MM-dd');
        return { startDate: dateStr, endDate: dateStr };
      }
      case 'thisWeek': {
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        return { startDate: format(weekStart, 'yyyy-MM-dd'), endDate: today };
      }
      case 'lastWeek': {
        const lastWeekEnd = subDays(startOfWeek(now, { weekStartsOn: 1 }), 1);
        const lastWeekStart = startOfWeek(lastWeekEnd, { weekStartsOn: 1 });
        return { startDate: format(lastWeekStart, 'yyyy-MM-dd'), endDate: format(lastWeekEnd, 'yyyy-MM-dd') };
      }
      case 'thisMonth': {
        const monthStart = startOfMonth(now);
        return { startDate: format(monthStart, 'yyyy-MM-dd'), endDate: today };
      }
      case 'lastMonth': {
        const lastMonthEnd = subDays(startOfMonth(now), 1);
        const lastMonthStart = startOfMonth(lastMonthEnd);
        return { startDate: format(lastMonthStart, 'yyyy-MM-dd'), endDate: format(lastMonthEnd, 'yyyy-MM-dd') };
      }
      case 'thisYear': {
        const yearStart = startOfYear(now);
        return { startDate: format(yearStart, 'yyyy-MM-dd'), endDate: today };
      }
      default:
        return { startDate: today, endDate: today };
    }
  }
}