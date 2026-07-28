import { Injectable, signal, OnDestroy } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ResponsiveService implements OnDestroy {
  isMobile = signal(false);
  isTablet = signal(false);

  private mobileQuery = window.matchMedia('(max-width: 768px)');
  private tabletQuery = window.matchMedia('(max-width: 1024px)');

  private mobileListener = (e: MediaQueryListEvent) => {
    this.isMobile.set(e.matches);
  };

  private tabletListener = (e: MediaQueryListEvent) => {
    this.isTablet.set(e.matches);
  };

  constructor() {
    this.isMobile.set(this.mobileQuery.matches);
    this.isTablet.set(this.tabletQuery.matches);
    this.mobileQuery.addEventListener('change', this.mobileListener);
    this.tabletQuery.addEventListener('change', this.tabletListener);
  }

  ngOnDestroy(): void {
    this.mobileQuery.removeEventListener('change', this.mobileListener);
    this.tabletQuery.removeEventListener('change', this.tabletListener);
  }
}
