import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AttendanceService } from '../services/attendance.service';
import { Attendance } from '../models/attendance.model';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  standalone: true,
  selector: 'app-attendance-edit',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MatIconModule, MatButtonModule,
            MatFormFieldModule, MatInputModule],
  template: `
    <div class="edit-wrapper">
      <div class="edit-container">
        <div class="page-header">
          <a routerLink="/attendance" class="back-link">
            <mat-icon>arrow_back</mat-icon>
          </a>
          <div>
            <h1>Edit Attendance</h1>
            <p class="subtitle">Update punch times for {{ formatDate() }}</p>
          </div>
        </div>

        @if (attendance()) {
          <div class="form-card">
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
              <div class="field-group">
                <label class="field-label">Punch In</label>
                <mat-form-field appearance="outline" class="time-field">
                  <mat-label>Time</mat-label>
                  <input matInput type="time" formControlName="firstPunchIn">
                </mat-form-field>
              </div>

              <div class="field-group">
                <label class="field-label">Punch Out</label>
                <mat-form-field appearance="outline" class="time-field">
                  <mat-label>Time</mat-label>
                  <input matInput type="time" formControlName="lastPunchOut">
                </mat-form-field>
              </div>

              <div class="working-hour-preview">
                <mat-icon>schedule</mat-icon>
                <span>Working Hour: <strong>{{ calculatedWorkingHours() }}</strong></span>
              </div>

              <div class="actions">
                <a routerLink="/attendance" class="cancel-btn">Cancel</a>
                <button type="submit" class="save-btn" [disabled]="form.invalid || saving()">
                  <mat-icon>save</mat-icon>
                  {{ saving() ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>
        } @else {
          <div class="loading-state">
            <mat-icon>hourglass_empty</mat-icon>
            <p>Loading attendance record...</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .edit-wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 0 20px;
    }
    .edit-container { padding-top: 82px; }
    .page-header {
      display: flex; align-items: flex-start; gap: 12px; margin-bottom: 24px;
    }
    .page-header h1 { font-size: 24px; font-weight: 700; color: var(--pwl-text-primary); }
    .subtitle { color: var(--pwl-text-secondary); font-size: 13px; margin-top: 2px; }

    .back-link {
      display: inline-flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0; margin-top: 2px;
      background: var(--pwl-surface); border: 1px solid var(--pwl-divider);
      color: var(--pwl-text-secondary); text-decoration: none; transition: all 0.2s;
    }
    .back-link:hover { color: var(--pwl-primary); border-color: var(--pwl-primary); }

    .form-card {
      background: var(--pwl-surface); border-radius: 14px; border: 1px solid var(--pwl-divider);
      padding: 28px;
    }

    .field-group { margin-bottom: 20px; }
    .field-label {
      display: block; font-size: 12px; font-weight: 600; color: var(--pwl-text-secondary);
      margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;
    }

    .time-field { width: 100%; }

    :host ::ng-deep .mat-mdc-form-field {
      --mdc-outlined-text-field-container-shape: 10px;
    }

    .working-hour-preview {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px; border-radius: 10px;
      background: var(--pwl-primary-light); color: var(--pwl-primary);
      font-size: 14px; margin-bottom: 24px;
    }
    .working-hour-preview mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .actions { display: flex; gap: 12px; justify-content: flex-end; }

    .cancel-btn {
      padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 13px;
      border: 1px solid var(--pwl-divider); background: var(--pwl-surface);
      color: var(--pwl-text-secondary); cursor: pointer; transition: all 0.2s;
      text-decoration: none; display: inline-flex; align-items: center;
    }
    .cancel-btn:hover { background: var(--pwl-surface-variant); color: var(--pwl-text-primary); }

    .save-btn {
      padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 13px;
      border: none; background: var(--pwl-primary); color: white; cursor: pointer;
      transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px;
      font-family: 'Inter', sans-serif;
    }
    .save-btn:hover { filter: brightness(0.9); }
    .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .save-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .loading-state {
      text-align: center; padding: 60px 20px; color: var(--pwl-text-secondary);
    }
    .loading-state mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--pwl-primary); margin-bottom: 12px; }
  `]
})
export class AttendanceEditPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private attendanceService = inject(AttendanceService);
  private notify = inject(NotificationService);

  attendance = signal<Attendance | null>(null);
  saving = signal(false);

  form: FormGroup = this.fb.group({
    firstPunchIn: ['', Validators.required],
    lastPunchOut: ['']
  });

  calculatedWorkingHours = signal('--:--');

  private attendanceId!: number;

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.notify.error('Invalid attendance ID');
      this.router.navigate(['/attendance']);
      return;
    }
    this.attendanceId = +idParam;
    await this.loadAttendance();
  }

  async loadAttendance(): Promise<void> {
    try {
      const record = await this.attendanceService.getAttendanceById(this.attendanceId);
      if (!record) {
        this.notify.error('Attendance record not found');
        this.router.navigate(['/attendance']);
        return;
      }
      this.attendance.set(record);
      this.form.patchValue({
        firstPunchIn: record.firstPunchIn,
        lastPunchOut: record.lastPunchOut || ''
      });
      this.updateWorkingHours();

      this.form.valueChanges.subscribe(() => this.updateWorkingHours());
    } catch (error: any) {
      this.notify.error(error.message || 'Failed to load attendance');
      this.router.navigate(['/attendance']);
    }
  }

  formatDate(): string {
    const record = this.attendance();
    if (!record) return '';
    const d = new Date(record.date);
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  updateWorkingHours(): void {
    const inTime = this.form.get('firstPunchIn')?.value;
    const outTime = this.form.get('lastPunchOut')?.value;

    if (inTime && outTime) {
      const [inH, inM] = inTime.split(':').map(Number);
      const [outH, outM] = outTime.split(':').map(Number);
      const diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
      if (diffMinutes >= 0) {
        const h = Math.floor(diffMinutes / 60);
        const m = diffMinutes % 60;
        this.calculatedWorkingHours.set(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      } else {
        this.calculatedWorkingHours.set('Invalid');
      }
    } else {
      this.calculatedWorkingHours.set('--:--');
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    this.saving.set(true);
    try {
      const { firstPunchIn, lastPunchOut } = this.form.value;
      const [inH, inM] = firstPunchIn.split(':').map(Number);

      let workingMinutes = 0;
      let status: 'working' | 'completed' = 'working';

      if (lastPunchOut) {
        const [outH, outM] = lastPunchOut.split(':').map(Number);
        workingMinutes = (outH * 60 + outM) - (inH * 60 + inM);
        if (workingMinutes < 0) workingMinutes = 0;
        status = 'completed';
      }

      await this.attendanceService.updateAttendance(this.attendanceId, {
        firstPunchIn,
        lastPunchOut: lastPunchOut || null,
        workingMinutes,
        status
      });

      this.notify.success('Attendance updated successfully');
      this.router.navigate(['/attendance']);
    } catch (error: any) {
      this.notify.error(error.message || 'Failed to update attendance');
    } finally {
      this.saving.set(false);
    }
  }
}