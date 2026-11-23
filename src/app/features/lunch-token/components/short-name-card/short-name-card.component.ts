import { Component, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LunchTokenService } from '../../services/lunch-token.service';
import { escapeHtml } from '../../../../core/utils/format.utils';
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
  private destroyRef = inject(DestroyRef);

  shortNameInput = signal('');
  checkingAvailability = signal(false);
  availabilityStatus = signal<'idle' | 'available' | 'taken' | 'invalid'>('idle');
  availabilityMessage = signal('');
  private debounceTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
    });
  }

  onInputChange(val: string): void {
    this.shortNameInput.set(val);
    const trimmed = val.trim();

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    if (!trimmed) {
      this.checkingAvailability.set(false);
      this.availabilityStatus.set('idle');
      this.availabilityMessage.set('');
      return;
    }

    if (trimmed.length < 2) {
      this.checkingAvailability.set(false);
      this.availabilityStatus.set('invalid');
      this.availabilityMessage.set('Name must be at least 2 characters');
      return;
    }

    this.checkingAvailability.set(true);
    this.availabilityStatus.set('idle');

    this.debounceTimer = setTimeout(async () => {
      try {
        const available = await this.service.checkShortNameAvailable(trimmed);
        // Ensure the input hasn't changed while awaiting response
        if (this.shortNameInput().trim() !== trimmed) {
          return;
        }

        if (available) {
          this.availabilityStatus.set('available');
          this.availabilityMessage.set(`"${trimmed}" is available!`);
        } else {
          this.availabilityStatus.set('taken');
          this.availabilityMessage.set(`"${trimmed}" is already taken by another colleague.`);
        }
      } catch {
        if (this.shortNameInput().trim() === trimmed) {
          this.availabilityStatus.set('idle');
          this.availabilityMessage.set('Unable to verify name availability. Try again.');
        }
      } finally {
        if (this.shortNameInput().trim() === trimmed) {
          this.checkingAvailability.set(false);
        }
      }
    }, 400);
  }

  async onRegister(): Promise<void> {
    const raw = this.shortNameInput().trim();
    if (!raw || raw.length < 2 || this.availabilityStatus() !== 'available' || this.service.submitting()) {
      return;
    }

    const sanitized = escapeHtml(raw);

    const result = await Swal.fire({
      title: 'Confirm Short Name',
      customClass: { popup: 'swal2-confirm' },
      html: `
        <p>Are you sure you want to register <strong>"${sanitized}"</strong> as your permanent Short Name?</p>
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
