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
  selector: 'app-login',
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatInputModule, MatFormFieldModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./auth.styles.scss'],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  loading = signal(false);
  hidePassword = signal(true);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);

    const { email, password } = this.form.value;
    const { error } = await this.authService.signIn(email, password);

    if (error) {
      this.notify.error(error.message);
      this.loading.set(false);
      return;
    }

    this.notify.success('Welcome back!');
    this.router.navigate(['/dashboard']);
  }

  togglePasswordVisibility(): void {
    this.hidePassword.update(v => !v);
  }
}
