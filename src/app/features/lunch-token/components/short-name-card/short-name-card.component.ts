import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LunchTokenService } from '../../services/lunch-token.service';
import Swal from 'sweetalert2';

@Component({
  standalone: true,
  selector: 'app-short-name-card',
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './short-name-card.component.html',
  styleUrls: ['./short-name-card.component.scss']
})
export class ShortNameCardComponent {
  service = inject(LunchTokenService);

  shortNameInput = signal('');
  checkingAvailability = signal(false);
  availabilityStatus = signal<'idle' | 'available' | 'taken' | 'invalid'>('idle');
  availabilityMessage = signal('');
  private debounceTimer?: ReturnType<typeof setTimeout>;

  onInputChange(val: string): void {
    this.shortNameInput.set(val);
    const trimmed = val.trim();

    if (!trimmed) {
      this.availabilityStatus.set('idle');
      this.availabilityMessage.set('');
      return;
    }

    if (trimmed.length < 2) {
      this.availabilityStatus.set('invalid');
      this.availabilityMessage.set('Name must be at least 2 characters');
      return;
    }

    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.checkingAvailability.set(true);
    this.availabilityStatus.set('idle');

    this.debounceTimer = setTimeout(async () => {
      try {
        const available = await this.service.checkShortNameAvailable(trimmed);
        if (available) {
          this.availabilityStatus.set('available');
          this.availabilityMessage.set(`"${trimmed}" is available!`);
        } else {
          this.availabilityStatus.set('taken');
          this.availabilityMessage.set(`"${trimmed}" is already taken by another colleague.`);
        }
      } catch {
        this.availabilityStatus.set('idle');
      } finally {
        this.checkingAvailability.set(false);
      }
    }, 400);
  }

  async onRegister(): Promise<void> {
    const raw = this.shortNameInput().trim();
    if (!raw) return;

    if (this.availabilityStatus() === 'taken') {
      return;
    }

    const result = await Swal.fire({
      title: 'Confirm Short Name',
      html: `
        <p>Are you sure you want to register <strong>"${raw}"</strong> as your permanent Short Name?</p>
        <p style="font-size: 0.875rem; color: #e11d48; margin-top: 8px;">
          <strong>Notice:</strong> This identifier cannot be changed or edited once registered.
        </p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Register',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#6750a4',
      cancelButtonColor: '#6b7280'
    });

    if (result.isConfirmed) {
      try {
        await this.service.registerShortName(raw);
      } catch {
        // error notification handled inside service
      }
    }
  }
}
