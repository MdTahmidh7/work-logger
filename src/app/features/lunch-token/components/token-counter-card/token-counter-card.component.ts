import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LunchTokenService } from '../../services/lunch-token.service';
import { format, parseISO } from 'date-fns';

@Component({
  standalone: true,
  selector: 'app-token-counter-card',
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './token-counter-card.component.html',
  styleUrls: ['./token-counter-card.component.scss'],
})
export class TokenCounterCardComponent {
  service = inject(LunchTokenService);

  formatDisplayDate(dateStr: string): string {
    return format(parseISO(dateStr), 'd MMM yyyy');
  }

  onIncrement(dateStr: string): void {
    this.service.incrementToken(dateStr);
  }

  onDecrement(dateStr: string): void {
    this.service.decrementToken(dateStr);
  }

  onRemove(dateStr: string): void {
    this.service.removeDate(dateStr);
  }

  onClearAll(): void {
    this.service.clearSelection();
  }
}
