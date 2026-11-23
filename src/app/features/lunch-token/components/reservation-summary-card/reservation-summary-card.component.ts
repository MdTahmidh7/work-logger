import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LunchTokenService } from '../../services/lunch-token.service';
import { format, parseISO } from 'date-fns';
import Swal from 'sweetalert2';

@Component({
  standalone: true,
  selector: 'app-reservation-summary-card',
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './reservation-summary-card.component.html',
  styleUrls: ['./reservation-summary-card.component.scss']
})
export class ReservationSummaryCardComponent {
  service = inject(LunchTokenService);

  formatDisplayDate(dateStr: string): string {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  }

  async onSubmit(): Promise<void> {
    const profile = this.service.currentUserProfile();
    if (!profile) {
      await Swal.fire({
        title: 'Short Name Required',
        text: 'Please set your unique Short Name first before submitting lunch reservations.',
        icon: 'warning',
        confirmButtonColor: '#6750a4'
      });
      return;
    }

    const itemsToSubmit = this.service.selectedDateTokens().filter(i => !i.alreadyReserved);
    if (itemsToSubmit.length === 0) {
      await Swal.fire({
        title: 'No Dates Selected',
        text: 'Please select at least one working day to reserve lunch tokens.',
        icon: 'info',
        confirmButtonColor: '#6750a4'
      });
      return;
    }

    const total = this.service.totalTokens();

    // Build the summary rows for the modal
    const tableRows = itemsToSubmit.map(item => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px 12px; text-align: left; font-weight: 500;">${this.formatDisplayDate(item.date)}</td>
        <td style="padding: 8px 12px; text-align: left; color: #6b7280;">${item.dayName}</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #0d9488;">${item.count} token${item.count > 1 ? 's' : ''}</td>
      </tr>
    `).join('');

    const modalHtml = `
      <div style="text-align: left; font-size: 0.9375rem;">
        <div style="margin-bottom: 16px; padding: 10px 14px; background: #f3f4f6; border-radius: 8px;">
          <span style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 600;">Reserved By</span>
          <div style="font-size: 1.125rem; font-weight: 700; color: #111827; margin-top: 2px;">${profile.shortName}</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 0.875rem;">
          <thead>
            <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
              <th style="padding: 8px 12px; text-align: left; color: #4b5563;">Date</th>
              <th style="padding: 8px 12px; text-align: left; color: #4b5563;">Day</th>
              <th style="padding: 8px 12px; text-align: right; color: #4b5563;">Tokens</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
          <tfoot>
            <tr style="background: #f9fafb; font-weight: 700;">
              <td colspan="2" style="padding: 10px 12px; text-align: left;">Total Tokens</td>
              <td style="padding: 10px 12px; text-align: right; font-size: 1rem; color: #0d9488;">${total}</td>
            </tr>
          </tfoot>
        </table>

        <div style="padding: 12px 14px; background: #fff1f2; border-left: 4px solid #f43f5e; border-radius: 4px; font-size: 0.8125rem; color: #9f1239; line-height: 1.4;">
          <strong>Warning:</strong> Please verify your reservation carefully. Once confirmed, these reservations cannot be edited or updated.
        </div>
      </div>
    `;

    const confirmResult = await Swal.fire({
      title: 'Are You Sure?',
      html: modalHtml,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirm Reservation',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#0d9488',
      cancelButtonColor: '#6b7280',
      width: '540px'
    });

    if (confirmResult.isConfirmed) {
      await this.service.submitReservations();
    }
  }
}
