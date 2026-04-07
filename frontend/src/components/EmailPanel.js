import React, { useState, useEffect, useCallback } from "react";
import {
  Mail, Plus, Search, X, Send, ChevronRight, FileText, Trash2,
  Globe, Loader2, ExternalLink, BookOpen
} from "lucide-react";

export default function EmailPanel({ apiUrl, onEmailCountChange, onAttachToChat }) {
  const [tab, setTab] = useState("emails");
  const [emails, setEmails] = useState([]);
  const [total, setTotal] = useState(0);
  const [searchQ, setSearchQ] = useState("");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Policy docs state
  const [policyDocs, setPolicyDocs] = useState([]);
  const [crawlUrl, setCrawlUrl] = useState("");
  const [crawling, setCrawling] = useState(false);
  const [crawlError, setCrawlError] = useState(null);
  const [crawlSuccess, setCrawlSuccess] = useState(null);

  const loadEmails = useCallback(async (q = "") => {
    setIsLoading(true);
    try {
      const url = q
        ? `${apiUrl}/api/emails?q=${encodeURIComponent(q)}&limit=50`
        : `${apiUrl}/api/emails?limit=50`;
      const res = await fetch(url);
      const data = await res.json();
      setEmails(data.emails || []);
      setTotal(data.total || 0);
      onEmailCountChange(data.total || 0);
    } catch (e) {
      console.error("Failed to load emails", e);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, onEmailCountChange]);

  const loadPolicyDocs = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/policy/docs`);
      const data = await res.json();
      setPolicyDocs(data.docs || []);
    } catch (e) {
      console.error("Failed to load policy docs", e);
    }
  }, [apiUrl]);

  useEffect(() => { loadEmails(); }, [loadEmails]);
  useEffect(() => { if (tab === "policy") loadPolicyDocs(); }, [tab, loadPolicyDocs]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadEmails(searchQ);
  };

  const deleteEmail = async (id) => {
    await fetch(`${apiUrl}/api/emails/${id}`, { method: "DELETE" });
    loadEmails(searchQ);
  };

  const handleCrawl = async (e) => {
    e.preventDefault();
    if (!crawlUrl.trim()) return;
    setCrawling(true);
    setCrawlError(null);
    setCrawlSuccess(null);
    try {
      const res = await fetch(`${apiUrl}/api/policy/crawl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: crawlUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Crawl failed");
      setCrawlSuccess(data.already_exists ? `Already saved: ${data.doc?.title}` : `Saved: ${data.title}`);
      setCrawlUrl("");
      loadPolicyDocs();
    } catch (err) {
      setCrawlError(err.message);
    } finally {
      setCrawling(false);
    }
  };

  const deletePolicy = async (id) => {
    await fetch(`${apiUrl}/api/policy/docs/${id}`, { method: "DELETE" });
    loadPolicyDocs();
  };

  const TAB_STYLE = (active) => ({
    flex: 1, padding: "6px",
    background: active ? "rgba(0,255,212,0.06)" : "transparent",
    border: "none",
    borderBottom: active ? "2px solid #00FFD4" : "2px solid transparent",
    color: active ? "#00FFD4" : "#A1A1AA",
    fontFamily: "'JetBrains Mono', monospace", fontSize: "10px",
    textTransform: "uppercase", letterSpacing: "0.1em",
    cursor: "pointer", transition: "all 0.15s",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
  });

  return (
    <aside
      data-testid="email-references-panel"
      className="flex flex-col shrink-0"
      style={{ width: "320px", borderLeft: "1px solid rgba(255,255,255,0.08)", background: "#030305" }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2">
          <Mail size={14} style={{ color: "#A855F7" }} />
          <span className="text-xs tracking-widest uppercase" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#A855F7" }}>
            {tab === "emails" ? "Email References" : "Policy Docs"}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(168,85,247,0.1)", color: "rgba(168,85,247,0.7)", fontFamily: "'JetBrains Mono', monospace" }}>
            {tab === "emails" ? total : policyDocs.length}
          </span>
        </div>
        {tab === "emails" && (
          <button
            data-testid="add-email-button"
            onClick={() => setShowAddForm(v => !v)}
            className="p-1.5 rounded transition-colors"
            style={{ background: showAddForm ? "rgba(168,85,247,0.15)" : "transparent", border: "1px solid rgba(168,85,247,0.3)", color: "#A855F7", cursor: "pointer" }}
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button style={TAB_STYLE(tab === "emails")} onClick={() => setTab("emails")} data-testid="tab-emails">
          <Mail size={11} /> Refs
        </button>
        <button style={TAB_STYLE(tab === "policy")} onClick={() => setTab("policy")} data-testid="tab-policy">
          <BookOpen size={11} /> Policy Docs
        </button>
      </div>

      {/* ── EMAIL REFS TAB ── */}
      {tab === "emails" && (
        <>
          {showAddForm && (
            <AddEmailForm
              apiUrl={apiUrl}
              onSuccess={() => { loadEmails(searchQ); setShowAddForm(false); }}
              onCancel={() => setShowAddForm(false)}
            />
          )}
          <form onSubmit={handleSearch} className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Search size={12} style={{ color: "#A1A1AA", flexShrink: 0 }} />
            <input
              data-testid="email-search-input"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search emails..."
              className="flex-1 bg-transparent text-xs outline-none"
              style={{ color: "#F8F8F8", fontFamily: "'IBM Plex Sans', sans-serif" }}
            />
            {searchQ && (
              <button type="button" onClick={() => { setSearchQ(""); loadEmails(""); }} style={{ background: "none", border: "none", color: "#A1A1AA", cursor: "pointer" }}>
                <X size={11} />
              </button>
            )}
          </form>

          {selectedEmail ? (
            <EmailDetail
              email={selectedEmail}
              onBack={() => setSelectedEmail(null)}
              onAttach={() => {
                const content = `From: ${selectedEmail.sender}\nTo: ${selectedEmail.recipients}\nSubject: ${selectedEmail.subject}\nDate: ${selectedEmail.email_date}\n\n${selectedEmail.body}`;
                onAttachToChat(content);
                setSelectedEmail(null);
              }}
              onDelete={() => { deleteEmail(selectedEmail.id); setSelectedEmail(null); }}
            />
          ) : (
            <div data-testid="email-list" className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-6 text-center" style={{ color: "#A1A1AA", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>Loading...</div>
              ) : emails.length === 0 ? (
                <div className="p-6 text-center">
                  <FileText size={24} style={{ color: "rgba(255,255,255,0.15)", margin: "0 auto 8px" }} />
                  <p style={{ color: "#A1A1AA", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>No email references yet.</p>
                  <p style={{ color: "rgba(161,161,170,0.4)", fontSize: "11px", marginTop: "4px" }}>Add emails to reference in cases.</p>
                </div>
              ) : (
                emails.map(email => (
                  <EmailCard key={email.id} email={email} onClick={() => setSelectedEmail(email)} />
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* ── POLICY DOCS TAB ── */}
      {tab === "policy" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Crawl URL form */}
          <form
            onSubmit={handleCrawl}
            style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,255,212,0.02)" }}
          >
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#00FFD4", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: "4px" }}>
              <Globe size={10} /> Crawl Alberta.ca URL
            </p>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                data-testid="policy-crawl-input"
                value={crawlUrl}
                onChange={e => { setCrawlUrl(e.target.value); setCrawlError(null); setCrawlSuccess(null); }}
                placeholder="https://www.alberta.ca/..."
                style={{
                  flex: 1, background: "#08080C", border: "1px solid rgba(0,255,212,0.3)",
                  color: "#F8F8F8", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "12px",
                  padding: "5px 8px", outline: "none",
                }}
              />
              <button
                type="submit"
                data-testid="policy-crawl-btn"
                disabled={crawling || !crawlUrl.trim()}
                style={{
                  background: "rgba(0,255,212,0.12)", border: "1px solid rgba(0,255,212,0.4)",
                  color: "#00FFD4", padding: "5px 10px", cursor: crawling ? "wait" : "pointer",
                  display: "flex", alignItems: "center", gap: "4px",
                  fontFamily: "'JetBrains Mono', monospace", opacity: crawling ? 0.6 : 1,
                }}
              >
                {crawling ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Globe size={12} />}
              </button>
            </div>
            {crawlError && <p style={{ color: "#EF4444", fontSize: "11px", marginTop: "4px", fontFamily: "'JetBrains Mono', monospace" }}>{crawlError}</p>}
            {crawlSuccess && <p style={{ color: "#00FFD4", fontSize: "11px", marginTop: "4px", fontFamily: "'JetBrains Mono', monospace" }}>{crawlSuccess}</p>}
          </form>

          {/* Policy doc list */}
          <div className="flex-1 overflow-y-auto">
            {policyDocs.length === 0 ? (
              <div className="p-6 text-center">
                <BookOpen size={24} style={{ color: "rgba(255,255,255,0.15)", margin: "0 auto 8px" }} />
                <p style={{ color: "#A1A1AA", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>No policy docs crawled yet.</p>
                <p style={{ color: "rgba(161,161,170,0.4)", fontSize: "11px", marginTop: "4px" }}>Paste an Alberta.ca URL above to crawl it.</p>
              </div>
            ) : (
              policyDocs.map(doc => (
                <div
                  key={doc.id}
                  data-testid={`policy-doc-${doc.id}`}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "10px 12px", display: "flex", gap: "8px", alignItems: "flex-start" }}
                >
                  <BookOpen size={13} style={{ color: "#00FFD4", flexShrink: 0, marginTop: "2px" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "12px", color: "#F8F8F8", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "2px" }}>
                      {doc.title || doc.url}
                    </p>
                    <p style={{ fontSize: "10px", color: "#A1A1AA", fontFamily: "'JetBrains Mono', monospace" }}>
                      {doc.word_count?.toLocaleString()} words · {new Date(doc.crawled_at).toLocaleDateString("en-CA")}
                    </p>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "10px", color: "rgba(0,255,212,0.5)", display: "inline-flex", alignItems: "center", gap: "2px", marginTop: "2px" }}>
                      <ExternalLink size={9} /> source
                    </a>
                  </div>
                  <button
                    onClick={() => deletePolicy(doc.id)}
                    data-testid={`delete-policy-${doc.id}`}
                    style={{ background: "none", border: "none", color: "rgba(239,68,68,0.4)", cursor: "pointer", padding: "2px", flexShrink: 0 }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </aside>
  );
}

function EmailCard({ email, onClick }) {
  return (
    <div
      data-testid={`email-card-${email.id}`}
      className="p-4 cursor-pointer transition-colors"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      onClick={onClick}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <div className="flex items-start gap-2">
        <Mail size={11} style={{ color: "rgba(168,85,247,0.5)", marginTop: "3px", flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm" style={{ color: "#F8F8F8", fontFamily: "'IBM Plex Sans', sans-serif" }}>
            {email.subject || "(No Subject)"}
          </p>
          <p className="truncate" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "rgba(161,161,170,0.6)", marginTop: "2px" }}>
            {email.sender}
          </p>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "rgba(161,161,170,0.4)", marginTop: "1px" }}>
            {email.email_date ? new Date(email.email_date).toLocaleDateString("en-CA") : "No date"}
          </p>
        </div>
        <ChevronRight size={12} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
      </div>
    </div>
  );
}

function EmailDetail({ email, onBack, onAttach, onDelete }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onBack} className="p-1 rounded" style={{ background: "none", border: "none", color: "#A1A1AA", cursor: "pointer" }}>
          <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} />
        </button>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#A1A1AA", flex: 1 }} className="truncate">
          {email.subject}
        </span>
      </div>
      <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <MetaRow label="From" value={email.sender} />
        <MetaRow label="To" value={email.recipients} />
        <MetaRow label="Date" value={email.email_date ? new Date(email.email_date).toLocaleDateString("en-CA") : "N/A"} />
        {email.case_id && <MetaRow label="Case" value={email.case_id} />}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <pre style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "12px", color: "#A1A1AA", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: "1.6" }}>
          {email.body || "(No body)"}
        </pre>
      </div>
      <div className="p-3 flex gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          data-testid="attach-email-to-chat"
          onClick={onAttach}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded text-xs"
          style={{ background: "rgba(0,255,212,0.1)", border: "1px solid rgba(0,255,212,0.3)", color: "#00FFD4", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}
        >
          <Send size={11} /> Attach to Chat
        </button>
        <button
          data-testid="delete-email-btn"
          onClick={onDelete}
          className="p-2 rounded"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.7)", cursor: "pointer" }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="flex gap-2 mb-1">
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#A855F7", width: "36px", flexShrink: 0 }}>{label}:</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#A1A1AA", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

function AddEmailForm({ apiUrl, onSuccess, onCancel }) {
  const [form, setForm] = useState({ subject: "", sender: "", recipients: "", body: "", email_date: "", case_id: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`${apiUrl}/api/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: form.subject, sender: form.sender, recipients: form.recipients,
          body: form.body, email_date: form.email_date || null, case_id: form.case_id || null,
        }),
      });
      onSuccess();
    } catch (e) {
      console.error("Failed to add email", e);
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = {
    background: "#08080C", border: "1px solid rgba(255,255,255,0.1)",
    color: "#F8F8F8", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "12px",
    padding: "6px 10px", borderRadius: "4px", width: "100%",
  };

  return (
    <form data-testid="add-email-form" onSubmit={handleSubmit} className="p-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(168,85,247,0.03)" }}>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#A855F7", marginBottom: "8px", textTransform: "uppercase" }}>
        Add Email Reference
      </p>
      <div className="space-y-2">
        <input placeholder="Subject *" required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} style={fieldStyle} data-testid="email-subject-input" />
        <input placeholder="From (sender) *" required value={form.sender} onChange={e => setForm(f => ({ ...f, sender: e.target.value }))} style={fieldStyle} data-testid="email-sender-input" />
        <input placeholder="To (recipients)" value={form.recipients} onChange={e => setForm(f => ({ ...f, recipients: e.target.value }))} style={fieldStyle} data-testid="email-recipients-input" />
        <input placeholder="Date (YYYY-MM-DD)" value={form.email_date} onChange={e => setForm(f => ({ ...f, email_date: e.target.value }))} style={fieldStyle} data-testid="email-date-input" />
        <input placeholder="Case ID (optional)" value={form.case_id} onChange={e => setForm(f => ({ ...f, case_id: e.target.value }))} style={fieldStyle} data-testid="email-caseid-input" />
        <textarea placeholder="Email body *" required rows={4} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} style={{ ...fieldStyle, resize: "vertical" }} data-testid="email-body-input" />
      </div>
      <div className="flex gap-2 mt-2">
        <button type="submit" disabled={saving} className="flex-1 py-1.5 rounded text-xs" style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7", border: "1px solid rgba(168,85,247,0.3)", cursor: saving ? "wait" : "pointer", fontFamily: "'JetBrains Mono', monospace" }} data-testid="save-email-button">
          {saving ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="flex-1 py-1.5 rounded text-xs" style={{ background: "transparent", color: "#A1A1AA", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
