-- Nombre de vidéos générées par utilisateur et par jour (UTC), pour plafonner le coût.
CREATE TABLE IF NOT EXISTS video_usage (
  uid TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (uid, day)
);
