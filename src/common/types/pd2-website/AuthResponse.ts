export interface AuthData {
  accessToken: string;
  user:        User;
}

export interface User {
  _id:        string;
  email:      string;
  username:   string;
  game:       GamePrefs;
  created_at: string; // ISO 8601 timestamp
}

export interface GamePrefs {
  accounts:    string[];
  preferences: Preferences;
}

export interface Preferences {
  account:               string | null;
  stash_page:            number | null;
  public_stash_pages:    number[];
  is_hardcore:           boolean;
  is_ladder:             boolean;
  notifications_chat:    boolean;
  notifications_market:  boolean;
}
