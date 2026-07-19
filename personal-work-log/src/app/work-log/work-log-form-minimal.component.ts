import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-work-log-form-minimal',
  imports: [],
  template: `
    <div class="form-container">
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Task Title</mat-label>
            <input matInput formControlName="title" placeholder="Enter task title" maxlength="100">
            <mat-error *ngIf="hasError('title', 'required')">Title is required</mat-error>
            <mat-error *ngIf="hasError('title', 'maxlength')">Title too long (max 100 characters)</mat-error>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Duration</mat-label>
            <div class="duration-selector">
              <mat-form-field appearance="outline" class="hours-field">
                <mat-label>Hours</mat-label>
                <select matNativeControl [value]="hours()" (change)="setHours($event.target.value)">
                  <option *ngFor="let hour of getDurationHoursArray()" [value]="hour">{{ hour }}</option>
                </select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="minutes-field">
                <mat-label>Minutes</mat-label>
                <select matNativeControl [value]="minutes()" (change)="setMinutes($event.target.value)">
                  <option *ngFor="let minute of getDurationMinutesArray()" [value]="minute">{{ minute | number:'2.0-0' }}</option>
                </select>
              </mat-form-field>
            </div>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Date</mat-label>
            <input matInput [value]="form.get('date')?.value" (input)="form.patchValue({date: $event.target.value})"
                   type="date" [min]="today">
            <mat-error *ngIf="hasError('date', 'required')">Date is required</mat-error>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Details (Optional)</mat-label>
            <textarea matInput formControlName="details" placeholder="Enter task details" rows="3" maxlength="500"></textarea>
          </mat-form-field>
        </div>

        <div class="form-actions">
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || isSubmitting()">
            <span *ngIf="!isSubmitting()">Save</span>
            <span *ngIf="isSubmitting()">Saving...</span>
          </button>
          <button mat-button type="button" (click)="onReset()">Reset</button>
        </div>
      </form>

      <div class="form-preview" *ngIf="totalHours">
        <div class="duration-preview">
          <mat-icon>schedule</mat-icon>
          <span class="duration-text">{{ totalHours }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `.form-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 24px;
    }

    .form-row {
      margin-bottom: 20px;
    }

    .duration-selector {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .hours-field, .minutes-field {
      flex: 1;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    .form-preview {
      margin-top: 24px;
      padding: 16px;
      background: var(--surface-variant);
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .duration-preview {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .duration-text {
      font-size: 18px;
      font-weight: 500;
      color: var(--primary);
    }
    `
  ]
})