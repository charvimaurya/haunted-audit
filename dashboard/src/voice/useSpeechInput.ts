/**
 * Push-to-talk for the Possession page (voice-agent REQ-VA-08).
 * Listens once, then hands the final text to `onText`. Never stores or plays audio.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSpeechRecognitionCtor, speechRecognitionSupported, type SpeechRecognitionLike } from './speechRecognition';

export function useSpeechInput(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const textRef = useRef('');
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => () => recRef.current?.abort(), []);

  const stop = useCallback(() => recRef.current?.stop(), []);

  const start = useCallback(() => {
    setError(null);
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError('Speech recognition is not supported in this browser. Use Edit commands to type instead.');
      return;
    }
    recRef.current?.abort();
    const rec = new Ctor();
    recRef.current = rec;
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    textRef.current = '';
    setHeard('');
    rec.onresult = (event) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0]?.transcript ?? '';
      textRef.current = text.trim();
      setHeard(textRef.current);
    };
    rec.onerror = (event) => {
      if (event.error === 'not-allowed') setError('Microphone permission denied. Use Edit commands to type instead.');
      else if (event.error !== 'aborted') setError(`Speech recognition error: ${event.error}. Use Edit commands to type instead.`);
    };
    rec.onend = () => {
      setListening(false);
      const text = textRef.current;
      textRef.current = '';
      if (text) onTextRef.current(text);
    };
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
      setError('Could not start speech recognition. Use Edit commands to type instead.');
    }
  }, []);

  return { supported: speechRecognitionSupported(), listening, heard, error, start, stop };
}
