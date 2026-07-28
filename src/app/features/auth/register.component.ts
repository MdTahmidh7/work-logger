import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatInputModule, MatFormFieldModule,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./auth.styles.scss'],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  loading = signal(false);
  hidePassword = signal(true);
  hideConfirmPassword = signal(true);
  verificationSent = signal(false);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    if (this.form.value.password !== this.form.value.confirmPassword) {
      this.notify.error('Passwords do not match');
      return;
    }

    this.loading.set(true);

    const { email, password } = this.form.value;
    const { error, needsVerification } = await this.authService.signUp(email, password);

    if (error) {
      this.notify.error(error.message);
      this.loading.set(false);
      return;
    }

    if (needsVerification) {
      this.verificationSent.set(true);
      this.loading.set(false);
      this.notify.info('Please check your email to verify your account');
      return;
    }

    this.notify.success('Account created successfully!');
    this.router.navigate(['/dashboard']);
  }

  togglePasswordVisibility(): void {
    this.hidePassword.update(v => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword.update(v => !v);
  }
}
