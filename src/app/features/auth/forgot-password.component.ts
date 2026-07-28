import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  standalone: true,
  selector: 'app-forgot-password',
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatInputModule, MatFormFieldModule,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./auth.styles.scss'],
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notify = inject(NotificationService);

  loading = signal(false);
  emailSent = signal(false);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);

    const { error } = await this.authService.resetPassword(this.form.value.email);

    if (error) {
      this.notify.error(error.message);
      this.loading.set(false);
      return;
    }

    this.emailSent.set(true);
    this.loading.set(false);
    this.notify.success('Password reset email sent!');
  }
}
