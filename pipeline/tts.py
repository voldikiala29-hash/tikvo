#!/usr/bin/env python3
"""Synthèse vocale : Edge TTS (timings de mot) ou gTTS (secours, sans timings).

Écrit l'audio MP3 et les événements de timing (mot ou phrase) en JSON.
Sortie : code 0 si l'audio est généré, sinon code 1 avec le message sur stderr.
"""
import argparse
import asyncio
import json
import sys

GTTS_LANG = "fr"


async def synthesize(text: str, voice: str, rate: str, pitch: str, boundary: str):
    import edge_tts

    try:
        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary=boundary)
    except TypeError:
        # Anciennes versions d'edge-tts : pas de "pitch" ni de "boundary".
        try:
            communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        except TypeError:
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


def synthesize_gtts(text: str, audio_out: str) -> bytes:
    """Repli : Google Text-to-Speech (sans sous-titres au mot près, la durée est répartie sur le texte)."""
    from gtts import gTTS

    gTTS(text=text, lang=GTTS_LANG, slow=False).save(audio_out)
    with open(audio_out, "rb") as handle:
        return handle.read()


async def synthesize_edge_all(text: str, voice: str, rate: str, pitch: str):
    audio, events = await synthesize(text, voice, rate, pitch, "WordBoundary")
    kind = "word"
    if audio and not events:
        # Certaines voix n'émettent que des limites de phrases.
        audio, events = await synthesize(text, voice, rate, pitch, "SentenceBoundary")
        kind = "sentence"
    if not audio:
        raise RuntimeError("Edge TTS n'a renvoyé aucun audio")
    if not events:
        kind = "none"
    return audio, events, kind


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--engine", default="edge", choices=["edge", "gtts"])
    parser.add_argument("--voice", required=True)
    parser.add_argument("--rate", default="+6%")
    parser.add_argument("--pitch", default="+0Hz")
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
    if args.engine == "gtts":
        # Chemin de secours direct (voix Workers AI indisponible) : pas d'appel à Edge TTS.
        audio = synthesize_gtts(text, args.audio_out)
        events, kind, engine = [], "none", "gtts"
    else:
        # Edge TTS seul : en cas de refus (403) ou d'erreur, on sort en code 1 et c'est le rendu
        # qui choisit le repli (MeloTTS puis gTTS). Pas de bascule silencieuse ici.
        audio, events, kind = await synthesize_edge_all(text, args.voice, args.rate, args.pitch)

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
