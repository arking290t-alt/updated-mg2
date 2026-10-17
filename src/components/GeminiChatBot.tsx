import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw, Copy, Check, Database, Brain, ArrowRight } from 'lucide-react';
import { CorrugationJob, InventoryItem } from '../types/job';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

interface GeminiChatBotProps {
  jobs?: CorrugationJob[];
  inventory?: InventoryItem[];
}

const ADVANCED_REASONING_PROMPTS = [
  '🧠 Perform a full operational reasoning audit on our current queue and bottlenecks',
  '📦 Cross-analyze inventory lots against pending jobs: who is missing stock?',
  '⚠️ Diagnose jobs marked "Not Completed" and recommend machine root causes',
  '🏭 Propose an optimal corrugator schedule to minimize changeover waste',
  '🔬 How do we eliminate up-warp and down-warp on the corrugator hot plates?',
  '🧪 Calculate McKee Box Compression (BCT) & Stein-Hall starch adhesive parameters',
];

function renderInlineBold(text: string): React.ReactNode {
  // Simple parser for **bold** text
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export const GeminiChatBot: React.FC<GeminiChatBotProps> = ({ jobs = [], inventory = [] }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `⚡ **AI Plant Industrial Brain Connected (mg-manager-3ab66)**

Configured for **concise, highly detailed** plant reasoning over your live factory database:
• 🔍 **Live Queue Audit**: Instant bottleneck & stock shortage analysis.
• 🚨 **Halted Run Root-Causes**: Warp, starch gel temp (58-62°C), or flexo registration diagnostics.
• 🎯 **Floor Directives**: Compact, bulleted operational steps with exact numbers and lot details.

Ask any question or pick an operational prompt below!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const THINKING_STEPS = [
    'Reading live Firestore database records (mg-manager-3ab66)...',
    'Cross-referencing pending jobs with inventory lots...',
    'Analyzing corrugator line bottlenecks & machine scheduling...',
    'Synthesizing operational reasoning & strategic action plan...',
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setThinkingStep((prev) => (prev + 1) % THINKING_STEPS.length);
      }, 1800);
    } else {
      setThinkingStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || inputText).trim();
    if (!messageText || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      // Prepare history excluding welcome message
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      // Live factory database payload sent directly with query
      const databaseContext = {
        jobs,
        inventory,
        databaseId: 'mg-manager-3ab66',
        timestamp: new Date().toISOString(),
      };

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          history: historyPayload,
          databaseContext,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      const modelReply = data.reply || 'No response received from AI backend.';

      const modelMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: modelReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'model',
        text: `Error connecting to AI chat backend: ${err.message || 'Unable to reach server'}. Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        text: 'Chat history cleared. Live factory database (**mg-manager-3ab66**) reasoning engine is ready. How can I assist you?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[680px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      
      {/* Chat Header */}
      <div className="px-5 py-3.5 bg-slate-950/95 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Factory AI Reasoning Engine
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Thinking Mode Active
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span>Plant Operations Director</span>
              <span className="text-slate-600">·</span>
              <span className="flex items-center gap-1 text-amber-400 font-mono text-[10px]">
                <Database className="w-3 h-3" />
                <span>mg-manager-3ab66 ({jobs.length} jobs, {inventory.length} lots)</span>
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          title="Clear chat history"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-xs shadow-sm'
                    : 'bg-slate-950 text-slate-200 border border-slate-800/90 rounded-tl-xs shadow-sm'
                }`}
              >
                {/* Formatted Message Lines */}
                <div className="space-y-1.5">
                  {msg.text.split('\n').map((line, lineIdx) => {
                    const trimmed = line.trim();
                    if (!trimmed) return <div key={lineIdx} className="h-1" />;

                    if (trimmed.startsWith('#### ')) {
                      return (
                        <h5 key={lineIdx} className="font-bold text-amber-300 text-xs mt-2 mb-0.5 flex items-center gap-1.5">
                          <ArrowRight className="w-3 h-3 text-amber-400" />
                          <span>{trimmed.replace('#### ', '')}</span>
                        </h5>
                      );
                    }
                    if (trimmed.startsWith('### ')) {
                      return (
                        <h4 key={lineIdx} className="font-bold text-amber-400 text-xs mt-2.5 mb-1 pb-1 border-b border-slate-800">
                          {trimmed.replace('### ', '')}
                        </h4>
                      );
                    }
                    if (trimmed.startsWith('## ')) {
                      return (
                        <h3 key={lineIdx} className="font-bold text-amber-400 text-sm mt-3 mb-1">
                          {trimmed.replace('## ', '')}
                        </h3>
                      );
                    }
                    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
                      const bulletContent = trimmed.replace(/^[\*\-•]\s*/, '');
                      return (
                        <div key={lineIdx} className="flex items-start gap-1.5 ml-1">
                          <span className="text-amber-400 leading-tight">•</span>
                          <span className="flex-1">{renderInlineBold(bulletContent)}</span>
                        </div>
                      );
                    }
                    if (/^\d+\.\s/.test(trimmed)) {
                      return (
                        <div key={lineIdx} className="font-medium text-slate-100 mt-1.5">
                          {renderInlineBold(trimmed)}
                        </div>
                      );
                    }

                    return (
                      <p key={lineIdx} className="leading-relaxed">
                        {renderInlineBold(line)}
                      </p>
                    );
                  })}
                </div>
                
                <div className={`mt-2.5 pt-1.5 border-t ${isUser ? 'border-amber-600/30 text-slate-800' : 'border-slate-800/80 text-slate-500'} flex items-center justify-between text-[10px]`}>
                  <span className="font-mono">{msg.timestamp}</span>
                  {!isUser && (
                    <button
                      onClick={() => handleCopyText(msg.id, msg.text)}
                      className="ml-3 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-[10px] text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[10px]">Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5 border border-slate-700">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 justify-start animate-in fade-in duration-200">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
              <Brain className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-xs px-4 py-3 text-xs text-slate-300 space-y-1.5 shadow-sm max-w-[80%]">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span className="font-semibold text-amber-400 font-mono text-[11px]">
                  AI Reasoning Engine Thinking...
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {THINKING_STEPS[thinkingStep]}
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Advanced Reasoning Prompts Carousel */}
      <div className="px-4 py-2 bg-slate-950/70 border-t border-slate-800/80 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
        <span className="text-[10px] text-amber-400 whitespace-nowrap font-mono font-bold flex items-center gap-1 mr-1">
          <Brain className="w-3 h-3" /> Thinking Audits:
        </span>
        {ADVANCED_REASONING_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading}
            className="px-2.5 py-1 text-[11px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI to analyze jobs, diagnose bottlenecks, or evaluate corrugator operations..."
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none max-h-24 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold rounded-xl transition-colors cursor-pointer shrink-0 shadow-sm flex items-center justify-center"
            title="Send query"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
};
