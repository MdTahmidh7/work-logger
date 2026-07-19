import { Component, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DateUtilsService } from '../../core/services/date-utils.service';
import { DateFilterType } from '../../core/models/work-log.model';

@Component({
  standalone: true,
  selector: 'app-date-filter',
  imports: [CommonModule, MatIconModule, MatButtonModule],
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
export class DateFilterComponent {
  rangeChange = output<{ startDate: string; endDate: string }>();

  private dateUtils = inject(DateUtilsService);

  filters = [
    { value: 'today', label: 'Today', icon: 'today' },
    { value: 'yesterday', label: 'Yesterday', icon: 'history' },
    { value: 'thisWeek', label: 'This Week', icon: 'date_range' },
    { value: 'thisMonth', label: 'This Month', icon: 'calendar_today' }
  ];

  selected = signal('thisMonth');
  showCustom = signal(false);
  customStart = signal(new Date().toISOString().split('T')[0]);
  customEnd = signal(new Date().toISOString().split('T')[0]);

  constructor() {
    const range = this.dateUtils.getDateRange('thisMonth');
    this.rangeChange.emit(range);
  }

  select(value: string): void {
    this.selected.set(value);
    this.showCustom.set(false);
    const range = this.dateUtils.getDateRange(value as DateFilterType);
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
}