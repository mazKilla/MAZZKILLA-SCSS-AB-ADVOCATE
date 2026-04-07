import React, { useState, useRef, useEffect } from "react";
import { Send, Zap, Paperclip, X, FileText, Loader2 } from "lucide-react";
import MessageBubble from "./MessageBubble";

const API = process.env.REACT_APP_BACKEND_URL;
const ATTACH_ACCEPT = ".pdf,.txt,.eml,.mbox,.html,.htm,.msg";

export default function ChatArea({ messages, isLoading, onSendMessage, activeSession, selectedModel }) {
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState(null); // { filename, text, loading, error }
  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);
  const attachInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || isLoading || attachment?.loading) return;
    let finalMessage = input.trim();
    if (attachment && attachment.text) {
      finalMessage = `[ATTACHED FILE: ${attachment.filename}]\n\n${attachment.text}\n\n---\n\n${finalMessage}`;
    }
    onSendMessage(finalMessage);
    setInput("");
    setAttachment(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextareaChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  };

  const handleAttachChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setAttachment({ filename: file.name, text: null, loading: true, error: null });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/api/extract-text`, { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Extraction failed");
      }
      const data = await res.json();
      setAttachment({ filename: file.name, text: data.text, loading: false, error: null });
    } catch (err) {
      setAttachment({ filename: file.name, text: null, loading: false, error: err.message });
    }
  };

  const QUICK_PROMPTS = [
    "Explain the ETW appeal process step by step",
    "What are my rights under the Income and Employment Supports Act?",
    "How do I file a Notice of Appeal?",
    "What benefits am I entitled to as an ETW recipient?",
  ];

  return (
    <main
      data-testid="chat-area"
      className="flex flex-col flex-1 overflow-hidden"
      style={{ background: "#08080C" }}
    >
      {/* Messages Area */}
      <div
        data-testid="messages-list"
        className="flex-1 overflow-y-auto p-6 space-y-6"
        style={{ paddingBottom: "1rem" }}
      >
        {messages.length === 0 && !isLoading ? (
          <WelcomeScreen
            onPromptClick={onSendMessage}
            quickPrompts={QUICK_PROMPTS}
            selectedModel={selectedModel}
          />
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={msg.id || i} message={msg} />
            ))}
            {isLoading && <ThinkingBubble model={selectedModel} />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        className="p-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "#030305" }}
      >
        {/* Session indicator */}
        {activeSession && (
          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "rgba(161,161,170,0.4)" }}>
              CASE: {activeSession.title || "Untitled"} |{" "}
              <span style={{ color: selectedModel === "grok" ? "rgba(168,85,247,0.7)" : "rgba(0,255,212,0.7)" }}>
                {selectedModel === "grok" ? "GROK 3" : "CLAUDE SONNET 4.5"}
              </span>
            </span>
          </div>
        )}

        {/* Attachment chip */}
        {attachment && (
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "6px 10px", marginBottom: "8px",
            background: attachment.error ? "rgba(239,68,68,0.08)" : attachment.loading ? "rgba(168,85,247,0.08)" : "rgba(0,255,212,0.08)",
            border: `1px solid ${attachment.error ? "rgba(239,68,68,0.4)" : attachment.loading ? "rgba(168,85,247,0.4)" : "rgba(0,255,212,0.3)"}`,
          }}>
            {attachment.loading
              ? <Loader2 size={13} style={{ color: "#A855F7", animation: "spin 1s linear infinite", flexShrink: 0 }} />
              : <FileText size={13} style={{ color: attachment.error ? "#EF4444" : "#00FFD4", flexShrink: 0 }} />
            }
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: attachment.error ? "#EF4444" : "#F8F8F8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {attachment.loading ? `Extracting ${attachment.filename}...` : attachment.error ? `ERR: ${attachment.error}` : attachment.filename}
            </span>
            {!attachment.loading && (
              <button onClick={() => setAttachment(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#A1A1AA", padding: "0 2px", display: "flex" }}>
                <X size={13} />
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          {/* Hidden file input */}
          <input
            ref={attachInputRef}
            type="file"
            accept={ATTACH_ACCEPT}
            style={{ display: "none" }}
            onChange={handleAttachChange}
            data-testid="attach-file-input"
          />

          {/* Attachment button */}
          <button
            type="button"
            data-testid="attach-file-btn"
            onClick={() => attachInputRef.current?.click()}
            disabled={isLoading}
            title="Attach file (PDF, TXT, EML, MBOX, HTML, MSG)"
            style={{
              background: attachment && !attachment.error && !attachment.loading ? "rgba(0,255,212,0.12)" : "transparent",
              border: `1px solid ${attachment && !attachment.error && !attachment.loading ? "rgba(0,255,212,0.5)" : "rgba(255,255,255,0.1)"}`,
              color: attachment && !attachment.error && !attachment.loading ? "#00FFD4" : "#A1A1AA",
              padding: "10px",
              cursor: isLoading ? "not-allowed" : "pointer",
              flexShrink: 0,
              opacity: isLoading ? 0.5 : 1,
              transition: "all 0.2s",
            }}
          >
            <Paperclip size={16} />
          </button>

          <textarea
            ref={textareaRef}
            data-testid="chat-input-textarea"
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={attachment?.text ? "Add a message with the attachment... (optional)" : "Describe your situation or ask about Alberta ETW/ALSS policies... (Shift+Enter for new line)"}
            rows={1}
            className="flex-1 px-4 py-3 rounded resize-none text-sm"
            style={{
              background: "#08080C",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#F8F8F8",
              outline: "none",
              fontFamily: "'IBM Plex Sans', sans-serif",
              lineHeight: "1.6",
              maxHeight: "200px",
              transition: "border-color 0.2s",
            }}
            onFocus={e => e.target.style.borderColor = "rgba(0,255,212,0.5)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
          />
          <button
            data-testid="chat-submit-button"
            type="submit"
            disabled={(!input.trim() && !attachment?.text) || isLoading || attachment?.loading}
            className="p-3 rounded transition-all"
            style={{
              background: (input.trim() || attachment?.text) && !isLoading && !attachment?.loading ? "rgba(0,255,212,0.15)" : "rgba(255,255,255,0.05)",
              border: (input.trim() || attachment?.text) && !isLoading && !attachment?.loading ? "1px solid rgba(0,255,212,0.4)" : "1px solid rgba(255,255,255,0.1)",
              color: (input.trim() || attachment?.text) && !isLoading && !attachment?.loading ? "#00FFD4" : "#A1A1AA",
              cursor: (input.trim() || attachment?.text) && !isLoading && !attachment?.loading ? "pointer" : "not-allowed",
              flexShrink: 0,
            }}
          >
            <Send size={16} />
          </button>
        </form>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <p
          className="text-center mt-2"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            color: "rgba(161,161,170,0.3)",
          }}
        >
          SCSS AB ADVOCATE — Authoritative Alberta Social Benefits Guidance
        </p>
      </div>
    </main>
  );
}

function WelcomeScreen({ onPromptClick, quickPrompts, selectedModel }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 px-8">
      <div className="mb-6 text-center">
        <div
          className="logo-glow font-heading font-black text-5xl mb-2"
          style={{ color: "#00FFD4", fontFamily: "'Unbounded', sans-serif" }}
        >
          SCSS AB
        </div>
        <div
          className="font-heading font-black text-5xl mb-4"
          style={{ color: "#A855F7", fontFamily: "'Unbounded', sans-serif" }}
        >
          ADVOCATE
        </div>
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "12px",
            color: "#A1A1AA",
            letterSpacing: "0.15em",
          }}
        >
          #1 SOCIAL BENEFIT & JUSTICE ADJUDICATOR
        </p>
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            color: "rgba(161,161,170,0.5)",
            marginTop: "4px",
          }}
        >
          APPEAL OFFICER | APPEALS SECRETARIAT | MINISTRY OF ALSS
        </p>
      </div>

      <div
        className="w-full max-w-xl mb-8 p-4 rounded"
        style={{
          background: "rgba(0,255,212,0.04)",
          border: "1px solid rgba(0,255,212,0.15)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} style={{ color: "#00FFD4" }} />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              color: "#00FFD4",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Active Model:{" "}
            <span style={{ color: selectedModel === "grok" ? "#A855F7" : "#00FFD4" }}>
              {selectedModel === "grok" ? "Grok 3 (xAI)" : "Claude Sonnet 4.5 (Anthropic)"}
            </span>
          </span>
        </div>
        <p style={{ fontSize: "13px", color: "#A1A1AA", lineHeight: "1.6" }}>
          I am fully briefed on all Alberta ETW, ALSS, and SCSS policies,
          regulations, and appeal procedures. I will search current policy
          sources automatically to give you the most accurate guidance.
        </p>
      </div>

      <div className="w-full max-w-xl">
        <p
          className="text-center mb-4"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            color: "rgba(161,161,170,0.5)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Quick Start
        </p>
        <div className="grid grid-cols-1 gap-2">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              data-testid={`quick-prompt-${i}`}
              onClick={() => onPromptClick(prompt)}
              className="p-3 text-left rounded text-sm transition-all"
              style={{
                background: "#030305",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#A1A1AA",
                cursor: "pointer",
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "rgba(0,255,212,0.3)";
                e.currentTarget.style.color = "#F8F8F8";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "#A1A1AA";
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ThinkingBubble({ model }) {
  return (
    <div className="shimmer-wrapper" style={{ maxWidth: "100%" }}>
      <div className="shimmer-bg" />
      <div className="shimmer-inner p-5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <span className="typing-dot w-2 h-2 rounded-full" style={{ background: "#00FFD4", display: "inline-block" }} />
            <span className="typing-dot w-2 h-2 rounded-full" style={{ background: "#A855F7", display: "inline-block" }} />
            <span className="typing-dot w-2 h-2 rounded-full" style={{ background: "#00FFD4", display: "inline-block" }} />
          </div>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              color: "#A1A1AA",
            }}
          >
            SCSS AB ADVOCATE is analyzing Alberta policy and searching current
            regulations...
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              color: model === "grok" ? "rgba(168,85,247,0.6)" : "rgba(0,255,212,0.6)",
              textTransform: "uppercase",
            }}
          >
            {model === "grok" ? "GROK 3" : "CLAUDE 4.5"}
          </span>
        </div>
      </div>
    </div>
  );
}
