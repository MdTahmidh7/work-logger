import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DateFilterComponent } from '../../shared/components/date-filter.component';
import { WorkLogFormSkeletonComponent } from '../../shared/components/skeletons/work-log-form-skeleton.component';
import { WorkLogService } from './services/work-log.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { DateUtilsService } from '../../core/services/date-utils.service';
import { ResponsiveService } from '../../core/services/responsive.service';
import { WorkLog } from '../../core/models/work-log.model';

@Component({
  standalone: true,
  selector: 'app-work-log-form',
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatInputModule, MatFormFieldModule,
    MatDatepickerModule, MatTooltipModule, DateFilterComponent, WorkLogFormSkeletonComponent
  ],
  templateUrl: './work-log-form.component.html',
  styleUrls: ['./work-log-form.component.scss']
})
export class WorkLogFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notify = inject(NotificationService);
  private confirm = inject(ConfirmDialogService);
  private dateUtils = inject(DateUtilsService);
  private workLogService = inject(WorkLogService);
  responsive = inject(ResponsiveService);

  loading = signal(true);
  submitting = signal(false);
  isEditMode = signal(false);
  logId = signal<number>(0);
  durationError = signal('');
  showDetails = signal(false);
  maxDate = new Date();

  logs = signal<WorkLog[]>([]);
  currentPage = signal(0);
  private readonly PAGE_SIZE = 7;

  quickPresets = [15, 30, 45, 60, 90, 120, 150, 180, 210, 240];

  form: FormGroup = this.fb.group({
    title: ['', Validators.required],
    details: [''],
    date: [new Date(), Validators.required],
    hours: [0, [Validators.min(0), Validators.max(24)]],
    minutes: [30, [Validators.min(0), Validators.max(59)]]
  });

  flatLogs = computed(() => {
    const logs = this.logs();
    const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    let lastDate = '';
    return sorted.map(log => {
      const isFirstOfDay = log.date !== lastDate;
      lastDate = log.date;
      return {
        log,
        isFirstOfDay,
        dayName: isFirstOfDay ? this.dateUtils.getDayName(log.date) : '',
        dateFormatted: isFirstOfDay ? this.dateUtils.formatShortDate(log.date) : '',
        isFriday: this.dateUtils.isFriday(log.date),
        isSaturday: this.dateUtils.isSaturday(log.date)
      };
    });
  });

  totalPages = computed(() => Math.ceil(this.flatLogs().length / this.PAGE_SIZE));

  pagedLogs = computed(() => {
    const start = this.currentPage() * this.PAGE_SIZE;
    return this.flatLogs().slice(start, start + this.PAGE_SIZE);
  });

  totalLogsCount = computed(() => this.logs().length);

  async ngOnInit(): Promise<void> {
    await this.loadLogs();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.logId.set(+id);
      this.loadLog(+id);
    } else {
      const dateParam = this.route.snapshot.queryParamMap.get('date');
      if (dateParam) {
        const parts = dateParam.split('-');
        const date = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        this.form.patchValue({ date });
      }
    }
  }

  async loadLog(id: number): Promise<void> {
    const log = await this.workLogService.getById(id);
    if (log) {
      const hours = Math.floor(log.durationMinutes / 60);
      const minutes = log.durationMinutes % 60;
      this.form.patchValue({
        title: log.title,
        details: log.details,
        date: new Date(log.date),
        hours,
        minutes
      });
      if (log.details) {
        this.showDetails.set(true);
      }
    }
  }

  async loadLogs(range?: { startDate: string; endDate: string }): Promise<void> {
    this.loading.set(true);
    try {
      if (range) {
        this.logs.set(await this.workLogService.getByRange(range.startDate, range.endDate));
      } else {
        const defaultRange = this.dateUtils.getDateRange('last30Days');
        this.logs.set(await this.workLogService.getByRange(defaultRange.startDate, defaultRange.endDate));
      }
    } catch (e) {
      console.error('Failed to load work logs:', e);
      this.notify.error('Failed to load work logs: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      this.loading.set(false);
    }
  }

  async onFilterChange(range: { startDate: string; endDate: string }): Promise<void> {
    this.currentPage.set(0);
    await this.loadLogs(range);
  }

  setDuration(minutes: number): void {
    this.form.patchValue({
      hours: Math.floor(minutes / 60),
      minutes: minutes % 60
    });
  }

  getTotalMinutes(): number {
    const h = this.form.get('hours')?.value || 0;
    const m = this.form.get('minutes')?.value || 0;
    return h * 60 + m;
  }

  getHours(): number {
    return Math.floor(this.getTotalMinutes() / 60);
  }

  getMins(): number {
    return this.getTotalMinutes() % 60;
  }

  cancelEdit(): void {
    this.isEditMode.set(false);
    this.logId.set(0);
    this.resetForm();
    this.router.navigate(['/work-log']);
  }

  editLog(id: number): void {
    this.router.navigate(['/edit', id]);
  }

  async deleteLog(log: WorkLog): Promise<void> {
    const ok = await this.confirm.confirm(
      'Delete Log',
      `Are you sure you want to delete "${log.title}"? This cannot be undone.`
    );
    if (ok) {
      try {
        await this.workLogService.delete(log.id!);
        this.notify.success('Log deleted successfully');
        await this.loadLogs();
      } catch (e) {
        console.error('Delete error:', e);
        this.notify.error('Failed to delete log');
      }
    }
  }

  resetForm(): void {
    this.form.reset({
      title: '',
      details: '',
      date: new Date(),
      hours: 0,
      minutes: 30
    });
    this.durationError.set('');
    this.showDetails.set(false);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.submitting()) return;

    const total = this.getTotalMinutes();
    if (total <= 0) {
      this.durationError.set('Duration must be greater than 0');
      return;
    }

    if (this.isEditMode()) {
      const confirmed = await this.confirm.confirmAction({
        title: 'Update Log',
        message: 'Are you sure you want to update this work log?',
        confirmText: 'Update',
        confirmColor: '#6750a4',
        icon: 'question',
      });
      if (!confirmed) return;
    }

    this.submitting.set(true);
    this.durationError.set('');
    const { title, details, date } = this.form.value;
    const dateStr = date instanceof Date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      : date;

    try {
      if (this.isEditMode()) {
        await this.workLogService.update(this.logId(), {
          title, details, date: dateStr, durationMinutes: total
        });
        this.notify.success('Work log updated successfully');
        this.isEditMode.set(false);
        this.logId.set(0);
        this.resetForm();
        this.router.navigate(['/work-log']);
      } else {
        await this.workLogService.create({
          title, details, date: dateStr, durationMinutes: total
        });
        this.notify.success('Work log added successfully');
        this.resetForm();
      }
      await this.loadLogs();
    } catch {
      this.notify.error('Failed to save work log');
    } finally {
      this.submitting.set(false);
    }
  }

  formatShortDate(date: string): string {
    return this.dateUtils.formatShortDate(date);
  }

  formatDuration(minutes: number): string {
    return this.dateUtils.formatDuration(minutes);
  }

  prevPage(): void {
    if (this.currentPage() > 0) this.currentPage.update(p => p - 1);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) this.currentPage.update(p => p + 1);
  }
}
