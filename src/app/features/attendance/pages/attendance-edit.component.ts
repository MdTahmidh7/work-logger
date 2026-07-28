import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AttendanceService } from '../services/attendance.service';
import { Attendance } from '../models/attendance.model';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  standalone: true,
  selector: 'app-attendance-edit',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MatIconModule, MatButtonModule],
  templateUrl: './attendance-edit.component.html',
  styleUrls: ['./attendance-edit.component.scss']
})
export class AttendanceEditPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private attendanceService = inject(AttendanceService);
  private notify = inject(NotificationService);
  private confirm = inject(ConfirmDialogService);

  attendance = signal<Attendance | null>(null);
  saving = signal(false);

  form: FormGroup = this.fb.group({
    firstPunchIn: ['09:00', Validators.required],
    lastPunchOut: ['']
  });

  calculatedWorkingHours = signal('--:--');
  status = signal('Absent');
  private dateStr: string = '';

  async ngOnInit(): Promise<void> {
    this.dateStr = this.route.snapshot.paramMap.get('date') || '';
    if (!this.dateStr) {
      this.notify.error('Invalid date');
      this.router.navigate(['/attendance']);
      return;
    }
    await this.loadAttendance();
  }

  async loadAttendance(): Promise<void> {
    try {
      const record = await this.attendanceService.getAttendanceByDate(this.dateStr);
      if (record) {
        this.attendance.set(record);
        this.form.patchValue({
          firstPunchIn: record.firstPunchIn,
          lastPunchOut: record.lastPunchOut || ''
        });
      } else {
        this.form.patchValue({
          firstPunchIn: '09:00',
          lastPunchOut: ''
        });
      }
      this.updateCalculations();
      this.form.valueChanges.subscribe(() => this.updateCalculations());
    } catch (error) {
      this.notify.error(error instanceof Error ? error.message : 'Failed to load attendance');
      this.router.navigate(['/attendance']);
    }
  }

  formatDate(): string {
    if (!this.dateStr) return '';
    const d = new Date(this.dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  updateCalculations(): void {
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
        if (diffMinutes >= 420) {
          this.status.set('Present');
        } else {
          this.status.set('NFOH');
        }
      } else {
        this.calculatedWorkingHours.set('Invalid');
        this.status.set('NFOH');
      }
    } else {
      this.calculatedWorkingHours.set('--:--');
      this.status.set('Absent');
    }
  }

  getStatus(): string {
    return this.status();
  }

  getStatusIcon(): string {
    switch (this.status()) {
      case 'Present': return 'check_circle';
      case 'NFOH': return 'warning';
      default: return 'cancel';
    }
  }

  getStatusClass(): string {
    return this.status();
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    const confirmed = await this.confirm.confirmAction({
      title: 'Save Attendance',
      message: 'Are you sure you want to save these attendance changes?',
      confirmText: 'Save',
      confirmColor: '#6750a4',
      icon: 'question',
    });
    if (!confirmed) return;

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

      if (this.attendance()) {
        await this.attendanceService.updateAttendance(this.attendance()!.id!, {
          firstPunchIn,
          lastPunchOut: lastPunchOut || null,
          workingMinutes,
          status
        });
      } else {
        await this.attendanceService.createAttendance({
          date: this.dateStr,
          firstPunchIn,
          lastPunchOut: lastPunchOut || null,
          workingMinutes,
          status
        });
      }

      this.notify.success('Attendance updated successfully');
      this.router.navigate(['/attendance']);
    } catch (error) {
      this.notify.error(error instanceof Error ? error.message : 'Failed to update attendance');
    } finally {
      this.saving.set(false);
    }
  }
}