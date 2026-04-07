import React, { useState, useEffect, useCallback } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import EmailPanel from "./components/EmailPanel";
import EmailConverter from "./components/EmailConverter";
import DebugPanel from "./components/DebugPanel";

const API = process.env.REACT_APP_BACKEND_URL;
const GATE_KEY = "scss_gate_v1";

// ── Security Gate ─────────────────────────────────────────────────────
function SecurityGate({ onUnlock }) {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (answer.trim().toUpperCase() === "BENJI") {
      sessionStorage.setItem(GATE_KEY, "1");
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setAnswer("");
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#030305",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999,
    }}>
      <style>{`
        @keyframes gateShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        @keyframes gatePulse {
          0%, 100% { box-shadow: 0 0 20px rgba(0,255,212,0.2), 0 0 60px rgba(0,255,212,0.05); }
          50% { box-shadow: 0 0 40px rgba(0,255,212,0.4), 0 0 80px rgba(0,255,212,0.1); }
        }
        @keyframes gateGlow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>

      <div style={{
        border: "1px solid rgba(0,255,212,0.4)",
        background: "rgba(3,3,5,0.98)",
        padding: "48px 40px",
        maxWidth: "440px",
        width: "90%",
        animation: shake ? "gateShake 0.5s ease" : "gatePulse 3s ease-in-out infinite",
        textAlign: "center",
      }}>
        {/* Lock icon pulse */}
        <div style={{
          width: "64px", height: "64px",
          border: "2px solid rgba(0,255,212,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px",
          background: "rgba(0,255,212,0.05)",
          animation: "gateGlow 2s ease-in-out infinite",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00FFD4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "10px",
          color: "rgba(0,255,212,0.5)",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          marginBottom: "8px",
        }}>
          SCSS AB ADVOCATE // ACCESS CONTROL
        </p>

        <h1 style={{
          fontFamily: "'Unbounded', sans-serif",
          fontSize: "28px",
          fontWeight: "900",
          color: "#00FFD4",
          letterSpacing: "-0.02em",
          marginBottom: "24px",
          lineHeight: "1.1",
        }}>
          SYSTEM_LOCK
        </h1>

        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "14px",
          color: "#F8F8F8",
          marginBottom: "6px",
          letterSpacing: "0.1em",
        }}>
          QUERY: <span style={{ color: "#A855F7", fontWeight: "bold" }}>PUG_BUD</span>
        </p>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "11px",
          color: "rgba(0,255,212,0.4)",
          marginBottom: "28px",
        }}>
          Enter access passphrase to continue
        </p>

        <form onSubmit={handleSubmit}>
          <input
            data-testid="gate-input"
            type="password"
            value={answer}
            onChange={e => { setAnswer(e.target.value); setError(false); }}
            placeholder="PASSPHRASE..."
            autoFocus
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "rgba(0,255,212,0.05)",
              border: `1px solid ${error ? "#EF4444" : "rgba(0,255,212,0.4)"}`,
              color: "#F8F8F8",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "16px",
              padding: "12px 16px",
              letterSpacing: "0.3em",
              outline: "none",
              marginBottom: "8px",
              textAlign: "center",
              textTransform: "uppercase",
            }}
          />
          {error && (
            <p data-testid="gate-error" style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              color: "#EF4444",
              marginBottom: "12px",
              letterSpacing: "0.1em",
            }}>
              ACCESS_DENIED — INVALID PASSPHRASE
            </p>
          )}
          <button
            type="submit"
            data-testid="gate-submit"
            style={{
              width: "100%",
              background: "rgba(0,255,212,0.15)",
              border: "1px solid rgba(0,255,212,0.5)",
              color: "#00FFD4",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "13px",
              fontWeight: "bold",
              padding: "12px",
              cursor: "pointer",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.target.style.background = "rgba(0,255,212,0.25)"; e.target.style.boxShadow = "0 0 16px rgba(0,255,212,0.2)"; }}
            onMouseLeave={e => { e.target.style.background = "rgba(0,255,212,0.15)"; e.target.style.boxShadow = "none"; }}
          >
            AUTHENTICATE
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => !!sessionStorage.getItem(GATE_KEY));
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedModel, setSelectedModel] = useState("claude");
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailPanel, setShowEmailPanel] = useState(false);
  const [emailCount, setEmailCount] = useState(0);
  const [activeTab, setActiveTab] = useState("chat"); // "chat" | "converter"
  const [showDebug, setShowDebug] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load sessions on mount
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/sessions`);
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (e) {
      console.error("Failed to load sessions", e);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    // Load email count
    fetch(`${API}/api/emails`)
      .then(r => r.json())
      .then(d => setEmailCount(d.total || 0))
      .catch(() => {});
  }, [loadSessions]);

  // Load messages for active session
  const loadMessages = useCallback(async (sessionId) => {
    try {
      const res = await fetch(`${API}/api/sessions/${sessionId}/messages`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (e) {
      console.error("Failed to load messages", e);
    }
  }, []);

  useEffect(() => {
    if (activeSession) {
      loadMessages(activeSession.id);
    } else {
      setMessages([]);
    }
  }, [activeSession, loadMessages]);

  const createSession = async (title) => {
    try {
      const res = await fetch(`${API}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || null, model: selectedModel }),
      });
      const session = await res.json();
      setSessions(prev => [session, ...prev]);
      setActiveSession(session);
      setMessages([]);
    } catch (e) {
      console.error("Failed to create session", e);
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      await fetch(`${API}/api/sessions/${sessionId}`, { method: "DELETE" });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        setMessages([]);
      }
    } catch (e) {
      console.error("Failed to delete session", e);
    }
  };

  const sendMessage = async (content) => {
    if (!content.trim() || isLoading) return;

    let sessionId = activeSession?.id;

    // Auto-create session if none active
    if (!sessionId) {
      try {
        const res = await fetch(`${API}/api/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: content.slice(0, 60),
            model: selectedModel,
          }),
        });
        const session = await res.json();
        setSessions(prev => [session, ...prev]);
        setActiveSession(session);
        sessionId = session.id;
      } catch (e) {
        console.error("Failed to auto-create session", e);
        return;
      }
    }

    // Optimistic UI — add user message
    const userMsg = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
      model: selectedModel,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: content,
          model: selectedModel,
          search_enabled: true,
        }),
      });

      if (!res.ok) {
        // Safely parse error — response may be HTML (proxy timeout) not JSON
        let errDetail = `Server error (${res.status})`;
        try {
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const errData = await res.json();
            errDetail = errData.detail || errDetail;
          } else {
            const txt = await res.text();
            // Extract a meaningful snippet, not raw HTML
            const clean = txt.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
            errDetail = `Server error (${res.status}): ${clean.slice(0, 120)}`;
          }
        } catch (_) { /* keep default errDetail */ }
        throw new Error(errDetail);
      }

      // Safely parse success response
      let data;
      try {
        data = await res.json();
      } catch (_) {
        throw new Error("Received invalid response from server. Please try again.");
      }

      // Add AI response
      const aiMsg = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString(),
        model: data.model,
        citations: data.citations || [],
      };
      setMessages(prev => [...prev, aiMsg]);

      // Refresh session list to update message count
      loadSessions();
    } catch (e) {
      const errMsg = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `**Error:** ${e.message}. Please try again.`,
        timestamp: new Date().toISOString(),
        model: selectedModel,
        isError: true,
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!unlocked && <SecurityGate onUnlock={() => setUnlocked(true)} />}
      <div
        className="flex flex-col h-screen w-screen overflow-hidden"
        style={{ background: "#030305", color: "#F8F8F8" }}
      >
      <Header
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        showEmailPanel={showEmailPanel}
        onToggleEmailPanel={() => setShowEmailPanel(v => !v)}
        emailCount={emailCount}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenDebug={() => setShowDebug(true)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
      />

      <div className="flex flex-1 overflow-hidden">
        {activeTab === "chat" ? (
          <>
            {/* Left Sidebar */}
            <Sidebar
              sessions={sessions}
              activeSession={activeSession}
              onSelectSession={(s) => { setActiveSession(s); setSidebarOpen(false); }}
              onNewSession={createSession}
              onDeleteSession={deleteSession}
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />

            {/* Main Chat Area */}
            <ChatArea
              messages={messages}
              isLoading={isLoading}
              onSendMessage={sendMessage}
              activeSession={activeSession}
              selectedModel={selectedModel}
            />

            {/* Right Email Panel */}
            {showEmailPanel && (
              <EmailPanel
                apiUrl={API}
                onEmailCountChange={setEmailCount}
                onAttachToChat={(emailContent) => {
                  sendMessage(`[EMAIL REFERENCE]\n\n${emailContent}`);
                }}
              />
            )}
          </>
        ) : (
          <EmailConverter onSendToAdvocate={async (emailObj) => {
            // emailObj: { subject, sender, recipients, email_date, body_text, structured_json, has_attachments, attachment_count, attachment_names }
            try {
              const sj = emailObj.structured_json || {};
              // Build clean body: structured JSON fields + clean_body
              const attachLine = emailObj.attachment_count
                ? `\nAttachments (${emailObj.attachment_count}): ${emailObj.attachment_names || ""}`
                : "";
              const cleanBody = sj.clean_body || emailObj.body_text || "";
              const body = `Subject: ${emailObj.subject}\nFrom: ${emailObj.sender}\nTo: ${emailObj.recipients || ""}${attachLine}\nWord Count: ${sj.body_word_count || cleanBody.split(" ").length}\n\n${cleanBody}`;

              // Build attachment summary string for context
              const attachments_summary = (sj.attachments || [])
                .map(a => `${a.filename} (${a.content_type}, ${Math.round((a.size || 0) / 1024)} KB)`)
                .join(", ");

              await fetch(`${API}/api/emails`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  subject: emailObj.subject || "Converted Email",
                  sender: emailObj.sender || "Unknown",
                  recipients: emailObj.recipients || "",
                  body,
                  email_date: emailObj.email_date
                    ? (typeof emailObj.email_date === "string"
                        ? emailObj.email_date
                        : new Date(emailObj.email_date).toISOString())
                    : null,
                  attachments_summary,
                }),
              });
              fetch(`${API}/api/emails`).then(r => r.json()).then(d => setEmailCount(d.total || 0)).catch(() => {});
            } catch (e) {
              console.error("Failed to save email reference", e);
            }
            setActiveTab("chat");
            setShowEmailPanel(true);
          }} />
        )}
      </div>

      {showDebug && <DebugPanel onClose={() => setShowDebug(false)} />}
    </div>
    </>
  );
}
