-- Réglages de rendu par utilisateur (format, style de montage, nombre de plans).
CREATE TABLE IF NOT EXISTS user_settings (
  uid TEXT PRIMARY KEY,
  settings TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Scripts modifiés à la main ou réécrits par l'IA. Clé : programId|AAAA-MM-JJ|index.
CREATE TABLE IF NOT EXISTS script_overrides (
  uid TEXT NOT NULL,
  key TEXT NOT NULL,
  script TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (uid, key)
);
