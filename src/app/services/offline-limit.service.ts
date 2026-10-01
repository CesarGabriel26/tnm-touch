import { computed, Injectable, OnDestroy, signal } from '@angular/core';

const STORAGE_KEY = '@lastSyncAt';
const OFFLINE_LIMIT_MS = 3 * 60 * 1000; // 30 minutes
const CHECK_INTERVAL_MS = 30 * 1000;     // check every 30 seconds

@Injectable({
  providedIn: 'root',
})
export class OfflineLimitService implements OnDestroy {
  private readonly lastSyncAt = signal<number | null>(this.readStoredLastSync());

  readonly isBlocked = computed(() => {
    const last = this.lastSyncAt();
    if (last === null) return false;
    return Date.now() - last > OFFLINE_LIMIT_MS;
  });

  readonly minutesSinceSync = computed(() => {
    const last = this.lastSyncAt();
    if (last === null) return 0;
    return Math.floor((Date.now() - last) / 60_000);
  });

  private intervalId: ReturnType<typeof setInterval> | null = null;

  recordSync(): void {
    const now = Date.now();
    this.lastSyncAt.set(now);
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch { /* ignore  errors */ }
  }

  start(): void {
    if (this.intervalId !== null) return;

    this.intervalId = setInterval(() => {
      const stored = this.readStoredLastSync();
      this.lastSyncAt.set(stored);
    }, CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId === null) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private readStoredLastSync(): number | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return isNaN(parsed) ? null : parsed;
  }
}
