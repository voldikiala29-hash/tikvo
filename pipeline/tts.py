#!/usr/bin/env python3
"""Synthèse vocale réelle avec Edge TTS (gratuit, sans clé).

Écrit l'audio MP3 et les événements de timing (mot ou phrase) en JSON.
Sortie : code 0 si l'audio est généré, sinon code 1 avec le message sur stderr.
"""
import argparse
import asyncio
import json
import sys

import edge_tts

GTTS_LANG = "fr"


async def synthesize(text: str, voice: str, rate: str, boundary: str):
    try:
        communicate = edge_tts.Communicate(text, voice, rate=rate, boundary=boundary)
    except TypeError:
        # Anciennes versions d'edge-tts : pas de paramètre "boundary".
        communicate = edge_tts.Communicate(text, voice, rate=rate)

    audio = bytearray()
    events = []
    async for chunk in communicate.stream():
        kind = chunk["type"]
        if kind == "audio":
            audio.extend(chunk["data"])
        elif kind in ("WordBoundary", "SentenceBoundary"):
            # offset et duration sont en unités de 100 ns.
            events.append(
                {
                    "offsetSec": chunk["offset"] / 10_000_000,
                    "durationSec": chunk["duration"] / 10_000_000,
                    "text": chunk["text"],
                }
            )
    return bytes(audio), events


def is_edge_blocked(exc: Exception) -> bool:
    """Vrai quand Microsoft refuse le jeton (403) ou ne renvoie rien : seul cas où on bascule sur gTTS."""
    text = f"{type(exc).__name__} {exc}"
    return "403" in text or "Invalid response" in text or "NoAudioReceived" in text


def synthesize_gtts(text: str, audio_out: str) -> bytes:
    """Repli : Google Text-to-Speech (sans sous-titres au mot près, la durée est répartie sur le texte)."""
    from gtts import gTTS

    gTTS(text=text, lang=GTTS_LANG, slow=False).save(audio_out)
    with open(audio_out, "rb") as handle:
        return handle.read()


async def synthesize_edge_all(text: str, voice: str, rate: str):
    audio, events = await synthesize(text, voice, rate, "WordBoundary")
    kind = "word"
    if audio and not events:
        # Certaines voix n'émettent que des limites de phrases.
        audio, events = await synthesize(text, voice, rate, "SentenceBoundary")
        kind = "sentence"
    if not audio:
        raise RuntimeError("Edge TTS n'a renvoyé aucun audio")
    if not events:
        kind = "none"
    return audio, events, kind


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--voice", required=True)
    parser.add_argument("--rate", default="+6%")
    parser.add_argument("--text-file", required=True)
    parser.add_argument("--audio-out", required=True)
    parser.add_argument("--events-out", required=True)
    args = parser.parse_args()

    with open(args.text_file, encoding="utf-8") as handle:
        text = handle.read().strip()
    if not text:
        print("Texte vide", file=sys.stderr)
        return 1

    engine = "edge"
    try:
        audio, events, kind = await synthesize_edge_all(text, args.voice, args.rate)
    except Exception as exc:  # noqa: BLE001
        if not is_edge_blocked(exc):
            raise
        print(f"Edge TTS 403 ({exc}) : Edge TTS fallback gTTS", file=sys.stderr)
        audio = synthesize_gtts(text, args.audio_out)
        events, kind, engine = [], "none", "gtts"

    with open(args.audio_out, "wb") as handle:
        handle.write(audio)
    with open(args.events_out, "w", encoding="utf-8") as handle:
        json.dump({"kind": kind, "events": events, "engine": engine}, handle, ensure_ascii=False)
    print(json.dumps({"engine": engine, "kind": kind, "events": len(events), "bytes": len(audio)}))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(asyncio.run(main()))
    except Exception as exc:  # noqa: BLE001
        print(f"Synthèse vocale échouée : {exc}", file=sys.stderr)
        sys.exit(1)
