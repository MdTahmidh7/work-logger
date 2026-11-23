import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ShortNameCardComponent } from './components/short-name-card/short-name-card.component';
import { DateSelectionCardComponent } from './components/date-selection-card/date-selection-card.component';
import { TokenCounterCardComponent } from './components/token-counter-card/token-counter-card.component';
import { ReservationSummaryCardComponent } from './components/reservation-summary-card/reservation-summary-card.component';
import { PendingPaymentCardComponent } from './components/pending-payment-card/pending-payment-card.component';
import { LunchTokenService } from './services/lunch-token.service';

@Component({
  standalone: true,
  selector: 'app-lunch-token',
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    ShortNameCardComponent,
    PendingPaymentCardComponent,
    DateSelectionCardComponent,
    TokenCounterCardComponent,
    ReservationSummaryCardComponent,
  ],
  templateUrl: './lunch-token.component.html',
  styleUrls: ['./lunch-token.component.scss'],
})
export class LunchTokenComponent implements OnInit {
  service = inject(LunchTokenService);

  async ngOnInit(): Promise<void> {
    await this.service.loadUserProfile();
  }
}

export default LunchTokenComponent;

