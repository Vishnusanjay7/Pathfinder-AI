import React, { useRef, useEffect } from "react";
import { MessageSquare, User, Bot } from "lucide-react";
import type { TranscriptItemV2 } from "../types/interview";

interface LiveTranscriptStreamProps {
  transcripts: TranscriptItemV2[];
  interimTranscript?: string;
  interviewerName: string;
  className?: string;
}

export const LiveTranscriptStream: React.FC<LiveTranscriptStreamProps> = ({
  transcripts,
  interimTranscript,
  interviewerName,
  className = "",
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [transcripts, interimTranscript]);

  return (
    <div
      className={`flex flex-col h-full bg-[#070F1E] border border-[#162742] rounded-2xl overflow-hidden shadow-xl ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#162742] bg-[#050C17]/60 flex items-center justify-between">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
          <MessageSquare size={13} className="text-blue-400" /> Live Conversation Stream
        </h4>
        <span className="text-[10px] font-semibold text-slate-400">
          {transcripts.length} {transcripts.length === 1 ? "Turn" : "Turns"}
        </span>
      </div>

      {/* Transcript Items */}
      <div
        ref={scrollContainerRef}
        className="flex-1 p-4 overflow-y-auto space-y-3.5 custom-scrollbar text-left text-xs leading-relaxed"
      >
        {transcripts.length === 0 && !interimTranscript && (
          <div className="h-full flex items-center justify-center text-slate-500 italic text-center p-4">
            Conversation will appear here in real-time as you and {interviewerName} speak.
          </div>
        )}

        {transcripts.map((item) => {
          const isInterviewer = item.sender === "interviewer";

          return (
            <div
              key={item.id}
              className={`flex flex-col ${isInterviewer ? "items-start" : "items-end"}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                {isInterviewer ? (
                  <Bot size={12} className="text-blue-400" />
                ) : (
                  <User size={12} className="text-emerald-400" />
                )}
                <span className="text-[11px] font-bold text-slate-300">
                  {isInterviewer ? interviewerName : "You"}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <div
                className={`p-3 rounded-2xl max-w-[90%] ${
                  isInterviewer
                    ? "bg-[#0C1A30] border border-blue-900/40 text-blue-100 rounded-tl-sm shadow-md"
                    : "bg-[#0B241E] border border-emerald-800/40 text-emerald-100 rounded-tr-sm shadow-md"
                }`}
              >
                {item.text}
              </div>
            </div>
          );
        })}

        {/* Real-time Interim Streaming Transcript */}
        {interimTranscript && (
          <div className="flex flex-col items-end animate-pulse">
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <User size={12} className="text-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-300">You (Speaking...)</span>
            </div>
            <div className="p-3 rounded-2xl max-w-[90%] bg-[#0B241E]/70 border border-emerald-500/40 text-emerald-200 rounded-tr-sm italic">
              {interimTranscript}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
