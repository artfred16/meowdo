"use strict";

/* ============================================================
 * Meowdo — offscreen audio.
 * The reminder chime. Synthesized with the Web Audio API (no audio file shipped), so it sounds
 * the same on Windows, Linux, and macOS regardless of the OS notification sound. The service
 * worker creates this document and messages it to play; it has no DOM of its own to speak of.
 * ========================================================== */

// A short, friendly two-note "meow-ish" rising chime. Reused AudioContext across plays.
let ctx = null;

function playChime() {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    const notes = [
      { f: 784, t: 0.0, d: 0.16 },  // G5
      { f: 1047, t: 0.13, d: 0.28 } // C6
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = n.f;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = now + n.t;
      // Quick attack, smooth exponential decay — avoids clicks.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.32, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + n.d);
      osc.start(start);
      osc.stop(start + n.d + 0.02);
    }
  } catch (e) {
    // Audio is best-effort; never throw back into the worker.
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.target === "offscreen" && msg.cmd === "chime") playChime();
});
