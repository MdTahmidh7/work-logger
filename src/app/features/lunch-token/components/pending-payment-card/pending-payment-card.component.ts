import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LunchTokenService } from '../../services/lunch-token.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { format, parseISO } from 'date-fns';

@Component({
  standalone: true,
  selector: 'app-pending-payment-card',
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    MatTooltipModule,
  ],
  templateUrl: './pending-payment-card.component.html',
  styleUrls: ['./pending-payment-card.component.scss'],
})
export class PendingPaymentCardComponent {
  service = inject(LunchTokenService);
  private confirmDialog = inject(ConfirmDialogService);

  selectedReservationIds = signal<number[]>([]);

  pendingList = computed(() => this.service.pendingReservations());

  allSelected = computed(() => {
    const list = this.pendingList();
    const selected = this.selectedReservationIds();
    return (
      list.length > 0 &&
      list.every((item) => item.id !== undefined && selected.includes(item.id))
    );
  });

  someSelected = computed(() => {
    const selected = this.selectedReservationIds();
    return selected.length > 0 && !this.allSelected();
  });

  selectedTokensCount = computed(() => {
    const selectedSet = new Set(this.selectedReservationIds());
    return this.pendingList()
      .filter((item) => item.id !== undefined && selectedSet.has(item.id))
      .reduce((sum, item) => sum + item.tokenCount, 0);
  });

  selectedTotalAmount = computed(() => {
    return this.selectedTokensCount() * 60;
  });

  toggleSelectAll(checked: boolean): void {
    if (checked) {
      const allIds = this.pendingList()
        .map((r) => r.id)
        .filter((id): id is number => typeof id === 'number');
      this.selectedReservationIds.set(allIds);
    } else {
      this.selectedReservationIds.set([]);
    }
  }

  toggleItemSelection(id: number | undefined): void {
    if (typeof id !== 'number') return;
    const current = this.selectedReservationIds();
    if (current.includes(id)) {
      this.selectedReservationIds.set(current.filter((itemId) => itemId !== id));
    } else {
      this.selectedReservationIds.set([...current, id]);
    }
  }

  isSelected(id: number | undefined): boolean {
    if (typeof id !== 'number') return false;
    return this.selectedReservationIds().includes(id);
  }

  formatDate(dateStr: string): string {
    try {
      return format(parseISO(dateStr), 'EEE, MMM d');
    } catch {
      return dateStr;
    }
  }

  getDayName(dateStr: string): string {
    try {
      return format(parseISO(dateStr), 'EEEE');
    } catch {
      return '';
    }
  }

  async onConfirmPayment(): Promise<void> {
    const selectedIds = this.selectedReservationIds();
    if (selectedIds.length === 0) return;

    const tokens = this.selectedTokensCount();
    const amount = this.selectedTotalAmount();

    const confirmed = await this.confirmDialog.confirmAction({
      title: 'Confirm Payment',
      message: `Are you sure you have completed the payment of ${amount} TK for ${tokens} lunch token(s)?`,
      icon: 'question',
      confirmText: `Yes, Paid ${amount} TK`,
      confirmColor: '#0d9488',
      cancelButtonText: 'Cancel',
    });

    if (confirmed) {
      const success = await this.service.markReservationsAsPaid(selectedIds);
      if (success) {
        this.selectedReservationIds.set([]);
      }
    }
  }
}
