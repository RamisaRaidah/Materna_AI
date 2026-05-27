# pyrefly: ignore [missing-import]
import edge_tts
import asyncio
import re

def is_bengali(text: str) -> bool:
    if not text:
        return False
    # 1. Native Bangla script characters — definitive signal
    if re.search(r"[\u0980-\u09FF]", text):
        return True
    
    # 2. Banglish detection (Bangla phonetically written in English alphabet)
    # IMPORTANT: Only include keywords that are UNIQUELY Banglish and would NEVER
    # appear in a normal English sentence. Short/ambiguous words like "to", "na",
    # "ha", "ma", "pet", "mon", "bon", "vomit" have been intentionally removed.
    banglish_keywords = [
        # Pronouns — very distinctive
        "ami", "amr", "amar", "aamar", "amra",
        "apni", "apnr", "apnar", "apnara",
        "tumi", "tomar", "tui", "tomra",
        # Question words — distinctive phonetics
        "keno", "kothay", "kothai", "kokhon", "kibhabe", "kivabe", "kemne", "kmne",
        "ki korbo", "kemon", "kemoi",
        # Conjunctions / particles — distinctive enough
        "kintu", "ebong", "athoba",
        # Feelings / greetings — safe multi-syllable Banglish
        "betha", "byatha", "batha",
        "bhalo", "bhala", "valo",
        "ache", "achen", "asen",
        "asundor", "shundor",
        "matha", "ghuraitse", "ghuracche",
        # Verbs — very distinctive Banglish phonetics
        "hobe", "khabo", "khaite", "khaitese", "khamu",
        "ashche", "aschhe", "hacche", "hoye",
        "kora", "korbo", "korben", "koren", "koro", "koris",
        "korche", "korse", "korsen", "korchen", "koira",
        "hoise", "hoyse", "hoiyeche", "hoyeche",
        "giyese", "geche", "gese",
        "dorkar", "proyojon", "lagbe",
        "bolen", "bolben", "bujhte", "parchi", "parsi",
        "janen", "shunben", "onek", "khub",
        "shomossa", "somossa", "bujhi", "jani",
        # Family / maternal — safe multi-syllable terms
        "baccha", "bacha", "bachha", "shishu", "sishu",
        "gorbho", "gorvoboti",
        "maa", "baba", "shami", "sami",
        "daktar", "dakter", "apu",
        "nani", "dadi", "bhaia", "bhaiya", "bhai",
        # Mental / emotional — distinctive
        "chinta", "bhoy", "kosto", "kharap",
        "kanna", "hashi", "ghum", "khide", "khida",
        # Health / danger — distinctive Banglish
        "rokto", "rokto-khoron", "srab", "jhor",
        "kashi", "shash",
    ]
    
    lower_text = text.lower()
    match_count = 0
    for word in banglish_keywords:
        if re.search(r'\b' + re.escape(word) + r'\b', lower_text):
            match_count += 1
            # Require at least 2 keyword matches for short texts,
            # or 1 match if the keyword is a multi-word phrase (more specific)
            if match_count >= 2 or ' ' in word:
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
