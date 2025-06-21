import type { ConfidenceLevel } from '@athro/shared-types';

const STORAGE_KEY = 'athro_workspace_confidence_levels';

class WorkspaceService {
  private static instance: WorkspaceService;
  private confidenceLevels: Record<string, ConfidenceLevel> = {};
  private listeners: Map<string, Set<(levels: Record<string, ConfidenceLevel>) => void>> = new Map();

  private constructor() {
    this.loadConfidenceLevels();
  }

  public static getInstance(): WorkspaceService {
    if (!WorkspaceService.instance) {
      WorkspaceService.instance = new WorkspaceService();
    }
    return WorkspaceService.instance;
  }

  private loadConfidenceLevels(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const raw = JSON.parse(stored);
        // Convert old numeric values to string values
        Object.entries(raw).forEach(([id, val]) => {
          if (typeof val === 'number') {
            if (val >= 8) this.confidenceLevels[id] = 'HIGH';
            else if (val >= 4) this.confidenceLevels[id] = 'MEDIUM';
            else this.confidenceLevels[id] = 'LOW';
          } else if (val === 'HIGH' || val === 'MEDIUM' || val === 'LOW') {
            this.confidenceLevels[id] = val;
          }
        });
      }
    } catch (e) {
      console.error('Error loading confidence levels:', e);
    }
  }

  public getConfidenceLevels(): Record<string, ConfidenceLevel> {
    return { ...this.confidenceLevels };
  }

  public broadcastConfidenceUpdate(athroId: string, level: ConfidenceLevel): void {
    this.confidenceLevels[athroId] = level;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.confidenceLevels));
    this.notifyListeners(level);
  }

  public subscribeToConfidenceUpdates(
    appId: string,
    callback: (levels: Record<string, ConfidenceLevel>) => void
  ): string {
    const subscriptionId = `${appId}_${Date.now()}`;
    if (!this.listeners.has(subscriptionId)) {
      this.listeners.set(subscriptionId, new Set());
    }
    this.listeners.get(subscriptionId)?.add(callback);
    return subscriptionId;
  }

  public unsubscribeFromConfidenceUpdates(subscriptionId: string): void {
    this.listeners.delete(subscriptionId);
  }

  private notifyListeners(level: ConfidenceLevel): void {
    this.listeners.forEach((callbacks) => {
      callbacks.forEach((callback) => callback(this.confidenceLevels));
    });
  }
}

export const workspaceService = WorkspaceService.getInstance();
export type { ConfidenceLevel }; 