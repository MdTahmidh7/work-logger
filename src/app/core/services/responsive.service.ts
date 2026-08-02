import { Injectable, signal, OnDestroy } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ResponsiveService implements OnDestroy {
  isMobile = signal(false);

  private mobileQuery = window.matchMedia('(max-width: 768px)');

  private mobileListener = (e: MediaQueryListEvent) => {
    this.isMobile.set(e.matches);
  };

  constructor() {
    this.isMobile.set(this.mobileQuery.matches);
    this.mobileQuery.addEventListener('change', this.mobileListener);
  }

  ngOnDestroy(): void {
    this.mobileQuery.removeEventListener('change', this.mobileListener);
  }
}
