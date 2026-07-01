import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../utils/api';
import { Mic, MicOff, AlertCircle, Sparkles, Check, RotateCcw } from 'lucide-react';

interface VoiceAssistantProps {
  onSuccess: () => void;
}

interface ParsedVoiceEvent {
  title?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  confidence: number;
  missingInfo: string[];
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onSuccess }) => {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('点击麦克风开始语音创建日程...');
  
  // Conversation transcripts history
  const [fullTranscript, setFullTranscript] = useState('');
  const [currentSegment, setCurrentSegment] = useState('');
  
  // Extracted result
  const [parsedResult, setParsedResult] = useState<ParsedVoiceEvent | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Editable preview states
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewStart, setPreviewStart] = useState('');
  const [previewEnd, setPreviewEnd] = useState('');
  const [previewLocation, setPreviewLocation] = useState('');

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setError('');
      setStatusMessage('Listening... Please speak.');
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setError(`Speech recognition failed: ${event.error}`);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript;
      setCurrentSegment(resultText);
      setStatusMessage(`Recognized: "${resultText}"`);
    };

    recognitionRef.current = recognition;
  }, []);

  // Process transcription whenever we get a new result segment
  useEffect(() => {
    if (!currentSegment) return;

    const processSpeech = async () => {
      setLoading(true);
      setError('');
      
      // Concatenate new speech segment to full conversation history
      const updatedTranscript = fullTranscript 
        ? `${fullTranscript} ${currentSegment}` 
        : currentSegment;
      
      setFullTranscript(updatedTranscript);
      setCurrentSegment('');

      try {
        const result = await apiFetch<ParsedVoiceEvent>('/events/voice-parse', {
          method: 'POST',
          body: { transcript: updatedTranscript }
        });

        setParsedResult(result);

        // Prepopulate preview states if details are returned
        if (result.title) setPreviewTitle(result.title);
        
        // Convert ISO date strings to datetime-local format (YYYY-MM-DDTHH:MM)
        if (result.startTime) {
          setPreviewStart(formatToDatetimeLocal(result.startTime));
        }
        if (result.endTime) {
          setPreviewEnd(formatToDatetimeLocal(result.endTime));
        }
        if (result.location) {
          setPreviewLocation(result.location);
        }

        // Assistant prompt dialogue logic
        if (result.missingInfo && result.missingInfo.length > 0) {
          const missingFields = result.missingInfo;
          let question = 'We extracted some details, but still need:';
          if (missingFields.includes('title')) question = 'What is the title of the event? (e.g., Dentist appointment, Lunch with friends)';
          else if (missingFields.includes('date') || missingFields.includes('startTime')) {
            question = 'When is this event scheduled? (e.g., Tomorrow at 3 PM, Next Monday at 10 AM)';
          }
          setStatusMessage(question);
        } else {
          setStatusMessage('Event details extracted! Please verify the preview below.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to parse speech, please try again.');
      } finally {
        setLoading(false);
      }
    };

    processSpeech();
  }, [currentSegment]);

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleReset = () => {
    setFullTranscript('');
    setCurrentSegment('');
    setParsedResult(null);
    setStatusMessage('Reset. Click the microphone to start creating a schedule via voice...');
    setError('');
    setPreviewTitle('');
    setPreviewStart('');
    setPreviewEnd('');
    setPreviewLocation('');
  };

  const handleConfirmCreate = async () => {
    if (!previewTitle || !previewStart || !previewEnd) {
      setError('Please fill in the title, start time, and end time!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiFetch('/events/manual', {
        method: 'POST',
        body: {
          title: previewTitle,
          startTime: new Date(previewStart).toISOString(),
          endTime: new Date(previewEnd).toISOString(),
          location: previewLocation || null,
          source: 'voice' // Explicitly mark as voice source
        }
      });
      handleReset();
      onSuccess();
      setStatusMessage('🎉 Event created and synchronized to Google Calendar!');
    } catch (err: any) {
      setError(err.message || 'Failed to create event.');
    } finally {
      setLoading(false);
    }
  };

  // Converts standard ISO string to YYYY-MM-DDTHH:MM for datetime-local input
  const formatToDatetimeLocal = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      
      const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
      const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
      return localISOTime;
    } catch (_) {
      return '';
    }
  };

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col h-full">
      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="border-b border-dark-border pb-4 mb-4">
        <h3 className="font-semibold text-lg text-dark-text flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          Voice Assistant
        </h3>
        <p className="text-xs text-dark-muted mt-0.5">Speak naturally to instantly create a schedule</p>
      </div>

      <div className="flex-1 flex flex-col justify-between space-y-4">
        
        {/* Status Bubble */}
        <div className="bg-dark-bg border border-dark-border rounded-2xl p-4 min-h-[90px] flex flex-col justify-between">
          <p className="text-sm font-medium text-purple-300 leading-relaxed">
            {statusMessage}
          </p>
          {fullTranscript && (
            <p className="text-xs text-dark-muted border-t border-dark-border/40 pt-2 mt-2 truncate">
              Current recording: "{fullTranscript}"
            </p>
          )}
        </div>

        {/* Mic Control Button */}
        <div className="flex justify-center py-2 relative">
          {listening ? (
            <button
              onClick={stopListening}
              className="w-16 h-16 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 animate-pulse transition duration-200"
            >
              <MicOff className="w-7 h-7 text-white" />
            </button>
          ) : (
            <button
              onClick={startListening}
              disabled={!!error || loading}
              className="w-16 h-16 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 rounded-full flex items-center justify-center shadow-lg shadow-purple-600/30 hover:scale-105 transition duration-200"
            >
              <Mic className="w-7 h-7 text-white" />
            </button>
          )}
        </div>

        {/* Errors display */}
        {error && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-xl flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Review & Edit Preview Area */}
        {parsedResult && (
          <div className="border border-dark-border/80 bg-dark-bg/60 rounded-xl p-4 space-y-3 animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center border-b border-dark-border/40 pb-2">
              <span className="text-xs font-semibold text-purple-400">Event Details Confirmation</span>
              <button
                onClick={handleReset}
                className="text-dark-muted hover:text-dark-text text-[11px] flex items-center gap-0.5 transition"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[10px] font-medium text-dark-muted">Event Title</label>
                <input
                  type="text"
                  value={previewTitle}
                  onChange={(e) => setPreviewTitle(e.target.value)}
                  className="w-full text-sm bg-dark-card border border-dark-border rounded-lg px-2.5 py-1.5 text-dark-text focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-dark-muted">Start Time</label>
                  <input
                    type="datetime-local"
                    value={previewStart}
                    onChange={(e) => setPreviewStart(e.target.value)}
                    className="w-full text-xs bg-dark-card border border-dark-border rounded-lg px-2 py-1.5 text-dark-text focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-dark-muted">End Time</label>
                  <input
                    type="datetime-local"
                    value={previewEnd}
                    onChange={(e) => setPreviewEnd(e.target.value)}
                    className="w-full text-xs bg-dark-card border border-dark-border rounded-lg px-2 py-1.5 text-dark-text focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-dark-muted">Location</label>
                <input
                  type="text"
                  value={previewLocation}
                  onChange={(e) => setPreviewLocation(e.target.value)}
                  className="w-full text-sm bg-dark-card border border-dark-border rounded-lg px-2.5 py-1.5 text-dark-text focus:outline-none focus:border-purple-500"
                  placeholder="No location specified"
                />
              </div>
            </div>

            {/* Confirm creation button */}
            <button
              onClick={handleConfirmCreate}
              disabled={loading || (parsedResult.missingInfo && parsedResult.missingInfo.length > 0)}
              className="w-full flex items-center justify-center gap-1 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-sm rounded-xl shadow-lg shadow-purple-600/20 transition duration-200"
            >
              <Check className="w-4 h-4" />
              Create & Sync
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
