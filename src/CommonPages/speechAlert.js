/*
 * speechAlert.js
 *
 * WHY speechSynthesis DIDN'T WORK ON ANDROID (BUT DID IN A REAL BROWSER):
 * A real browser tab has speechSynthesis wired to the OS's own
 * text-to-speech engine. A plain Android WebView (the kind used by
 * no-code "website to APK" builders) is NOT wired to that engine at
 * all — calling speak() runs without error but produces no sound,
 * because there's no voice behind it. No JS-only fix can add a voice
 * engine that isn't there; this is a WebView platform limitation, not
 * a bug in the app's code.
 *
 * FIX: stop depending on the in-WebView TTS engine entirely. Instead,
 * fetch an actual spoken-word MP3 for the message from a text-to-speech
 * web service and play it with a normal <audio> element — the same
 * playback mechanism already confirmed to work for the bell sound in
 * this APK (see notificationSound.js). Audio playback isn't blocked
 * the way speechSynthesis is.
 *
 * This uses StreamElements' free public TTS endpoint (no API key,
 * widely used for this exact purpose). It's an unofficial/best-effort
 * service with no uptime guarantee — if you want a guaranteed SLA
 * later, swap ttsUrlFor() below for Azure Cognitive Services Speech
 * (you already use Azure elsewhere) using a subscription key.
 *
 * USAGE:
 *   import { speakAlert } from "./speechAlert";
 *   speakAlert("New order received from John, zip code 12345.");
 */

let audioEl = null;
let unlocked = false;

function getAudio() {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = "auto";
  }
  return audioEl;
}

function ttsUrlFor(message) {
  return `https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=${encodeURIComponent(
    message,
  )}`;
}

function unlockAudio() {
  if (unlocked) return;
  const audio = getAudio();
  const prevSrc = audio.src;
  const prevMuted = audio.muted;
  // Unlock with a tiny silent clip inside the user gesture so later
  // automatic (non-gesture) plays are allowed for the rest of the
  // session — same trick used for the bell sound.
  audio.src =
    "data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA";
  audio.muted = true;
  audio
    .play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = prevMuted;
      audio.src = prevSrc || "";
      unlocked = true;
    })
    .catch(() => {
      audio.muted = prevMuted;
      audio.src = prevSrc || "";
    });
}

if (typeof document !== "undefined") {
  ["touchstart", "click"].forEach((evt) =>
    document.addEventListener(evt, unlockAudio, { passive: true }),
  );
}

// Native speechSynthesis fallback, only used when the device is offline
// and the TTS request can't be fetched at all. `lang` (e.g. "te-IN") picks
// a matching installed voice when one is available; browsers/devices
// without a Telugu voice installed will silently fall back to the default
// voice reading the same (Telugu-script) text.
function speakWithBrowserTTS(message, lang) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1;
    utterance.pitch = 1;
    if (lang) utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  } catch {
    // no speech available at all — the bell sound and visual badge
    // still cover the notification
  }
}

// StreamElements (Amazon Polly under the hood) has no Telugu voice, so
// Telugu alerts use Google Translate's public/unofficial TTS endpoint
// instead (same "fetch a real spoken-word clip, play it as normal audio"
// approach as ttsUrlFor() above — just a different provider because this
// one supports the "te" language code). Unofficial + no uptime guarantee,
// same caveat as the English endpoint above.
function googleTranslateTtsUrlFor(message, lang) {
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(
    message,
  )}`;
}

/**
 * Speak a short voice alert out loud in Telugu. `message` should already
 * be Telugu-script text (e.g. "కొత్త టికెట్ వచ్చింది, కస్టమర్ పేరు రామ్,
 * పిన్ కోడ్ 530001."). Falls back to on-device speech synthesis (with
 * lang="te-IN") if the network request is blocked or unreachable.
 */
export function speakTeluguAlert(message) {
  const audio = getAudio();       
  audio.src = googleTranslateTtsUrlFor(message, "te");
  audio.play().catch((err) => {
    console.warn(
      "Telugu voice alert audio blocked or unreachable, falling back to on-device speech:",
      err && err.message ? err.message : err,
    );
    speakWithBrowserTTS(message, "te-IN");
  });
}

/**
 * Speak a short voice alert out loud. Fetches real spoken audio for the
 * exact message text (so customer names, zip codes, order IDs etc. all
 * come through correctly) and plays it as a normal audio clip.
 */
export function speakAlert(message) {
  const audio = getAudio();
  audio.src = ttsUrlFor(message);
  audio.play().catch((err) => {
    console.warn(
      "Voice alert audio blocked or unreachable, falling back to on-device speech:",
      err && err.message ? err.message : err,
    );
    speakWithBrowserTTS(message);
  });
}

export default speakAlert;