import React from "react";
import { Bot, Mail, ChevronRight, MessageSquare, RefreshCw, Activity } from "lucide-react";

const CLAUDE_ID = "claude";
const GROK_ID = "grok";

export default function Header({ selectedModel, onModelChange, showEmailPanel, onToggleEmailPanel, emailCount, activeTab, onTabChange, onOpenDebug }) {
  return (
    <header
      data-testid="app-header"
      className="shrink-0 z-50"
      style={{
        background: "#030305",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {/* Top row */}
      <div className="h-14 flex items-center justify-between px-6">
        {/* Logo + App Name */}
        <div className="flex items-center gap-3">
          <span
            className="logo-glow font-heading font-black tracking-tighter text-xl"
            style={{ color: "#00FFD4", fontFamily: "'Unbounded', sans-serif" }}
            data-testid="logo-text"
          >
            MazZKiLL@
          </span>
          <div
            className="pl-3 flex flex-col"
            style={{ borderLeft: "1px solid rgba(255,255,255,0.15)" }}
          >
            <span
              className="text-xs tracking-widest uppercase"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "#A1A1AA" }}
            >
              SCSS AB ADVOCATE
            </span>
            <span
              className="text-xs"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "rgba(0,255,212,0.5)", fontSize: "10px" }}
            >
              #1 Social Benefit & Justice Adjudicator
            </span>
          </div>
        </div>

        {/* Center: Model Selector */}
        <div
          data-testid="model-selector-toggle"
          className="flex items-center gap-1 p-1 rounded-full"
          style={{
            background: "#08080C",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <ModelBtn id={CLAUDE_ID} label="Claude Sonnet 4.5" selected={selectedModel === CLAUDE_ID} onClick={() => onModelChange(CLAUDE_ID)} />
          <ModelBtn id={GROK_ID} label="Grok 3" selected={selectedModel === GROK_ID} onClick={() => onModelChange(GROK_ID)} />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <div
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded"
            style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)" }}
          >
            <Bot size={13} style={{ color: "#A855F7" }} />
            <span className="text-xs tracking-wider uppercase" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#A855F7" }}>
              Appeal Officer
            </span>
          </div>

          {activeTab === "chat" && (
            <button
              data-testid="toggle-email-panel"
              onClick={onToggleEmailPanel}
              className="flex items-center gap-2 px-3 py-1.5 rounded transition-all"
              style={{
                background: showEmailPanel ? "rgba(0,255,212,0.1)" : "#08080C",
                border: showEmailPanel ? "1px solid rgba(0,255,212,0.4)" : "1px solid rgba(255,255,255,0.1)",
                color: showEmailPanel ? "#00FFD4" : "#A1A1AA",
              }}
            >
              <Mail size={14} />
              <span className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Emails
                {emailCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs" style={{ background: "rgba(0,255,212,0.2)", color: "#00FFD4" }}>
                    {emailCount}
                  </span>
                )}
              </span>
              <ChevronRight size={12} style={{ transform: showEmailPanel ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
          )}

          {/* Debug Button */}
          <button
            data-testid="open-debug-panel"
            onClick={onOpenDebug}
            title="Debug & Health Check"
            className="p-2 rounded transition-all"
            style={{
              background: "#08080C",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#A1A1AA",
              cursor: "pointer",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,255,212,0.4)"; e.currentTarget.style.color = "#00FFD4"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#A1A1AA"; }}
          >
            <Activity size={14} />
          </button>
        </div>
      </div>

      {/* Tab Navigation row */}
      <div
        className="flex items-center px-6"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <TabBtn
          label="AI ADVOCATE"
          icon={<MessageSquare size={12} />}
          active={activeTab === "chat"}
          onClick={() => onTabChange("chat")}
          testId="tab-chat"
        />
        <TabBtn
          label="EMAIL CONVERTER"
          icon={<RefreshCw size={12} />}
          active={activeTab === "converter"}
          onClick={() => onTabChange("converter")}
          testId="tab-converter"
        />
      </div>
    </header>
  );
}

function ModelBtn({ id, label, selected, onClick }) {  return (
    <button
      data-testid={`model-btn-${id}`}
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-1.5 rounded-full transition-all text-sm"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "11px",
        background: selected ? "rgba(255,255,255,0.08)" : "transparent",
        color: selected ? "#00FFD4" : "#A1A1AA",
        border: "none",
        cursor: "pointer",
      }}
    >
      {selected && (
        <span
          className="w-2 h-2 rounded-full pulse-dot"
          style={{ background: "#00FFD4", display: "inline-block", flexShrink: 0 }}
        />
      )}
      {label}
    </button>
  );
}


function TabBtn({ label, icon, active, onClick, testId }) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 16px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "11px",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: active ? "#00FFD4" : "#A1A1AA",
        background: "transparent",
        border: "none",
        borderBottom: active ? "2px solid #00FFD4" : "2px solid transparent",
        cursor: "pointer",
        transition: "all 0.15s",
        marginBottom: "-1px",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#F8F8F8"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#A1A1AA"; }}
    >
      {icon}
      {label}
    </button>
  );
}
