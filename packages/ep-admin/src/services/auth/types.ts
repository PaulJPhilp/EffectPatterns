export interface StoredHash {
  readonly salt: string;
  readonly hash: string;
  readonly iterations: number;
  readonly digest: "sha256";
}

export interface AuthConfig {
  readonly version: 1;
  readonly username: string;
  readonly passphrase: StoredHash;
  readonly serviceToken?: StoredHash;
  readonly createdAt: string;
}

export interface AuthSession {
  readonly username: string;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface AuthStatus {
  readonly initialized: boolean;
  readonly expectedUser?: string;
  readonly currentUser: string;
  readonly loggedIn: boolean;
  readonly expiresAt?: string;
  readonly reason?: "not_initialized" | "not_logged_in" | "expired" | "wrong_user";
}

export interface InitializeOptions {
  readonly passphrase: string;
  readonly serviceToken?: string;
  readonly force?: boolean;
}

export interface AuthorizationResult {
  readonly mode: "session" | "service_token";
  readonly username: string;
}
