import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { db } from '../../core/database/database.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  standalone: true,
  selector: 'app-work-log-form',
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatInputModule, MatFormFieldModule,
    MatDatepickerModule
  ],
  template: `
    <div class="form-page">
      <div class="form-header">
        <a routerLink="/dashboard" class="back-link">
          <mat-icon>arrow_back</mat-icon> Dashboard
        </a>
        <h1>{{ isEditMode() ? 'Edit Work Log' : 'Add Work Log' }}</h1>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="work-log-form">
        <mat-form-field appearance="outline">
          <mat-label>Title</mat-label>
          <input matInput formControlName="title" placeholder="What did you work on?">
          @if (form.get('title')?.hasError('required') && form.get('title')?.touched) {
            <mat-error>Title is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Details</mat-label>
          <textarea matInput formControlName="details" rows="3"
                    placeholder="Optional details about your work"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Date</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="date" [max]="maxDate">
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
          @if (form.get('date')?.hasError('matDatepickerMax')) {
            <mat-error>Cannot select future dates</mat-error>
          }
        </mat-form-field>

        <div class="duration-section">
          <label class="duration-label">Duration</label>
          <div class="duration-inputs">
            <div class="duration-field">
              <input type="number" formControlName="hours" min="0" max="24" class="duration-input">
              <span class="duration-unit">hours</span>
            </div>
            <div class="duration-field">
              <input type="number" formControlName="minutes" min="0" max="59" step="5" class="duration-input">
              <span class="duration-unit">min</span>
            </div>
          </div>
          @if (durationError()) {
            <div class="error-msg">{{ durationError() }}</div>
          }
        </div>

        <div class="quick-durations">
          @for (preset of quickPresets; track preset) {
            <button type="button" class="preset-btn" (click)="setDuration(preset)">{{ preset }}m</button>
          }
        </div>

        <div class="duration-display">
          <mat-icon>schedule</mat-icon>
          <span>Total: <strong>{{ getTotalMinutes() }} min</strong> ({{ getHours() }}h {{ getMins() }}m)</span>
        </div>

        <div class="form-actions">
          <a routerLink="/dashboard" class="cancel-btn">Cancel</a>
          <button type="submit" mat-raised-button color="primary" class="submit-btn" [disabled]="form.invalid">
            <mat-icon>{{ isEditMode() ? 'save' : 'add' }}</mat-icon>
            {{ isEditMode() ? 'Update Log' : 'Add Log' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .form-page {
      max-width: 640px;
      margin: 0 auto;
      padding-top: 100px;
      padding-left: 20px;
      padding-right: 20px;
    }

    .form-header {
      margin-bottom: 32px;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--pwl-text-secondary);
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      margin-bottom: 12px;
      transition: color 0.2s;
    }

    .back-link:hover {
      color: var(--pwl-primary);
    }

    .back-link mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .form-header h1 {
      font-size: 28px;
      font-weight: 700;
    }

    .work-log-form {
      background: var(--pwl-surface);
      border-radius: 16px;
      padding: 32px;
      border: 1px solid var(--pwl-divider);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .work-log-form mat-form-field {
      width: 100%;
    }

    .duration-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 8px;
    }

    .duration-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--pwl-text-primary);
    }

    .duration-inputs {
      display: flex;
      gap: 16px;
    }

    .duration-field {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
    }

    .duration-input {
      width: 100%;
      padding: 14px 16px;
      border: 1px solid var(--pwl-divider);
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      background: var(--pwl-surface);
      color: var(--pwl-text-primary);
      font-family: 'Inter', sans-serif;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .duration-input:focus {
      outline: none;
      border-color: var(--pwl-primary);
      box-shadow: 0 0 0 3px rgba(103, 80, 164, 0.1);
    }

    .duration-unit {
      color: var(--pwl-text-secondary);
      font-size: 14px;
      font-weight: 500;
      white-space: nowrap;
    }

    .error-msg {
      color: var(--pwl-danger);
      font-size: 13px;
    }

    .quick-durations {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 4px;
    }

    .preset-btn {
      padding: 8px 16px;
      border-radius: 10px;
      border: 1px solid var(--pwl-divider);
      background: var(--pwl-surface);
      color: var(--pwl-text-secondary);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      font-family: 'Inter', sans-serif;
    }

    .preset-btn:hover {
      border-color: var(--pwl-primary);
      color: var(--pwl-primary);
      background: var(--pwl-primary-light);
    }

    .duration-display {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 18px;
      background: var(--pwl-primary-light);
      border-radius: 12px;
      color: var(--pwl-primary);
      font-size: 14px;
      font-weight: 500;
      margin-top: 4px;
    }

    .duration-display mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 16px;
      padding-top: 20px;
      border-top: 1px solid var(--pwl-divider);
    }

    .cancel-btn {
      padding: 10px 24px;
      border-radius: 12px;
      border: 1px solid var(--pwl-divider);
      background: transparent;
      color: var(--pwl-text-secondary);
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      font-family: 'Inter', sans-serif;
    }

    .cancel-btn:hover {
      background: var(--pwl-surface-variant);
    }

    .submit-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  `]
})
export class WorkLogFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notify = inject(NotificationService);

  isEditMode = signal(false);
  logId = signal<number>(0);
  durationError = signal('');
  maxDate = new Date();

  quickPresets = [15, 30, 45, 60, 90, 120];

  form: FormGroup = this.fb.group({
    title: ['', Validators.required],
    details: [''],
    date: [new Date(), Validators.required],
    hours: [0, [Validators.min(0), Validators.max(24)]],
    minutes: [30, [Validators.min(0), Validators.max(59)]]
  });

  ngOnInit(): void {
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
    }
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
      } else {
        await db.createLog({
          title, details, date: dateStr, durationMinutes: total
        });
        this.notify.success('Work log added successfully');
      }
      this.router.navigate(['/dashboard']);
    } catch {
      this.notify.error('Failed to save work log');
    }
  }
}