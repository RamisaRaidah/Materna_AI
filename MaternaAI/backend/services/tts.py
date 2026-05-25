# pyrefly: ignore [missing-import]
import edge_tts
import asyncio
import re

def is_bengali(text: str) -> bool:
    return bool(re.search(r"[\u0980-\u09FF]", text))

async def generate_tts_async(text: str):
    if not text:
        return
    voice = "bn-BD-NabanitaNeural" if is_bengali(text) else "en-US-JennyNeural"
    communicate = edge_tts.Communicate(text, voice)
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            yield chunk["data"]

def generate_tts_stream(text: str):
    """
    Sync generator wrapper for Flask — yields MP3 audio bytes.
    """
    async def collect():
        chunks = []
        async for chunk in generate_tts_async(text):
            chunks.append(chunk)
        return chunks

    audio_chunks = asyncio.run(collect())
    for chunk in audio_chunks:
        yield chunk
