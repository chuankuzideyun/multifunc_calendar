import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Send, Mic, MicOff, RotateCcw, Sparkles, 
  Calendar, Mail, CloudSun, Check, X, AlertCircle 
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  actionsTaken?: any[];
  isPending?: boolean;
}

interface AgentChatProps {
  onEventCreated: () => void;
}

// Generate or retrieve a persistent session_id
const getSessionId = (): string => {
  let sid = localStorage.getItem('agent_session_id');
  if (!sid) {
    sid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    localStorage.setItem('agent_session_id', sid);
  }
  return sid;
};

export const AgentChat: React.FC<AgentChatProps> = ({ onEventCreated }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load history/initial welcome message
  useEffect(() => {
    const saved = localStorage.getItem('agent_chat_history');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (_) {
        loadWelcomeMessage();
      }
    } else {
      loadWelcomeMessage();
    }
  }, []);

  // Save history on change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('agent_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speech Recognition initialization
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setError('');
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setError(`Voice input error: ${event.error}`);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript;
      setInput(prev => prev ? `${prev} ${resultText}` : resultText);
    };

    recognitionRef.current = recognition;
  }, []);

  const loadWelcomeMessage = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'agent',
        text: 'Hi there! I am your Antigravity Personal Concierge. I can help sync your Gmail inbox, manage your Google Calendar events, and plan your weekend runs based on local weather. How can I assist you today?'
      }
    ]);
  };

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    } else {
      setError('Speech recognition is not supported in this browser. Please use Chrome/Edge.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleResetSession = () => {
    // Generate new session ID
    const newSid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    localStorage.setItem('agent_session_id', newSid);
    
    // Clear state
    setInput('');
    setError('');
    setLoading(false);
    loadWelcomeMessage();
    localStorage.removeItem('agent_chat_history');
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || !user || loading) return;

    const userMessageId = `msg-${Date.now()}`;
    const newUserMessage: Message = {
      id: userMessageId,
      sender: 'user',
      text: textToSend
    };

    // Add user message and a placeholder pending agent message
    const agentPlaceholderId = `msg-agent-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      newUserMessage,
      {
        id: agentPlaceholderId,
        sender: 'agent',
        text: '',
        isPending: true,
        actionsTaken: []
      }
    ]);
    setInput('');
    setLoading(true);
    setError('');

    const session_id = getSessionId();
    const user_id = user.id;

    try {
      // Connect to the FastAPI agent backend using SSE stream
      const agentUrl = import.meta.env.VITE_AGENT_URL || 'http://localhost:8001';
      const response = await fetch(`${agentUrl}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          user_id,
          session_id
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          try {
            const errData = await response.json();
            if (errData.error === 'rate_limited') {
              throw new Error('请稍后重试');
            }
          } catch (e: any) {
            throw new Error(e.message || '请稍后重试');
          }
        }
        throw new Error(`Agent returned status ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Readable stream not supported.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let replyText = '';
      let actions: any[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last segment in buffer if it is partial
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanedLine = line.trim();
          if (cleanedLine.startsWith('data: ')) {
            const dataStr = cleanedLine.slice(6).trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              
              if (data.type === 'chunk' && data.text) {
                replyText += data.text;
                // Live update the typing placeholder with new text chunks
                setMessages(prev => prev.map(m => 
                  m.id === agentPlaceholderId 
                    ? { ...m, text: replyText } 
                    : m
                ));
              } else if (data.type === 'action') {
                actions.push(data.action);
                
                // If a calendar creation action succeeded, trigger calendar refresh
                if (data.action.type === 'tool_response' && data.action.name === 'create_calendar_event' && data.action.response?.status === 'success') {
                  onEventCreated();
                }

                setMessages(prev => prev.map(m => 
                  m.id === agentPlaceholderId 
                    ? { ...m, actionsTaken: [...actions] } 
                    : m
                ));
              } else if (data.type === 'final') {
                replyText = data.reply || replyText;
                actions = data.actions_taken || actions;
                
                // Finalize the message
                setMessages(prev => prev.map(m => 
                  m.id === agentPlaceholderId 
                    ? { ...m, text: replyText, actionsTaken: [...actions], isPending: false } 
                    : m
                ));
              } else if (data.type === 'error') {
                if (data.error === 'rate_limited' || data.message === 'AI 服务繁忙，请稍后重试') {
                  throw new Error('请稍后重试');
                }
                throw new Error(data.message);
              }
            } catch (jsonErr) {
              console.error('Failed to parse SSE JSON:', jsonErr);
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to talk to agent.');
      // Remove the empty placeholder if it failed completely
      setMessages(prev => prev.filter(m => m.id !== agentPlaceholderId || m.text.length > 0).map(m => 
        m.id === agentPlaceholderId ? { ...m, isPending: false, text: 'Sorry, I encountered an error communicating with the agent server.' } : m
      ));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  // Helper to check if a message asks for event creation confirmation
  const isConfirmationMessage = (msg: Message) => {
    if (msg.sender !== 'agent' || msg.isPending) return false;
    const text = msg.text.toLowerCase();
    const keywords = ["要我把", "是否", "需要我", "add to your calendar", "add it to your calendar", "want me to add", "创建日程", "确认"];
    return keywords.some(kw => text.includes(kw)) && (text.includes("?") || text.includes("吗"));
  };

  // Check if this confirmation bubble is the absolute last message in history
  const isLatestMessage = (index: number) => {
    return index === messages.length - 1;
  };

  // Render tool execution badges under the bubble
  const renderActions = (actions?: any[]) => {
    if (!actions || actions.length === 0) return null;
    
    // Group actions by tool name to avoid duplicates in display
    const uniqueToolCalls = Array.from(new Set(actions.filter(a => a.type === 'tool_call').map(a => a.name)));

    return (
      <div className="flex flex-wrap gap-1.5 mt-2 border-t border-[var(--spring-green-mid)]/45 pt-2">
        {uniqueToolCalls.map((toolName: any) => {
          let label = toolName;
          let Icon = Sparkles;
          
          if (toolName === 'fetch_gmail_events') {
            label = 'Scanning Gmail';
            Icon = Mail;
          } else if (toolName === 'create_calendar_event') {
            label = 'Creating Event';
            Icon = Calendar;
          } else if (toolName === 'list_calendar_events') {
            label = 'Checking Calendar';
            Icon = Calendar;
          } else if (toolName === 'get_weekend_weather') {
            label = 'Checking Weather';
            Icon = CloudSun;
          }

          return (
            <span 
              key={toolName}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--spring-green-light)] border border-[var(--spring-green-mid)] text-[10px] text-[var(--spring-green-dark)] font-medium"
            >
              <Icon className="w-3 h-3 text-[var(--spring-green-dark)] animate-pulse" />
              {label}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="spring-card shadow-sm flex flex-col h-full overflow-hidden relative">
      {/* Header */}
      <div className="border-b border-[var(--spring-green-mid)] px-4 py-3 flex justify-between items-center bg-[var(--spring-page-bg)] relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--spring-green-text)] animate-pulse" />
          <div>
            <h3 className="font-semibold text-sm text-[var(--spring-green-dark)] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[var(--spring-green-text)]" />
              Concierge AI Agent
            </h3>
            <p className="text-[10px] text-[var(--spring-green-text)]">Powered by Google ADK v2.0</p>
          </div>
        </div>
        <button
          onClick={handleResetSession}
          className="p-1.5 hover:bg-[var(--spring-green-light)] rounded-lg text-[var(--spring-green-text)] hover:text-[var(--spring-pink-text)] transition"
          title="Reset conversation session"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[150px] relative z-10">
        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user';
          const isAgent = msg.sender === 'agent';
          
          return (
            <div 
              key={msg.id}
              className={`flex gap-2 items-start ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {isAgent && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm" style={{ background: 'var(--spring-pink-light)' }}>
                  <svg className="w-5 h-5 text-[var(--spring-pink-text)]" viewBox="0 0 24 24" fill="currentColor">
                    <g transform="translate(12,12) scale(0.9)">
                      <path d="M0,0 C-3,-6 -5,-10 0,-12 C5,-10 3,-6 0,0" />
                      <path d="M0,0 C-3,-6 -5,-10 0,-12 C5,-10 3,-6 0,0" transform="rotate(72)" />
                      <path d="M0,0 C-3,-6 -5,-10 0,-12 C5,-10 3,-6 0,0" transform="rotate(144)" />
                      <path d="M0,0 C-3,-6 -5,-10 0,-12 C5,-10 3,-6 0,0" transform="rotate(216)" />
                      <path d="M0,0 C-3,-6 -5,-10 0,-12 C5,-10 3,-6 0,0" transform="rotate(288)" />
                      <circle cx="0" cy="0" r="1.5" fill="#FAFDF8" />
                    </g>
                  </svg>
                </div>
              )}

              <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`text-sm px-4 py-2.5 shadow-sm ${
                    isUser 
                      ? 'spring-bubble-user' 
                      : 'spring-bubble-agent'
                  }`}
                >
                  {/* Loader for typing / pending states */}
                  {isAgent && msg.isPending && !msg.text ? (
                    <div className="flex items-center gap-1 py-1 px-1.5">
                      <span className="w-2 h-2 rounded-full bg-[var(--spring-green-text)] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-[var(--spring-green-text)] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-[var(--spring-green-text)] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  ) : (
                    <p className="whitespace-pre-line">{msg.text}</p>
                  )}

                  {/* Show actions taken */}
                  {isAgent && renderActions(msg.actionsTaken)}
                </div>

                {/* Confirm/Cancel Buttons when agent requests approval */}
                {isAgent && isConfirmationMessage(msg) && isLatestMessage(index) && (
                  <div className="flex gap-2 mt-2 animate-in fade-in duration-200">
                    <button
                      onClick={() => handleSend("是的，请创建日程。")}
                      className="flex items-center gap-1 px-3 py-1 spring-btn-primary text-xs font-semibold rounded-lg shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" /> Confirm
                    </button>
                    <button
                      onClick={() => handleSend("不用了，谢谢。")}
                      className="flex items-center gap-1 px-3 py-1 spring-btn-danger text-xs font-semibold rounded-lg shadow-sm"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Errors display */}
      {error && (
        <div className="px-4 py-2 bg-[var(--spring-pink-light)] border-t border-b border-[var(--spring-pink-light)] text-[var(--spring-pink-text)] flex items-center gap-2 text-xs relative z-10 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-[var(--spring-pink-text)]" />
          <p className="truncate">{error}</p>
        </div>
      )}

      {/* Input Form */}
      <div className="border-t border-[var(--spring-green-mid)] p-3 bg-[var(--spring-page-bg)] flex gap-2 items-center relative z-10">
        {/* Voice typing button */}
        {listening ? (
          <button
            onClick={stopListening}
            className="spring-voice-btn-active p-3 transition w-10.5 h-10.5 flex items-center justify-center"
            title="Stop listening"
          >
            <MicOff className="w-4.5 h-4.5" />
          </button>
        ) : (
          <button
            onClick={startListening}
            className="spring-voice-btn p-3 transition w-10.5 h-10.5 flex items-center justify-center"
            title="Start voice typing"
          >
            <Mic className="w-4.5 h-4.5" />
          </button>
        )}

        {/* Text Input Container */}
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask me to sync inbox, weather run, or edit calendar..."
            className="w-full spring-chat-input transition"
            disabled={loading}
          />
          {/* Send Button absolute-positioned inside the input box on the right */}
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || loading}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 text-[var(--spring-green-text)] hover:text-[var(--spring-green-dark)] disabled:opacity-40 transition duration-150 flex items-center justify-center"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
