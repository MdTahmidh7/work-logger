import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateFilterComponent } from '../../shared/components/date-filter.component';
import { db } from '../../core/database/database.service';
import { NotificationService } from '../../core/services/notification.service';
import { DateUtilsService } from '../../core/services/date-utils.service';
import { WorkLog } from '../../core/models/work-log.model';

@Component({
  standalone: true,
  selector: 'app-work-log-form',
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatInputModule, MatFormFieldModule,
    MatDatepickerModule, DateFilterComponent
  ],
  template: `
    <div class="page-wrapper">
      <div class="page">
        <div class="form-card">
          <div class="card-header">
            <mat-icon class="card-icon">{{ isEditMode() ? 'edit_note' : 'add_task' }}</mat-icon>
            <h2>{{ isEditMode() ? 'Edit Log' : 'New Log' }}</h2>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="log-form">
            <div class="form-row">
              <mat-form-field appearance="outline" class="title-field">
                <mat-label>Title</mat-label>
                <input matInput formControlName="title" placeholder="What did you work on?">
                @if (form.get('title')?.hasError('required') && form.get('title')?.touched) {
                  <mat-error>Title is required</mat-error>
                }
              </mat-form-field>
              <button type="button" class="icon-btn" [class.active]="showDetails()" (click)="showDetails.set(!showDetails())" matTooltip="Add details">
                <mat-icon>{{ showDetails() ? 'expand_less' : 'notes' }}</mat-icon>
              </button>
            </div>

            @if (showDetails()) {
              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Details</mat-label>
                  <textarea matInput formControlName="details" rows="1"
                            placeholder="Optional details"></textarea>
                </mat-form-field>
              </div>
            }

            <div class="form-row date-duration-row">
              <mat-form-field appearance="outline" class="date-field">
                <mat-label>Date</mat-label>
                <input matInput [matDatepicker]="picker" formControlName="date" [max]="maxDate">
                <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
                @if (form.get('date')?.hasError('matDatepickerMax')) {
                  <mat-error>Cannot select future dates</mat-error>
                }
              </mat-form-field>

              <div class="duration-field-wrap">
                <div class="duration-inputs">
                  <input type="number" formControlName="hours" min="0" max="24" class="dur-input" placeholder="0">
                  <span class="dur-sep">h</span>
                  <input type="number" formControlName="minutes" min="0" max="59" step="5" class="dur-input" placeholder="30">
                  <span class="dur-sep">m</span>
                </div>
                @if (durationError()) {
                  <div class="error-msg">{{ durationError() }}</div>
                }
              </div>
            </div>

            <div class="bottom-row">
              <div class="presets-row">
                @for (preset of quickPresets; track preset) {
                  <button type="button" class="preset-btn" [class.active]="getTotalMinutes() === preset"
                          (click)="setDuration(preset)">
                    {{ preset >= 60 ? (preset / 60) + 'h' : preset + 'm' }}
                  </button>
                }
              </div>

              <div class="submit-row">
                @if (isEditMode()) {
                  <button type="button" class="btn-cancel" (click)="cancelEdit()">Cancel</button>
                }
                <button type="submit" class="btn-submit" [disabled]="form.invalid">
                  <mat-icon>{{ isEditMode() ? 'save' : 'add' }}</mat-icon>
                  {{ isEditMode() ? 'Update' : 'Add Log' }}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div class="list-section">
          <div class="list-header">
            <div class="list-title-group">
              <h2>Work Logs</h2>
              <span class="log-count">{{ flatLogs().length }} logs</span>
            </div>
          </div>

          <div class="filter-bar">
            <app-date-filter (rangeChange)="onFilterChange($event)" />
          </div>

          @if (flatLogs().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">
                <mat-icon>folder_open</mat-icon>
              </div>
              <h3>No logs found</h3>
              <p>No work logs match your current filter.</p>
            </div>
          } @else {
            <div class="log-table">
              <div class="table-header">
                <div class="th">Date</div>
                <div class="th">Day</div>
                <div class="th">Task</div>
                <div class="th">Duration</div>
                <div class="th"></div>
              </div>
              @for (item of pagedLogs(); track item.log.id) {
                <div class="table-row"
                     [class.friday]="item.isFriday"
                     [class.saturday]="item.isSaturday"
                     [class.workday]="!item.isFriday && !item.isSaturday"
                     [class.first-of-day]="item.isFirstOfDay"
                     [class.day-continuation]="!item.isFirstOfDay">
                  <div class="td date-cell">
                    @if (item.isFirstOfDay) {
                      <span class="date-text">{{ item.dateFormatted }}</span>
                    }
                  </div>
                  <div class="td day-cell" [class.holiday]="item.isFriday || item.isSaturday">
                    @if (item.isFirstOfDay) {
                      {{ item.dayName }}
                    }
                  </div>
                  <div class="td title-cell">
                    <div class="title-text">{{ item.log.title }}</div>
                    @if (item.log.details) {
                      <div class="details-text">{{ item.log.details }}</div>
                    }
                  </div>
                  <div class="td duration-cell">
                    <span class="duration-badge">{{ formatDuration(item.log.durationMinutes) }}</span>
                  </div>
                  <div class="td actions-cell">
                    <a (click)="editLog(item.log.id!)" class="edit-link" matTooltip="Edit log">
                      <mat-icon class="edit-icon">edit</mat-icon>
                    </a>
                  </div>
                </div>
              }
            </div>
            @if (totalPages() > 1) {
              <div class="pagination">
                <button mat-icon-button class="page-btn" [disabled]="currentPage() === 0" (click)="prevPage()">
                  <mat-icon>chevron_left</mat-icon>
                </button>
                <span class="page-info">{{ currentPage() + 1 }} / {{ totalPages() }}</span>
                <button mat-icon-button class="page-btn" [disabled]="currentPage() >= totalPages() - 1" (click)="nextPage()">
                  <mat-icon>chevron_right</mat-icon>
                </button>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-wrapper {
      min-height: 100vh;
      background: var(--pwl-background);
    }

    .page {
      max-width: 960px;
      margin: 0 auto;
      padding: 82px 20px 40px;
    }

    .form-card {
      background: var(--pwl-surface);
      border-radius: 14px;
      border: 1px solid var(--pwl-divider);
      padding: 16px 20px;
      margin-bottom: 16px;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }

    .card-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--pwl-primary);
    }

    .card-header h2 {
      font-size: 15px;
      font-weight: 600;
      color: var(--pwl-text-primary);
      margin: 0;
    }

    .log-form {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .form-row {
      display: flex;
      gap: 10px;
      align-items: start;
      margin-bottom: 4px;
    }

    .form-row .full-width {
      flex: 1;
    }

    .title-field {
      flex: 1;
    }

    .icon-btn {
      width: 40px;
      height: 40px;
      min-height: 40px;
      border-radius: 10px;
      border: 1px solid var(--pwl-divider);
      background: var(--pwl-surface);
      color: var(--pwl-text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
      margin-top: 8px;
      flex-shrink: 0;
    }

    .icon-btn:hover {
      border-color: var(--pwl-primary);
      color: var(--pwl-primary);
      background: var(--pwl-primary-light);
    }

    .icon-btn.active {
      border-color: var(--pwl-primary);
      color: var(--pwl-primary);
      background: var(--pwl-primary-light);
    }

    .icon-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .log-form mat-form-field {
      width: 100%;
    }

    .date-duration-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      align-items: center;
    }

    .date-field {
      font-size: 14px;
    }

    .duration-field-wrap {
      flex: 1;
      margin-bottom: 20px;
    }

    .duration-inputs {
      display: flex;
      align-items: center;
      gap: 4px;
      border: 1px solid var(--pwl-divider);
      border-radius: 4px;
      padding: 0 12px;
      height: 56px;
      transition: border-color 0.2s;
    }

    .duration-inputs:focus-within {
      border-color: var(--pwl-primary);
      border-width: 2px;
      padding: 0 11px;
    }

    .dur-input {
      width: 40px;
      border: none;
      outline: none;
      font-size: 16px;
      font-weight: 500;
      background: transparent;
      color: var(--pwl-text-primary);
      font-family: 'Inter', sans-serif;
      text-align: center;
      -moz-appearance: textfield;
    }

    .dur-input::-webkit-outer-spin-button,
    .dur-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    .dur-sep {
      color: var(--pwl-text-tertiary);
      font-size: 14px;
      font-weight: 500;
    }

    .error-msg {
      color: var(--pwl-danger);
      font-size: 11px;
      padding-left: 2px;
      margin-top: 2px;
    }

    .bottom-row {
      border-top: 1px solid var(--pwl-divider);
      margin-top: 8px;
      padding-top: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .presets-row {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-wrap: wrap;
      flex: 1;
    }

    .preset-btn {
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid var(--pwl-divider);
      background: var(--pwl-surface);
      color: var(--pwl-text-secondary);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      font-family: 'Inter', sans-serif;
    }

    .preset-btn:hover,
    .preset-btn.active {
      border-color: var(--pwl-primary);
      color: var(--pwl-primary);
      background: var(--pwl-primary-light);
    }

    .submit-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .btn-cancel {
      padding: 7px 16px;
      border-radius: 8px;
      border: 1px solid var(--pwl-divider);
      background: transparent;
      color: var(--pwl-text-secondary);
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
      font-family: 'Inter', sans-serif;
    }

    .btn-cancel:hover {
      background: var(--pwl-surface-variant);
    }

    .btn-submit {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 7px 18px;
      border-radius: 8px;
      border: none;
      background: var(--pwl-primary);
      color: white;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
      font-family: 'Inter', sans-serif;
      box-shadow: 0 2px 6px rgba(103, 80, 164, 0.25);
    }

    .btn-submit:hover:not(:disabled) {
      box-shadow: 0 3px 12px rgba(103, 80, 164, 0.35);
      transform: translateY(-1px);
    }

    .btn-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-submit mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .list-section {
      background: var(--pwl-surface);
      border-radius: 14px;
      border: 1px solid var(--pwl-divider);
      overflow: hidden;
    }

    .list-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid var(--pwl-divider);
    }

    .list-title-group h2 {
      font-size: 14px;
      font-weight: 600;
      color: var(--pwl-text-primary);
      margin: 0;
    }

    .log-count {
      font-size: 11px;
      color: var(--pwl-text-secondary);
    }

    .filter-bar {
      padding: 10px 20px;
      border-bottom: 1px solid var(--pwl-divider);
      background: var(--pwl-surface-variant);
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
    }

    .empty-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: var(--pwl-surface-variant);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
    }

    .empty-icon mat-icon {
      font-size: 26px;
      width: 26px;
      height: 26px;
      color: var(--pwl-text-tertiary);
    }

    .empty-state h3 {
      font-size: 14px;
      font-weight: 600;
      color: var(--pwl-text-primary);
      margin: 0 0 4px;
    }

    .empty-state p {
      font-size: 12px;
      color: var(--pwl-text-secondary);
      margin: 0;
    }

    .log-table { width: 100%; }

    .table-header {
      display: grid;
      grid-template-columns: 100px 90px 1fr 80px 40px;
      padding: 8px 20px;
      border-bottom: 1px solid var(--pwl-divider);
      background: var(--pwl-surface-variant);
    }

    .th {
      font-size: 10px;
      font-weight: 600;
      color: var(--pwl-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .table-row {
      display: grid;
      grid-template-columns: 100px 90px 1fr 80px 40px;
      padding: 10px 20px;
      border-bottom: 1px solid var(--pwl-divider);
      align-items: center;
      transition: background 0.15s;
    }

    .table-row:last-child { border-bottom: none; }
    .table-row:hover { filter: brightness(0.97); }

    .table-row.workday { background: rgba(13, 148, 136, 0.04); }
    .table-row.workday:hover { background: rgba(13, 148, 136, 0.08); }
    .table-row.workday.first-of-day { background: rgba(13, 148, 136, 0.06); }
    .table-row.workday.day-continuation { background: rgba(13, 148, 136, 0.02); }

    .table-row.friday { background: rgba(255, 204, 0, 0.06); }
    .table-row.friday:hover { background: rgba(255, 204, 0, 0.12); }
    .table-row.friday.first-of-day { background: rgba(255, 204, 0, 0.08); }
    .table-row.friday.day-continuation { background: rgba(255, 204, 0, 0.03); }

    .table-row.saturday { background: rgba(255, 107, 107, 0.06); }
    .table-row.saturday:hover { background: rgba(255, 107, 107, 0.12); }
    .table-row.saturday.first-of-day { background: rgba(255, 107, 107, 0.08); }
    .table-row.saturday.day-continuation { background: rgba(255, 107, 107, 0.03); }

    .td { font-size: 12px; color: var(--pwl-text-primary); }

    .date-cell { font-weight: 500; }
    .date-text { font-size: 12px; }

    .day-cell { color: var(--pwl-text-secondary); font-size: 11px; }
    .day-cell.holiday { font-weight: 600; }

    .title-cell { min-width: 0; }

    .title-text {
      font-size: 13px; font-weight: 500; color: var(--pwl-text-primary);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    .details-text {
      font-size: 11px; color: var(--pwl-text-tertiary);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      margin-top: 1px;
    }

    .duration-cell { text-align: center; }

    .duration-badge {
      display: inline-block; padding: 2px 8px; border-radius: 5px;
      font-size: 11px; font-weight: 600;
      background: var(--pwl-primary-light); color: var(--pwl-primary);
    }

    .actions-cell { display: flex; justify-content: center; align-items: center; }

    .edit-link {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 6px;
      color: var(--pwl-text-secondary); transition: all 0.15s;
      text-decoration: none;
    }
    .edit-link:hover { background: var(--pwl-primary-light); color: var(--pwl-primary); }
    .edit-icon { font-size: 16px; width: 16px; height: 16px; }

    .pagination {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 10px 20px; border-top: 1px solid var(--pwl-divider);
    }
    .page-btn { width: 28px; height: 28px; color: var(--pwl-text-secondary); }
    .page-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .page-info { font-size: 12px; color: var(--pwl-text-secondary); font-weight: 500; }

    @media (max-width: 768px) {
      .page { padding: 82px 16px 32px; }
      .form-card { padding: 14px 16px; }
      .date-duration-row { grid-template-columns: 1fr; }
      .bottom-row { flex-direction: column; align-items: stretch; }
      .submit-row { justify-content: flex-end; }
      .table-header, .table-row {
        grid-template-columns: 80px 70px 1fr 70px 36px;
        padding: 8px 14px;
      }
      .list-header { padding: 12px 14px; }
      .filter-bar { padding: 8px 14px; }
    }
  `]
})
export class WorkLogFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notify = inject(NotificationService);
  private dateUtils = inject(DateUtilsService);

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

  ngOnInit(): void {
    this.loadLogs();

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
    const log = await db.getLog(id);
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
    if (range) {
      this.logs.set(await db.getLogsByRange(range.startDate, range.endDate));
    } else {
      const defaultRange = this.dateUtils.getDateRange('thisMonth');
      this.logs.set(await db.getLogsByRange(defaultRange.startDate, defaultRange.endDate));
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
    if (this.form.invalid) return;

    const total = this.getTotalMinutes();
    if (total <= 0) {
      this.durationError.set('Duration must be greater than 0');
      return;
    }

    this.durationError.set('');
    const { title, details, date } = this.form.value;
    const dateStr = date instanceof Date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      : date;

    try {
      if (this.isEditMode()) {
        await db.updateLog(this.logId(), {
          title, details, date: dateStr, durationMinutes: total
        });
        this.notify.success('Work log updated successfully');
        this.isEditMode.set(false);
        this.logId.set(0);
        this.resetForm();
        this.router.navigate(['/work-log']);
      } else {
        await db.createLog({
          title, details, date: dateStr, durationMinutes: total
        });
        this.notify.success('Work log added successfully');
        this.resetForm();
      }
      await this.loadLogs();
    } catch {
      this.notify.error('Failed to save work log');
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
