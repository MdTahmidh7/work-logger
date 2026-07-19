import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private container: HTMLDivElement | null = null;

  confirm(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = 'confirm-dialog-container';
        document.body.appendChild(this.container);
      }

      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,0.4);
        z-index:10001;display:flex;align-items:center;justify-content:center;
        animation:fadeIn 0.2s ease;backdrop-filter:blur(4px);
      `;

      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background:var(--pwl-surface);border-radius:20px;padding:32px;
        max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.2);
        animation:slideUp 0.3s ease;border:1px solid var(--pwl-divider);
      `;

      dialog.innerHTML = `
        <h3 style="font-size:20px;font-weight:700;margin-bottom:12px;font-family:Inter,sans-serif;color:var(--pwl-text-primary);">${title}</h3>
        <p style="color:var(--pwl-text-secondary);font-size:15px;margin-bottom:24px;line-height:1.6;font-family:Inter,sans-serif;">${message}</p>
        <div style="display:flex;gap:12px;justify-content:flex-end;">
          <button id="cancel-btn" style="
            padding:10px 20px;border-radius:12px;border:1px solid var(--pwl-divider);
            background:transparent;font-size:14px;font-weight:600;cursor:pointer;
            font-family:Inter,sans-serif;color:var(--pwl-text-secondary);
          ">Cancel</button>
          <button id="confirm-btn" style="
            padding:10px 20px;border-radius:12px;border:none;
            background:#ff3b30;color:white;font-size:14px;font-weight:600;cursor:pointer;
            font-family:Inter,sans-serif;
          ">Delete</button>
        </div>
      `;

      overlay.appendChild(dialog);
      this.container.appendChild(overlay);

      const cancelBtn = dialog.querySelector('#cancel-btn') as HTMLButtonElement;
      const confirmBtn = dialog.querySelector('#confirm-btn') as HTMLButtonElement;

      const cleanup = () => {
        overlay.style.animation = 'fadeIn 0.2s ease reverse';
        setTimeout(() => overlay.remove(), 200);
      };

      cancelBtn.onclick = () => { cleanup(); resolve(false); };
      confirmBtn.onclick = () => { cleanup(); resolve(true); };
      overlay.onclick = (e) => { if (e.target === overlay) { cleanup(); resolve(false); } };
    });
  }
}
