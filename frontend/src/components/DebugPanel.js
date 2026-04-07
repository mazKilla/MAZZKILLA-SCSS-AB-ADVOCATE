import React, { useState, useCallback } from "react";
import {
  X, Activity, Database, Zap, Globe, Server,
  CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

export default function DebugPanel({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  const runCheck = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/debug`);
      const d = await res.json();
      setData(d);
      setLastChecked(new Date().toLocaleTimeString("en-CA"));
    } catch (e) {
      setData({ overall: "error", error: e.message, checks: {} });
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run on mount
  React.useEffect(() => { runCheck(); }, [runCheck]);

  const overallColor = !data ? "#A1A1AA"
    : data.overall === "healthy" ? "#00FFD4"
    : data.overall === "degraded" ? "#F59E0B"
    : "#EF4444";

  return (
    <div
      data-testid="debug-panel"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: "680px",
          maxWidth: "95vw",
          maxHeight: "85vh",
          background: "#030305",
          border: "1px solid rgba(0,255,212,0.35)",
          boxShadow: "0 0 40px rgba(0,255,212,0.12)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "10px 16px",
          borderBottom: "1px solid rgba(0,255,212,0.2)",
          background: "rgba(0,255,212,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Activity size={14} style={{ color: "#00FFD4" }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#00FFD4", textTransform: "uppercase", letterSpacing: "0.15em" }}>
              SYS.DIAGNOSTICS // DEBUG & HEALTH CHECK
            </span>
            {data && (
              <span style={{
                padding: "2px 8px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: overallColor,
                border: `1px solid ${overallColor}`,
                background: `${overallColor}15`,
                textTransform: "uppercase",
              }}>
                {data.overall}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              data-testid="debug-refresh"
              onClick={runCheck}
              disabled={loading}
              style={{ background: "none", border: "none", cursor: loading ? "wait" : "pointer", color: "#A1A1AA", padding: "4px" }}
            >
              <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#A1A1AA", padding: "4px" }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>

          {loading && !data ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", gap: "12px", color: "#00FFD4" }}>
              <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", letterSpacing: "0.1em" }}>RUNNING DIAGNOSTICS...</span>
            </div>
          ) : data ? (
            <>
              {/* Timestamp */}
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "rgba(161,161,170,0.5)", textAlign: "right" }}>
                Last checked: {lastChecked} {loading && "· refreshing..."}
              </p>

              {/* MongoDB */}
              <CheckSection
                icon={<Database size={14} />}
                title="MONGODB"
                status={data.checks?.mongodb?.status}
                details={data.checks?.mongodb}
                renderExtra={d => d.collections && (
                  <div style={{ marginTop: "8px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                    {Object.entries(d.collections).map(([name, count]) => (
                      <div key={name} style={{ padding: "6px 10px", background: "rgba(0,255,212,0.04)", border: "1px solid rgba(0,255,212,0.12)" }}>
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "rgba(0,255,212,0.5)", marginBottom: "2px", textTransform: "uppercase" }}>{name}</p>
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "16px", fontWeight: "bold", color: "#00FFD4" }}>{count}</p>
                      </div>
                    ))}
                  </div>
                )}
              />

              {/* Claude */}
              <CheckSection
                icon={<Zap size={14} />}
                title="CLAUDE SONNET 4.5 (ANTHROPIC)"
                status={data.checks?.claude?.status}
                details={data.checks?.claude}
                renderExtra={d => (
                  <div style={{ marginTop: "6px", display: "flex", gap: "16px" }}>
                    <KV label="Key" value={d.key_prefix || "—"} />
                    <KV label="Model" value={d.model} />
                  </div>
                )}
              />

              {/* Grok */}
              <CheckSection
                icon={<Zap size={14} style={{ color: "#A855F7" }} />}
                title="GROK 3 (xAI)"
                status={data.checks?.grok?.status}
                details={data.checks?.grok}
                accentColor="#A855F7"
                renderExtra={d => (
                  <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                      <KV label="Key" value={d.key_prefix || "—"} />
                      {d.model && <KV label="Active Model" value={d.model} />}
                      {d.response_sample && <KV label="Test Response" value={`"${d.response_sample}"`} />}
                      {d.note && <KV label="Note" value={d.note} color="#F59E0B" />}
                    </div>
                    {d.status === "no_credits" && (
                      <div style={{ marginTop: "6px", padding: "8px 10px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#F59E0B" }}>
                          ACTION REQUIRED: xAI account has no credits or licenses.
                        </p>
                        <a
                          href={d.credits_url || "https://console.x.ai"}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#00FFD4", textDecoration: "underline" }}
                        >
                          {d.credits_url || "https://console.x.ai"} → Add Credits
                        </a>
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "rgba(161,161,170,0.6)" }}>
                          Claude Sonnet 4.5 remains fully operational.
                        </p>
                      </div>
                    )}
                    {d.error && d.status !== "no_credits" && <KV label="Error" value={d.error} color="#EF4444" mono={false} />}
                  </div>
                )}
              />

              {/* Web Search */}
              <CheckSection
                icon={<Globe size={14} />}
                title="WEB SEARCH (DuckDuckGo)"
                status={data.checks?.web_search?.status}
                details={data.checks?.web_search}
                renderExtra={d => d.test_result_count != null && (
                  <div style={{ marginTop: "6px" }}>
                    <KV label="Test Results" value={`${d.test_result_count} result(s) returned`} />
                  </div>
                )}
              />

              {/* System */}
              <CheckSection
                icon={<Server size={14} />}
                title="SYSTEM"
                status="info"
                details={data.checks?.system}
                renderExtra={d => (
                  <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <KV label="Python" value={d?.python?.split(" ")[0]} />
                    <KV label="DB Name" value={d?.db_name} />
                    <KV label="Env Loaded" value={d?.env_loaded ? "All keys present" : "MISSING KEYS"} color={d?.env_loaded ? "#00FFD4" : "#EF4444"} />
                    <KV label="Platform" value={d?.platform} />
                  </div>
                )}
              />

              {/* Raw JSON toggle */}
              <RawJson data={data} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === "ok" || status === "ok_fallback") return <CheckCircle2 size={14} style={{ color: "#00FFD4", flexShrink: 0 }} />;
  if (status === "error") return <XCircle size={14} style={{ color: "#EF4444", flexShrink: 0 }} />;
  if (status === "missing_key") return <AlertTriangle size={14} style={{ color: "#F59E0B", flexShrink: 0 }} />;
  if (status === "no_credits") return <AlertTriangle size={14} style={{ color: "#F59E0B", flexShrink: 0 }} />;
  if (status === "info") return <Activity size={14} style={{ color: "#A855F7", flexShrink: 0 }} />;
  return <Activity size={14} style={{ color: "#A1A1AA", flexShrink: 0 }} />;
}

function statusColor(s) {
  if (s === "ok" || s === "ok_fallback") return "#00FFD4";
  if (s === "error") return "#EF4444";
  if (s === "missing_key" || s === "no_credits") return "#F59E0B";
  return "#A855F7";
}

function CheckSection({ icon, title, status, details, renderExtra, accentColor = "#00FFD4" }) {
  const color = statusColor(status);
  return (
    <div style={{
      border: `1px solid ${color}25`,
      background: `${color}04`,
      padding: "12px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
        <span style={{ color: accentColor }}>{icon}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: accentColor, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: "bold" }}>
          {title}
        </span>
        <StatusIcon status={status} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color, marginLeft: "2px", textTransform: "uppercase" }}>
          {status}
        </span>
      </div>
      {renderExtra && details && renderExtra(details)}
    </div>
  );
}

function KV({ label, value, color = "#A1A1AA", mono = true }) {
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "rgba(161,161,170,0.5)", whiteSpace: "nowrap" }}>{label}:</span>
      <span style={{ fontFamily: mono ? "'JetBrains Mono', monospace" : "'IBM Plex Sans', sans-serif", fontSize: "10px", color, wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

function RawJson({ data }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <button
        onClick={() => setShow(v => !v)}
        style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "#A1A1AA", padding: "4px 10px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em" }}
      >
        {show ? "HIDE" : "SHOW"} RAW JSON
      </button>
      {show && (
        <pre style={{
          marginTop: "8px", background: "#030305", border: "1px solid rgba(255,255,255,0.1)",
          padding: "12px", overflowX: "auto", fontSize: "10px", color: "#A1A1AA",
          fontFamily: "'JetBrains Mono', monospace", lineHeight: "1.5", maxHeight: "300px", overflowY: "auto",
        }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
