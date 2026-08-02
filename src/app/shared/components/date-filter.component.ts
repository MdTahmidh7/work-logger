import { Component, output, signal, inject, input, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DateUtilsService } from '../../core/services/date-utils.service';
import { DateFilterType } from '../../core/models/work-log.model';

@Component({
  standalone: true,
  selector: 'app-date-filter',
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './date-filter.component.html',
  styleUrls: ['./date-filter.component.scss']
})
export class DateFilterComponent implements OnInit {
  rangeChange = output<{ startDate: string; endDate: string }>();

  initialStartDate = input<string>('');
  initialEndDate = input<string>('');

  private dateUtils = inject(DateUtilsService);

  filters = [
    { value: 'today', label: 'Today', icon: 'today' },
    { value: 'yesterday', label: 'Yesterday', icon: 'history' },
    { value: 'thisWeek', label: 'This Week', icon: 'date_range' },
    { value: 'last30Days', label: 'Last 30 Days', icon: 'date_range' },
    { value: 'thisMonth', label: 'This Month', icon: 'calendar_today' }
  ];

  selected = signal('last30Days');
  showCustom = signal(false);
  customStart = signal(new Date().toISOString().split('T')[0]);
  customEnd = signal(new Date().toISOString().split('T')[0]);

  ngOnInit(): void {
    const startDate = this.initialStartDate();
    const endDate = this.initialEndDate();

    if (startDate && endDate) {
      this.customStart.set(startDate);
      this.customEnd.set(endDate);
      this.selected.set('custom');
      this.showCustom.set(true);
      this.rangeChange.emit({ startDate, endDate });
    }
  }

  select(value: string): void {
    this.selected.set(value);
    this.showCustom.set(false);
    const range = this.dateUtils.getDateRange(value as DateFilterType);
    this.rangeChange.emit(range);
  }

  toggleCustom(): void {
    this.showCustom.update(v => !v);
    this.selected.set('custom');
    if (this.showCustom()) {
      this.rangeChange.emit({
        startDate: this.customStart(),
        endDate: this.customEnd()
      });
    }
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
    this.showCustom.set(true);
    this.rangeChange.emit({
      startDate: this.customStart(),
      endDate: this.customEnd()
    });
  }
}