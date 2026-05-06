"""
NEXUS TTS Worker — Edge Neural Voice Engine
============================================
Accepts a text string via CLI argument, synthesizes speech using
Microsoft Edge Neural TTS, plays it immediately via pygame, and
cleans up the temp audio file.

Usage:  python tts_worker.py "Hello from NEXUS"
"""

import sys
import asyncio
import edge_tts
import pygame
import os
import uuid
import time

# ── Voice Configuration ──────────────────────────────────────────
# Male  : en-US-ChristopherNeural, en-US-GuyNeural
# Female: en-US-AriaNeural, en-US-JennyNeural
VOICE = "en-US-ChristopherNeural"
RATE = "+5%"       # Speech speed adjustment
VOLUME = "+0%"     # Volume adjustment


async def speak(text: str) -> None:
    """Generate and play TTS audio for the given text."""
    # Unique filename prevents race conditions with parallel calls
    output_file = f"nexus_tts_{uuid.uuid4().hex[:8]}.mp3"

    try:
        # 1. Generate audio via Edge TTS
        communicate = edge_tts.Communicate(text, VOICE, rate=RATE, volume=VOLUME)
        await communicate.save(output_file)

        # 2. Initialize pygame mixer and play
        pygame.mixer.init(frequency=24000)
        pygame.mixer.music.load(output_file)
        pygame.mixer.music.play()

        # 3. Block until playback completes
        clock = pygame.time.Clock()
        while pygame.mixer.music.get_busy():
            clock.tick(10)

    except Exception as e:
        print(f"[TTS ERROR] {e}", file=sys.stderr)

    finally:
        # 4. Clean up resources
        try:
            pygame.mixer.music.stop()
            pygame.mixer.quit()
        except Exception:
            pass

        # Small delay to release file handle on Windows
        time.sleep(0.1)

        if os.path.exists(output_file):
            try:
                os.remove(output_file)
            except OSError:
                pass  # File locked — will be cleaned up later


if __name__ == "__main__":
    if len(sys.argv) > 1:
        text_input = " ".join(sys.argv[1:])
        asyncio.run(speak(text_input))
    else:
        print("Error: No text provided to NEXUS Voice Worker.", file=sys.stderr)
        sys.exit(1)