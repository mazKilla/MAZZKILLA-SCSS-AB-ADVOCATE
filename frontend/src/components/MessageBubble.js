import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Bot, ExternalLink } from "lucide-react";

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const isError = message.isError;
  const citations = message.citations || [];

  if (isUser) {
    return (
      <div className="flex justify-end" data-testid={`message-user-${message.id}`}>
        <div
          className="max-w-2xl flex items-start gap-3"
          style={{ flexDirection: "row-reverse" }}
        >
          <div
            className="w-8 h-8 rounded flex items-center justify-center shrink-0 mt-1"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <User size={14} style={{ color: "#A1A1AA" }} />
          </div>
          <div
            className="px-5 py-4 rounded"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#F8F8F8",
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: "14px",
              lineHeight: "1.7",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  // AI message
  return (
    <div data-testid={`message-ai-${message.id}`} className="flex items-start gap-3">
      <div
        className="w-8 h-8 rounded flex items-center justify-center shrink-0 mt-1"
        style={{
          background: isError ? "rgba(239,68,68,0.1)" : "rgba(0,255,212,0.08)",
          border: `1px solid ${isError ? "rgba(239,68,68,0.3)" : "rgba(0,255,212,0.2)"}`,
        }}
      >
        <Bot size={14} style={{ color: isError ? "#EF4444" : "#00FFD4" }} />
      </div>
      <div className="flex-1">
        {/* Model badge */}
        <div className="flex items-center gap-2 mb-2">
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              color: message.model === "grok" ? "rgba(168,85,247,0.8)" : "rgba(0,255,212,0.8)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {message.model === "grok" ? "GROK 3" : "CLAUDE SONNET 4.5"} | SCSS AB ADVOCATE
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              color: "rgba(161,161,170,0.4)",
            }}
          >
            {new Date(message.timestamp).toLocaleTimeString("en-CA", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Message content */}
        <div
          className="px-6 py-5 rounded ai-markdown"
          style={{
            background: "#030305",
            border: isError
              ? "1px solid rgba(239,68,68,0.3)"
              : "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Citations */}
        {citations.length > 0 && (
          <div className="mt-3">
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "rgba(0,255,212,0.5)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "6px",
              }}
            >
              Policy Sources Searched
            </p>
            <div className="space-y-1">
              {citations.slice(0, 3).map((c, i) => (
                <a
                  key={i}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 p-2 rounded transition-colors"
                  style={{
                    background: "rgba(0,255,212,0.04)",
                    border: "1px solid rgba(0,255,212,0.12)",
                    textDecoration: "none",
                    display: "flex",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(0,255,212,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(0,255,212,0.04)"}
                >
                  <ExternalLink
                    size={11}
                    style={{ color: "rgba(0,255,212,0.5)", marginTop: "2px", flexShrink: 0 }}
                  />
                  <div>
                    <p
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "11px",
                        color: "#00FFD4",
                      }}
                    >
                      {c.title || c.url}
                    </p>
                    {c.snippet && (
                      <p
                        style={{
                          fontSize: "11px",
                          color: "rgba(161,161,170,0.6)",
                          marginTop: "2px",
                          lineHeight: "1.4",
                        }}
                      >
                        {c.snippet.slice(0, 120)}...
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
