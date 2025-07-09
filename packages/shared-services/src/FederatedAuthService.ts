export interface AuthState {
  user: any;
  session: any;
  tier: 'free' | 'lite' | 'full';
  isAuthenticated: boolean;
}

export class FederatedAuthService {
  private static instance: FederatedAuthService;
  private authState: AuthState | null = null;
  private listeners: Set<(state: AuthState | null) => void> = new Set();

  private constructor() {}

  public static getInstance(): FederatedAuthService {
    if (!FederatedAuthService.instance) {
      FederatedAuthService.instance = new FederatedAuthService();
    }
    return FederatedAuthService.instance;
  }

  public signIn(user: any, session: any, tier: 'free' | 'lite' | 'full'): void {
    this.authState = {
      user,
      session,
      tier,
      isAuthenticated: true
    };
    this.notifyListeners();
  }

  public signOut(): void {
    this.authState = null;
    this.notifyListeners();
  }

  public signInDemo(): void {
    this.authState = {
      user: { id: 'demo-user', email: 'demo@example.com' },
      session: { demo: true },
      tier: 'free',
      isAuthenticated: true
    };
    this.notifyListeners();
  }

  public getAuthState(): AuthState | null {
    return this.authState;
  }

  public subscribe(callback: (state: AuthState | null) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.authState));
  }
} 