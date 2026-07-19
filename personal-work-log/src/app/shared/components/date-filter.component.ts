import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

interface DateFilter {
  startDate: string;
  endDate: string;
}

enum DateFilterType {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  THIS_WEEK = 'thisWeek',
  LAST_WEEK = 'lastWeek',
  THIS_MONTH = 'thisMonth',
  LAST_MONTH = 'lastMonth',
  THIS_YEAR = 'thisYear',
  CUSTOM = 'custom'
}

interface PredefinedFilter {
  label: string;
  type: DateFilterType;
  icon: string;
  getFilter: (today: Date) => DateFilter;
}

@Component({
  standalone: true,
  selector: 'app-date-filter',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './date-filter.html',
  styleUrls: ['./date-filter.scss']
})
export class DateFilterComponent implements OnInit {
  filterForm: FormGroup;
  
  filterChange = new EventEmitter<{ type: DateFilterType; filter: DateFilter }>();

  readonly DateFilterType = DateFilterType;

  readonly predefinedFilters: PredefinedFilter[] = [
    { label: 'Today', type: DateFilterType.TODAY, icon: 'today', getFilter: (today: Date) => ({ startDate: this.formatDate(today), endDate: this.formatDate(today) }) },
    { label: 'Yesterday', type: DateFilterType.YESTERDAY, icon: 'event', getFilter: (today: Date) => ({ startDate: this.formatDate(this.subDays(today, 1)), endDate: this.formatDate(this.subDays(today, 1)) }) },
    { label: 'This Week', type: DateFilterType.THIS_WEEK, icon: 'date_range', getFilter: (today: Date) => ({ startDate: this.formatDate(this.startOfWeek(today)), endDate: this.formatDate(today) }) },
    { label: 'This Month', type: DateFilterType.THIS_MONTH, icon: 'calendar_today', getFilter: (today: Date) => ({ startDate: this.formatDate(this.startOfMonth(today)), endDate: this.formatDate(today) }) },
    { label: 'This Year', type: DateFilterType.THIS_YEAR, icon: 'calendar_view_year', getFilter: (today: Date) => ({ startDate: this.formatDate(this.startOfYear(today)), endDate: this.formatDate(today) }) },
    { label: 'Custom Range', type: DateFilterType.CUSTOM, icon: 'date_range', getFilter: () => ({ startDate: '', endDate: '' }) }
  ];

  constructor(private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      type: [DateFilterType.TODAY],
      startDate: [''],
      endDate: ['']
    });
  }

  ngOnInit(): void {
    this.updateFilter();
  }

  get showDateRangePicker(): boolean {
    return this.filterForm.get('type')?.value === DateFilterType.CUSTOM;
  }

  get currentFilter(): DateFilter {
    const type = this.filterForm.get('type')?.value as DateFilterType;
    const startDate = this.filterForm.get('startDate')?.value;
    const endDate = this.filterForm.get('endDate')?.value;

    const today = new Date();

    if (type === DateFilterType.CUSTOM && startDate && endDate) {
      return { startDate, endDate };
    }

    // Generate default date ranges based on type
    let calculatedStart: string, calculatedEnd: string;

    switch (type) {
      case DateFilterType.TODAY:
        calculatedStart = this.formatDate(today);
        calculatedEnd = this.formatDate(today);
        break;
      case DateFilterType.YESTERDAY:
        calculatedStart = this.formatDate(this.subDays(today, 1));
        calculatedEnd = this.formatDate(this.subDays(today, 1));
        break;
      case DateFilterType.THIS_WEEK:
        calculatedStart = this.formatDate(this.startOfWeek(today));
        calculatedEnd = this.formatDate(today);
        break;
      case DateFilterType.THIS_MONTH:
        calculatedStart = this.formatDate(this.startOfMonth(today));
        calculatedEnd = this.formatDate(today);
        break;
      case DateFilterType.THIS_YEAR:
        calculatedStart = this.formatDate(this.startOfYear(today));
        calculatedEnd = this.formatDate(today);
        break;
      default:
        calculatedStart = this.formatDate(today);
        calculatedEnd = this.formatDate(today);
    }

    return { startDate: calculatedStart, endDate: calculatedEnd };
  }

  onFilterTypeChange(type: DateFilterType): void {
    this.filterForm.patchValue({ type });
    this.updateFilter();
  }

  updateFilter(): void {
    if (this.showDateRangePicker) {
      const startDate = this.filterForm.get('startDate')?.value;
      const endDate = this.filterForm.get('endDate')?.value;
      if (startDate && endDate) {
        this.emitFilterChange();
      }
    } else {
      // For predefined types, emit immediately
      this.emitFilterChange();
    }
  }

  onCustomDateRangeChange(): void {
    if (this.filterForm.get('startDate')?.value && this.filterForm.get('endDate')?.value) {
      this.filterForm.patchValue({ type: DateFilterType.CUSTOM });
      this.emitFilterChange();
    }
  }

  emitFilterChange(): void {
    this.filterChange.emit({
      type: this.filterForm.get('type')?.value as DateFilterType,
      filter: this.currentFilter
    });
  }

  // Helper methods for date manipulation
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  subDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }

  startOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    result.setHours(0, 0, 0, 0);
    result.setDate(result.getDate() - day);
    return result;
  }

  startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  startOfYear(date: Date): Date {
    return new Date(date.getFullYear(), 0, 1);
  }
}