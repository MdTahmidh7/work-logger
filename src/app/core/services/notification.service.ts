import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private container: HTMLDivElement | null = null;

  private ensureContainer(): HTMLDivElement {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.style.cssText = 'position:fixed;top:80px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = 3000): void {
    const container = this.ensureContainer();

    const colors: Record<string, string> = {
      success: '#34c759',
      error: '#ff3b30',
      info: '#007aff',
      warning: '#ff9500'
    };

    const icons: Record<string, string> = {
      success: 'check_circle',
      error: 'error',
      info: 'info',
      warning: 'warning'
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
      display:flex;align-items:center;gap:10px;
      padding:14px 20px;border-radius:12px;
      background:${colors[type]};color:white;
      font-size:14px;font-weight:500;
      box-shadow:0 4px 20px rgba(0,0,0,0.15);
      animation:slideInRight 0.3s ease;
      max-width:400px;word-wrap:break-word;
      font-family:'Inter',sans-serif;
    `;

    toast.innerHTML = `
      <span class="material-icons" style="font-size:20px;">${icons[type]}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  warning(message: string): void {
    this.show(message, 'warning');
  }
}
