import React, { useState } from "react";
import { Plus, Trash2, MessageSquare } from "lucide-react";

export default function Sidebar({ sessions, activeSession, onSelectSession, onNewSession, onDeleteSession, isOpen, onClose }) {
  const [newTitle, setNewTitle] = useState("");
  const [showNewInput, setShowNewInput] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);

  const handleCreate = (e) => {
    e.preventDefault();
    onNewSession(newTitle.trim() || null);
    setNewTitle("");
    setShowNewInput(false);
  };

  return (
    <>
      {/* Mobile backdrop — tap to close */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={onClose}
        />
      )}
      <aside
        data-testid="sidebar"
        className={`flex flex-col shrink-0 fixed md:relative inset-y-0 left-0 z-50 md:z-auto md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{
          width: "272px",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          background: "#030305",
          transition: "transform 0.25s ease",
        }}
      >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span
          className="text-xs tracking-widest uppercase"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "#A1A1AA" }}
        >
          Cases / Sessions
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{
            background: "rgba(0,255,212,0.08)",
            color: "rgba(0,255,212,0.6)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {sessions.length}
        </span>
      </div>

      {/* New Session Button */}
      {!showNewInput ? (
        <button
          data-testid="new-session-button"
          onClick={() => setShowNewInput(true)}
          className="w-full flex items-center justify-center gap-2 py-3 transition-colors"
          style={{
            color: "#00FFD4",
            background: "transparent",
            border: "none",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            cursor: "pointer",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "12px",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(0,255,212,0.06)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <Plus size={14} />
          New Case
        </button>
      ) : (
        <form onSubmit={handleCreate} className="p-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <input
            autoFocus
            data-testid="new-session-input"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Case title (optional)..."
            className="w-full px-3 py-2 text-sm rounded mb-2"
            style={{
              background: "#08080C",
              border: "1px solid rgba(0,255,212,0.3)",
              color: "#F8F8F8",
              outline: "none",
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-1.5 rounded text-xs"
              style={{
                background: "rgba(0,255,212,0.15)",
                color: "#00FFD4",
                border: "1px solid rgba(0,255,212,0.3)",
                cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowNewInput(false)}
              className="flex-1 py-1.5 rounded text-xs"
              style={{
                background: "transparent",
                color: "#A1A1AA",
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Session List */}
      <div
        data-testid="sidebar-session-list"
        className="flex-1 overflow-y-auto"
      >
        {sessions.length === 0 ? (
          <div className="p-6 text-center">
            <MessageSquare size={24} style={{ color: "rgba(255,255,255,0.2)", margin: "0 auto 8px" }} />
            <p style={{ color: "#A1A1AA", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>
              No cases yet.
            </p>
            <p style={{ color: "rgba(161,161,170,0.5)", fontSize: "11px", marginTop: "4px" }}>
              Start a new case above.
            </p>
          </div>
        ) : (
          sessions.map(session => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={activeSession?.id === session.id}
              isHovered={hoveredId === session.id}
              onMouseEnter={() => setHoveredId(session.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelectSession(session)}
              onDelete={(e) => {
                e.stopPropagation();
                onDeleteSession(session.id);
              }}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div
        className="p-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="text-center text-xs"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "rgba(161,161,170,0.4)" }}
        >
          Alberta ALSS | ETW | SCSS
        </div>
      </div>
      </aside>
    </>
  );
}

function SessionItem({ session, isActive, isHovered, onMouseEnter, onMouseLeave, onClick, onDelete }) {
  const date = new Date(session.created_at || Date.now());
  const dateStr = date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });

  return (
    <div
      data-testid={`session-item-${session.id}`}
      className="p-4 cursor-pointer flex flex-col gap-1 relative"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        borderLeft: isActive ? "2px solid #00FFD4" : "2px solid transparent",
        background: isActive ? "rgba(0,255,212,0.04)" : isHovered ? "rgba(255,255,255,0.03)" : "transparent",
        transition: "all 0.15s",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-sm truncate flex-1"
          style={{
            color: isActive ? "#F8F8F8" : "#A1A1AA",
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontWeight: isActive ? 500 : 400,
          }}
        >
          {session.title || "Untitled Case"}
        </span>
        {isHovered && (
          <button
            data-testid={`delete-session-${session.id}`}
            onClick={onDelete}
            className="p-1 rounded transition-colors"
            style={{
              color: "rgba(239,68,68,0.7)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.color = "#EF4444"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(239,68,68,0.7)"}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            color: "rgba(161,161,170,0.5)",
          }}
        >
          {dateStr}
        </span>
        {session.message_count > 0 && (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              color: "rgba(0,255,212,0.4)",
            }}
          >
            {session.message_count} msgs
          </span>
        )}
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            color: session.model === "grok" ? "rgba(168,85,247,0.6)" : "rgba(0,255,212,0.4)",
            marginLeft: "auto",
            textTransform: "uppercase",
          }}
        >
          {session.model === "grok" ? "GROK" : "CLAUDE"}
        </span>
      </div>
    </div>
  );
}
