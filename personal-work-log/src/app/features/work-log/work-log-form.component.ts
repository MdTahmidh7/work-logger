import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatRadioModule } from '@angular/material/radio';
import { MatSliderModule } from '@angular/material/slider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { ToastrService } from 'ngx-toastr';
import { WorkLog } from '../core/models/work-log.model';
import { DatabaseService } from '../core/database/database.service';

interface DurationOption {
  label: string;
  hours: number;
  minutes: number;
  value: number;
}

@Component({
  standalone: true,
  selector: 'app-work-log-form',
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
    MatNativeDateModule,
    MatRadioModule,
    MatSliderModule,
    MatExpansionModule,
    MatDividerModule
  ],
  templateUrl: './work-log-form.html',
  styleUrls: ['./work-log-form.scss']
})
export class WorkLogFormComponent implements OnInit {
  form: FormGroup;
  workLog: WorkLog | null = null;
  isEditing = false;
  isSubmitting = false;
  showDetails = false;

  readonly durationOptions: DurationOption[] = [
    { label: 'Short (1-15 min)', hours: 0, minutes: 1, value: 1 },
    { label: 'Quick (15-30 min)', hours: 0, minutes: 15, value: 15 },
    { label: 'Half hour', hours: 0, minutes: 30, value: 30 },
    { label: '1 hour', hours: 1, minutes: 0, value: 60 },
    { label: '2 hours', hours: 2, minutes: 0, value: 120 },
    { label: '4 hours', hours: 4, minutes: 0, value: 240 },
    { label: '8 hours', hours: 8, minutes: 0, value: 480 },
    { label: 'Full day (24h)', hours: 24, minutes: 0, value: 1440 }
  ];

  get hoursControl() {
    return this.form.get('hours');
  }

  get minutesControl() {
    return this.form.get('minutes');
  }

  get durationMinutes() {
    return (this.hoursControl?.value || 0) * 60 + (this.minutesControl?.value || 0);
  }

  constructor(
    private fb: FormBuilder,
    private databaseService: DatabaseService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      details: [''],
      hours: [0, [Validators.min(0), Validators.max(24)]],
      minutes: [0, [Validators.min(0), Validators.max(59)]],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      category: ['General'],
      tags: [[] as string[]]
    });
  }

  ngOnInit(): void {
    // Initialize with default values
    this.onDurationChange();
  }

  onDurationChange(): void {
    const duration = this.durationMinutes;
    if (this.isValidDuration(duration)) {
      this.form.patchValue({ durationMinutes: duration }, { emitEvent: false });
    }
  }

  isValidDuration(duration: number): boolean {
    return duration >= 1 && duration <= 1440;
  }

  setQuickDuration(option: DurationOption): void {
    this.form.patchValue({ hours: option.hours, minutes: option.minutes });
  }

  getDurationText(): string {
    const hours = this.hoursControl?.value || 0;
    const minutes = this.minutesControl?.value || 0;

    if (hours === 0) {
      return minutes === 1 ? '1 minute' : `${minutes} minutes`;
    } else if (minutes === 0) {
      return hours === 1 ? '1 hour' : `${hours} hours`;
    } else {
      return hours === 1 ? `1 hour ${minutes} minutes` : `${hours} hours ${minutes} minutes`;
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.error('Please fill in all required fields correctly', 'Validation Error');
      return;
    }

    if (!this.isValidDuration(this.durationMinutes)) {
      this.toastr.error('Duration must be between 1 minute and 24 hours', 'Validation Error');
      return;
    }

    this.isSubmitting = true;

    try {
      const workLog: WorkLog = {
        title: this.form.value.title,
        details: this.form.value.details,
        durationMinutes: this.durationMinutes,
        date: this.form.value.date,
        createdAt: this.isEditing ? this.workLog?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (this.isEditing && this.workLog?.id) {
        await this.databaseService.updateLog(this.workLog.id, workLog);
        this.toastr.success('Work log updated successfully!', 'Success');
      } else {
        await this.databaseService.createLog(workLog);
        this.toastr.success('Work log saved successfully!', 'Success');
      }

      this.resetForm();
    } catch (error) {
      console.error('Error saving work log:', error);
      this.toastr.error('Failed to save work log. Please try again.', 'Error');
    } finally {
      this.isSubmitting = false;
    }
  }

  resetForm(): void {
    this.form.reset({
      title: '',
      details: '',
      hours: 0,
      minutes: 0,
      date: new Date().toISOString().split('T')[0],
      category: 'General',
      tags: []
    });
    this.isEditing = false;
    this.workLog = null;
    this.showDetails = false;
  }

  editWorkLog(log: WorkLog): void {
    this.workLog = log;
    this.isEditing = true;

    const hours = Math.floor(log.durationMinutes / 60);
    const minutes = log.durationMinutes % 60;

    this.form.patchValue({
      title: log.title,
      details: log.details || '',
      hours: hours,
      minutes: minutes,
      date: log.date,
      category: 'General',
      tags: []
    });

    this.showDetails = true;
  }

  deleteWorkLog(id: number): void {
    if (confirm('Are you sure you want to delete this work log? This action cannot be undone.')) {
      this.databaseService.deleteLog(id)
        .then(() => {
          this.toastr.info('Work log deleted', 'Info');
        })
        .catch(error => {
          console.error('Error deleting work log:', error);
          this.toastr.error('Failed to delete work log', 'Error');
        });
    }
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return days === 1 ? '1 day ago' : `${days} days ago`;
    }
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control?.dirty && control?.hasError(errorName));
  }
}