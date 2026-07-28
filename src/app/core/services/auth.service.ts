import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { User, AuthError } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  currentUser = signal<User | null>(null);
  currentUser$: Observable<User | null>;
  isAuthenticated = signal(false);
  loading = signal(true);

  private currentUserSubject = new BehaviorSubject<User | null>(null);

  constructor() {
    this.currentUser$ = this.currentUserSubject.asObservable();
    this.initSession();
  }

  private async initSession(): Promise<void> {
    const session = await this.supabase.getCurrentSession();
    if (session?.user) {
      this.currentUser.set(session.user);
      this.currentUserSubject.next(session.user);
      this.isAuthenticated.set(true);
    }

    this.supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        this.currentUser.set(session.user);
        this.currentUserSubject.next(session.user);
        this.isAuthenticated.set(true);
      } else {
        this.currentUser.set(null);
        this.currentUserSubject.next(null);
        this.isAuthenticated.set(false);
      }
      this.loading.set(false);
    });

    this.loading.set(false);
  }

  async signUp(email: string, password: string): Promise<{ error: AuthError | null; needsVerification?: boolean }> {
    const { data, error } = await this.supabase.auth.signUp({ email, password });

    if (error) {
      return { error };
    }

    if (data.session) {
      this.router.navigate(['/dashboard']);
      return { error: null };
    }

    return { error: null, needsVerification: true };
  }

  async signIn(email: string, password: string): Promise<{ error: AuthError | null }> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      this.router.navigate(['/dashboard']);
    }
    return { error };
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    this.currentUser.set(null);
    this.currentUserSubject.next(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    return { error };
  }

  async getSession() {
    return this.supabase.getCurrentSession();
  }
}
