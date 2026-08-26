import React, { useEffect, useRef } from "react";
import { MessageSquare, User, Bot, Sparkles, Mic } from "lucide-react";

export interface TranscriptItem {
  id: string;
  sender: "interviewer" | "candidate";
  text: string;
  timestamp: string;
  phase?: string;
}

export interface LiveTranscriptStreamProps {
  items: TranscriptItem[];
  currentInterim?: string;
  isListening?: boolean;
  interviewerName?: string;
  className?: string;
}

export const LiveTranscriptStream: React.FC<LiveTranscriptStreamProps> = ({
  items,
  currentInterim = "",
  isListening = false,
  interviewerName = "Interviewer",
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom when new messages arrive or candidate speaks
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [items, currentInterim]);

  return (
    <div
      className={`flex flex-col h-full bg-[#081220]/95 border border-[#1E3150] rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl ${className}`}
    >
      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-[#1E3150] bg-[#0A1628]/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <MessageSquare size={13} />
          </div>
          <h3 className="text-xs font-bold text-white tracking-wide">
            Live Conversation Transcript
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isListening ? "bg-emerald-400 animate-ping" : "bg-blue-400"
            }`}
          />
          <span className="text-[10px] text-slate-400 font-semibold">
            {isListening ? "Live STT Listening" : "Streaming Ready"}
          </span>
        </div>
      </div>

      {/* ── Scrollable Dialogue Feed ── */}
      <div
        ref={containerRef}
        className="flex-1 p-3.5 space-y-3 overflow-y-auto min-h-0 font-sans text-xs scrollbar-thin scrollbar-thumb-slate-700"
      >
        {items.length === 0 && !currentInterim && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
            <Sparkles size={24} className="text-blue-500/40 animate-pulse" />
            <p className="text-xs font-medium text-slate-400">
              Interview session starting...
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs">
              Live verbal dialogue from both you and {interviewerName} will stream here in real time.
            </p>
          </div>
        )}

        {items.map((msg) => {
          const isInterviewer = msg.sender === "interviewer";
          return (
            <div
              key={msg.id}
              className={`flex flex-col space-y-1 ${
                isInterviewer ? "items-start" : "items-end"
              }`}
            >
              {/* Sender Header */}
              <div className="flex items-center gap-1.5 px-1">
                {isInterviewer ? (
                  <>
                    <Bot size={11} className="text-blue-400" />
                    <span className="text-[10px] font-bold text-blue-300">
                      {interviewerName}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-bold text-emerald-300">
                      YOU (Candidate)
                    </span>
                    <User size={11} className="text-emerald-400" />
                  </>
                )}
                {msg.phase && (
                  <span className="text-[9px] text-slate-500 px-1 py-0.2 bg-white/5 rounded">
                    {msg.phase}
                  </span>
                )}
                <span className="text-[9px] text-slate-600 ml-1">
                  {msg.timestamp}
                </span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed ${
                  isInterviewer
                    ? "bg-[#0E1E34] text-slate-200 border border-[#1E3150] rounded-tl-sm shadow-md"
                    : "bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-tr-sm shadow-lg shadow-emerald-500/10"
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}

        {/* Interim Live Speech Transcript Bubble (While Candidate speaks) */}
        {currentInterim && (
          <div className="flex flex-col items-end space-y-1">
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <Mic size={10} className="animate-pulse" /> Speaking live...
              </span>
            </div>
            <div className="max-w-[88%] p-3 rounded-2xl rounded-tr-sm bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 italic shadow-md">
              "{currentInterim}"
              <span className="inline-block w-1.5 h-3 bg-emerald-400 ml-1 animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTranscriptStream;
