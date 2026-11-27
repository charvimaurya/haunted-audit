/**
 * Push-to-talk for the Possession page (voice-agent REQ-VA-08).
 * Keeps listening smoothly across natural speech pauses until the user clicks Stop
 * or stops speaking cleanly, then hands the captured transcript to `onText`.
 * Never stores or plays audio.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSpeechRecognitionCtor, speechRecognitionSupported, type SpeechRecognitionLike } from './speechRecognition';

const SILENCE_COMMIT_MS = 2200;

export function useSpeechInput(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const activeRef = useRef(false);
  const userStoppedRef = useRef(false);
  const hadSpeechRef = useRef(false);
  const retriesRef = useRef(0);
  const startedAtRef = useRef(0);
  const commitTimerRef = useRef<number | null>(null);
  const textRef = useRef('');
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const clearCommitTimer = () => {
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
  };

  useEffect(() => () => {
    activeRef.current = false;
    clearCommitTimer();
    recRef.current?.abort();
  }, []);

  const stop = useCallback(() => {
    userStoppedRef.current = true;
    activeRef.current = false;
    clearCommitTimer();
    recRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    setError(null);
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError('Speech recognition is not supported in this browser. Use Edit commands to type instead.');
      return;
    }

    clearCommitTimer();
    activeRef.current = false;
    recRef.current?.abort();

    const rec = new Ctor();
    recRef.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    textRef.current = '';
    setHeard('');
    activeRef.current = true;
    userStoppedRef.current = false;
    hadSpeechRef.current = false;
    retriesRef.current = 0;
    startedAtRef.current = Date.now();

    rec.onresult = (event) => {
      let combined = '';
      let allFinal = true;
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        combined += res[0]?.transcript ?? '';
        if (res.isFinal === false) allFinal = false;
      }
      const cleaned = combined.trim();
      if (cleaned) {
        hadSpeechRef.current = true;
        textRef.current = cleaned;
        setHeard(cleaned);
        // After final phrase, allow natural pause before auto-completing continuous capture
        clearCommitTimer();
        if (allFinal && activeRef.current) {
          commitTimerRef.current = window.setTimeout(() => {
            if (activeRef.current && recRef.current === rec) {
              userStoppedRef.current = true;
              activeRef.current = false;
              rec.stop();
            }
          }, SILENCE_COMMIT_MS);
        }
      }
    };

    rec.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        activeRef.current = false;
        userStoppedRef.current = true;
        setError('Microphone permission denied. Use Edit commands to type instead.');
        return;
      }
      // Browser drops continuous mic when silent at start: ignore transient no-speech so onend can keep listening
      if (event.error === 'no-speech' && activeRef.current && retriesRef.current < 3) {
        return;
      }
      if (event.error !== 'aborted') {
        activeRef.current = false;
        userStoppedRef.current = true;
        setError(`Speech recognition error: ${event.error}. Use Edit commands to type instead.`);
      }
    };

    rec.onend = () => {
      clearCommitTimer();
      // If browser ended abruptly before picking up real mic audio, keep session alive briefly
      const elapsed = Date.now() - startedAtRef.current;
      const shouldKeepListening =
        activeRef.current &&
        !userStoppedRef.current &&
        !hadSpeechRef.current &&
        retriesRef.current < 2 &&
        elapsed > 150;

      if (shouldKeepListening) {
        retriesRef.current += 1;
        try {
          rec.start();
          return;
        } catch {
          // Fall through cleanly if restart is rejected
        }
      }

      activeRef.current = false;
      setListening(false);
      const text = textRef.current;
      textRef.current = '';
      if (text) onTextRef.current(text);
    };

    try {
      rec.start();
      setListening(true);
    } catch {
      activeRef.current = false;
      setListening(false);
      setError('Could not start speech recognition. Use Edit commands to type instead.');
    }
  }, []);

  return { supported: speechRecognitionSupported(), listening, heard, error, start, stop };
}
