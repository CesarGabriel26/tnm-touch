import { computed, Injectable, OnDestroy, signal } from '@angular/core';
import { StorageService } from './storage.service';

/** Pedido pendente há mais que este tempo bloqueia o app. */
const PENDING_LIMIT_MS = 3 * 60 * 1000; // 3 minutos

/** Frequência da verificação da fila. */
const CHECK_INTERVAL_MS = 15 * 1000; // a cada 15 segundos

@Injectable({
  providedIn: 'root',
})
export class OfflineLimitService implements OnDestroy {
  /**
   * Timestamp (epoch ms) do pedido pendente mais antigo na fila.
   * null = sem pedidos pendentes não-enviados.
   */
  private readonly oldestPendingAt = signal<number | null>(null);

  /**
   * true quando existe pedido pendente na fila há mais de PENDING_LIMIT_MS.
   */
  readonly isBlocked = computed(() => {
    const oldest = this.oldestPendingAt();
    if (oldest === null) return false;
    return Date.now() - oldest > PENDING_LIMIT_MS;
  });

  /** Minutos desde que o pedido pendente mais antigo foi criado. */
  readonly minutesSinceSync = computed(() => {
    const oldest = this.oldestPendingAt();
    if (oldest === null) return 0;
    return Math.floor((Date.now() - oldest) / 60_000);
  });

  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly storageService: StorageService) {}

  /** Inicia a verificação periódica da fila (idempotente). */
  start(): void {
    if (this.intervalId !== null) return;

    // Verifica imediatamente ao iniciar
    void this.checkQueue();

    this.intervalId = setInterval(() => void this.checkQueue(), CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId === null) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  ngOnDestroy(): void {
    this.stop();
  }

  /**
   * Consulta a fila e atualiza `oldestPendingAt` com o `createdAt`
   * do pedido não-enviado mais antigo.
   *
   * Fluxo:
   *  - Pedido criado → vai para a fila (status: pending)
   *  - Sync tenta enviar mas não acha servidor → permanece pending/failed
   *  - Após 3 min sem conseguir enviar → isBlocked = true
   *  - Quando o servidor volta, sync envia e remove da fila → isBlocked = false
   */
  async checkQueue(): Promise<void> {
    try {
      const [pending, processing, failed] = await Promise.all([
        this.storageService.getQueuedOrders('pending'),
        this.storageService.getQueuedOrders('processing'),
        this.storageService.getQueuedOrders('failed'),
      ]);

      const all = [...pending, ...processing, ...failed];

      if (all.length === 0) {
        this.oldestPendingAt.set(null);
        return;
      }

      const oldestMs = Math.min(
        ...all.map((o) => new Date(o.createdAt).getTime())
      );

      this.oldestPendingAt.set(oldestMs);
    } catch {
      // Não altera o estado em caso de erro de leitura do IndexedDB
    }
  }
}
