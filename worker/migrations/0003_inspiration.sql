-- Sources d'inspiration par utilisateur (liens TikTok, YouTube, Facebook + texte collé).
CREATE TABLE IF NOT EXISTS inspiration_sources (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  url TEXT NOT NULL,
  platform TEXT NOT NULL,
  title TEXT,
  author TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  UNIQUE (uid, url)
);

-- Résumé du style extrait des sources par Llama.
CREATE TABLE IF NOT EXISTS style_briefs (
  uid TEXT PRIMARY KEY,
  brief TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
