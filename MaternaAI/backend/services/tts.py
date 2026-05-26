# pyrefly: ignore [missing-import]
import edge_tts
import asyncio
import re

def is_bengali(text: str) -> bool:
    if not text:
        return False
    # 1. Native Bangla script characters
    if re.search(r"[\u0980-\u09FF]", text):
        return True
    
    # 2. Banglish detection (Bangla words written in English alphabet)
    # Common Banglish phonetic words/patterns
    banglish_keywords = [
        # Greetings & feelings
        "ki korbo", "amar", "aamar", "betha", "byatha", "kore", "korche", "kemoi", "kemon", "bhalo", "bhala",
        "ache", "achen", "asundor", "shundor", "sundor", "matha", "ghuraitse", "ghuracche", "pet", "pete",
        # Common particles & verbs
        "hobe", "hobe na", "khabo", "khaite", "khaitese", "ashche", "aschhe", "hacche", "hoy", "hoye", "kora",
        # Safety & maternal terms
        "baccha", "bacha", "bachha", "shishu", "sishu", "gorbho", "gorvoboti", "ma", "maa", "baba",
        "shami", "sami", "daktar", "dakter", "apa", "apu", "bon", "nani", "dadi"
    ]
    
    lower_text = text.lower()
    for word in banglish_keywords:
        # Match word boundaries to prevent matching subsets of English words
        if re.search(r'\b' + re.escape(word) + r'\b', lower_text):
            return True
            
    return False

async def generate_tts_async(text: str, lang: str = None):
    if not text:
        return
    # lang override: 'bn' => Bangla voice, 'en' => English voice, None => auto-detect
    if lang == 'bn':
        voice = "bn-BD-NabanitaNeural"
    elif lang == 'en':
        voice = "en-US-JennyNeural"
    else:
        voice = "bn-BD-NabanitaNeural" if is_bengali(text) else "en-US-JennyNeural"
    communicate = edge_tts.Communicate(text, voice)
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            yield chunk["data"]

def generate_tts_stream(text: str, lang: str = None):
    """
    Sync generator wrapper for Flask — yields MP3 audio bytes.
    lang: 'bn' for Bangla, 'en' for English, None for auto-detect from text.
    Handles running event loops safely to prevent Flask exceptions.
    """
    async def collect():
        chunks = []
        async for chunk in generate_tts_async(text, lang=lang):
            chunks.append(chunk)
        return chunks

    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    if loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(asyncio.run, collect())
            audio_chunks = future.result()
    else:
        audio_chunks = loop.run_until_complete(collect())

    for chunk in audio_chunks:
        yield chunk
