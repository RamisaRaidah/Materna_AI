function playMessageTTS(msgId) {
  const text = ttsMessageStore[msgId];
  if (!text) {
    toast('No voice message to play.');
    return;
  }

  // Find all play buttons to reset their state
  document.querySelectorAll('.msg-tts-btn').forEach(btn => {
    btn.innerHTML = '🔊 Listen';
    btn.classList.remove('playing');
  });

  const btn = document.querySelector(`[data-tts-id="${msgId}"]`);

  // If playing, stop it
  if (currentAudio && !currentAudio.paused && currentAudio.src.includes(encodeURIComponent(text))) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    if (btn) {
      btn.innerHTML = '🔊 Listen';
      btn.classList.remove('playing');
    }
    toast('Voice message stopped.');
    return;
  }

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  if (btn) {
    btn.innerHTML = '⏹️ Stop';
    btn.classList.add('playing');
  }

  toast('🔊 Playing TTS voice response...');

  const url = `http://localhost:5000/api/chat/tts?text=${encodeURIComponent(text)}&lang=${preferredTtsLanguage}`;
  currentAudio = new Audio(url);

  currentAudio.play().catch(err => {
    console.error("Audio playback failed:", err);
    toast('Audio playback failed.');
    if (btn) {
      btn.innerHTML = '🔊 Listen';
      btn.classList.remove('playing');
    }
  });

  currentAudio.onended = () => {
    if (btn) {
      btn.innerHTML = '🔊 Listen';
      btn.classList.remove('playing');
    }
  };
}
