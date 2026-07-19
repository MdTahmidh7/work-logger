import { Component, inject, signal, computed, effect } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { WorkLog } from '../../models/work-log.model';
import { DatabaseService } from '../../services/database.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

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
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './work-log-form.component.html',
  styleUrls: ['./work-log-form.component.scss']
})
export class WorkLogFormComponent {
  form!: FormGroup;
  isSubmitting = signal(false);
  hasChanges = signal(false);

  workLog = input<Partial<WorkLog> | null>(null);
  mode = input<'create' | 'edit'>('create');
  isEditing = input(false);

  submit = output<WorkLog>();
  cancel = output<void>();
  formChange = output<void>();

  private fb = inject(FormBuilder);
  private databaseService = inject(DatabaseService);

  constructor() {
    this.initializeForm();

    effect(() => {
      if (this.workLog()) {
        this.patchForm(this.workLog()!);
      }
      this.checkForChanges();
    });
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      details: [''],
      durationMinutes: [1, [Validators.required, Validators.min(1), Validators.max(1440)]],
      date: [new Date().toISOString().split('T')[0], Validators.required]
    });

    this.form.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.formChange.emit();
    });
  }

  private patchForm(log: Partial<WorkLog>): void {
    this.form.patchValue({
      title: log.title,
      details: log.details,
      durationMinutes: log.durationMinutes,
      date: log.date
    });
  }

  onDurationChange(value: any): void {
    const minutes = parseInt(value) || 0;
    this.form.patchValue({ durationMinutes: minutes }, { emitEvent: false });
  }

  hours(): number {
    return Math.floor(this.form.get('durationMinutes')?.value / 60) || 0;
  }

  minutes(): number {
    return this.form.get('durationMinutes')?.value % 60 || 0;
  }

  setHours(hours: number): void {
    const currentMinutes = this.form.get('durationMinutes')?.value || 0;
    const minutes = currentMinutes % 60;
    this.form.patchValue({ durationMinutes: hours * 60 + minutes }, { emitEvent: false });
  }

  setMinutes(minutes: number): void {
    const currentMinutes = this.form.get('durationMinutes')?.value || 0;
    const hours = Math.floor(currentMinutes / 60);
    this.form.patchValue({ durationMinutes: hours * 60 + minutes }, { emitEvent: false });
  }

  private checkForChanges(): void {
    if (this.workLog()) {
      const formValue = this.form.value;
      const originalValue = this.workLog();

      this.hasChanges.set(
        formValue.title !== originalValue.title ||
        formValue.details !== originalValue.details ||
        formValue.durationMinutes !== originalValue.durationMinutes ||
        formValue.date !== originalValue.date
      );
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    try {
      const workLog: WorkLog = {
        ...this.form.value as WorkLog,
        id: this.mode() === 'edit' ? this.workLog()?.id : undefined,
        createdAt: this.isEditing() ? this.workLog()?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (this.isEditing()) {
        await this.databaseService.updateLog(workLog.id!, workLog);
      } else {
        await this.databaseService.createLog(workLog);
      }

      this.form.reset();
      this.hasChanges.set(false);
      this.submit.emit(workLog);
    } catch (error) {
      console.error('Error saving work log:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onReset(): void {
    this.form.reset();
    this.hasChanges.set(false);
    this.cancel.emit();
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control?.dirty && control?.hasError(errorName));
  }

  getDurationHoursArray(): number[] {
    return Array.from({ length: 24 }, (_, i) => i);
  }

  getDurationMinutesArray(): number[] {
    return Array.from({ length: 60 }, (_, i) => i);
  }

  get totalHours(): string {
    const duration = this.form.get('durationMinutes')?.value || 0;
    return `${Math.floor(duration / 60)}h ${duration % 60}m`;
  }
}