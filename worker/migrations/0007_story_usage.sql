-- Nombre de générations d'histoires par utilisateur et par jour (limite quotidienne).
CREATE TABLE IF NOT EXISTS story_usage (
  uid TEXT NOT NULL,
  day TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (uid, day)
);
