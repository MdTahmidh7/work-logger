import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  confirmColor?: string;
  icon?: 'warning' | 'question' | 'info' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  async confirm(title: string, message: string): Promise<boolean> {
    const result = await Swal.fire({
      title,
      text: message,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      customClass: { popup: 'swal2-confirm' },
      reverseButtons: true,
    });
    return result.isConfirmed;
  }

  async confirmAction(options: ConfirmOptions): Promise<boolean> {
    const result = await Swal.fire({
      title: options.title,
      text: options.message,
      icon: options.icon || 'warning',
      showCancelButton: true,
      confirmButtonColor: options.confirmColor || '#6750a4',
      cancelButtonColor: '#6b7280',
      confirmButtonText: options.confirmText || 'Confirm',
      cancelButtonText: 'Cancel',
      customClass: { popup: 'swal2-confirm' },
      reverseButtons: true,
    });
    return result.isConfirmed;
  }
}
