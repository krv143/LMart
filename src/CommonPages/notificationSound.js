import notificationSoundFile from "./Bell.mp3";

/*
 * notificationSound.js
 *
 * WHY THE SOUND WASN'T PLAYING IN THE APK:
 * Mobile WebViews (like desktop mobile browsers) block audio playback
 * that isn't triggered by a direct user gesture (tap/click). Existing
 * code did:
 *
 *     new Audio(notificationSound).play().catch(() => {});
 *
 * The empty `.catch(() => {})` swallows the "NotAllowedError" that
 * happens when the sound is fired automatically (e.g. from a realtime
 * listener/poll), so it just fails silently every time.
 *
 * FIX: 
 *  1. Reuse a single pre-created <audio> element instead of creating a
 *     new one every time.
 *  2. "Unlock" it the first time the user taps anywhere in the app
 *     (a muted, near-instant play+pause), which satisfies the
 *     browser's/WebView's gesture requirement for the rest of the
 *     session, so later automatic plays are allowed.
 *  3. Log real errors instead of silently swallowing them, so future
 *     issues are visible in the console instead of invisible.
 */

let audioEl = null;
let unlocked = false;

function getAudio() {
  if (!audioEl) {
    audioEl = new Audio(notificationSoundFile);
    audioEl.preload = "auto";
  }
  return audioEl;
}

function unlockAudio() {
  if (unlocked) return;
  const audio = getAudio();
  const prevMuted = audio.muted;
  audio.muted = true;
  audio
    .play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = prevMuted;
      unlocked = true;
    })
    .catch(() => {
      // Still locked; will retry on the next user gesture.
      audio.muted = prevMuted;
    });
}

if (typeof document !== "undefined") {
  ["touchstart", "click"].forEach((evt) =>
    document.addEventListener(evt, unlockAudio, { once: false, passive: true })
  );
}

export function playNotificationSound() {
  const audio = getAudio();
  try {
    audio.currentTime = 0;
  } catch (e) {
    // ignore - some browsers throw if not yet loaded
  }
  audio.play().catch((err) => {
    console.warn(
      "Notification sound blocked (will auto-unlock after the next tap):",
      err && err.message ? err.message : err
    );
  });
}

export default playNotificationSound;
