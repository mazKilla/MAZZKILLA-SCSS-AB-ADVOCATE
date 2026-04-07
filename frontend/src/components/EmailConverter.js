import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Upload, Loader2, AlertCircle, CheckCircle2, Clock, RefreshCw,
  AlertTriangle, FileCode, Eye, Trash2, ArrowLeft, Download,
  FileArchive, Mail, Paperclip, User, Calendar, AlignLeft, Zap,
  FolderOpen, FileText, File, CheckSquare, Square, Send
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const ACCEPTED_EXTS = ["eml", "mbox", "pdf", "txt", "text", "html", "htm", "msg"];
const ACCEPT_STR = ".eml,.mbox,.pdf,.txt,.text,.html,.htm,.msg";

function getFileIcon(filename) {
  const ext = (filename || "").split(".").pop().toLowerCase();
  if (ext === "pdf") return <File size={12} style={{ color: "#F87171" }} />;
  if (["txt", "text"].includes(ext)) return <FileText size={12} style={{ color: "#A1A1AA" }} />;
  if (["html", "htm"].includes(ext)) return <FileCode size={12} style={{ color: "#FBBF24" }} />;
  return <Mail size={12} style={{ color: "#00FFD4" }} />;
}

// ── Terminal UI primitives ──────────────────────────────────────────────
function TWindow({ children, title, style }) {
  return (
    <div style={{
      border: "1px solid rgba(0,255,212,0.4)",
      background: "rgba(3,3,5,0.97)",
      boxShadow: "0 0 20px rgba(0,255,212,0.08)",
      position: "relative",
      ...style,
    }}>
      {title && (
        <div style={{
          borderBottom: "1px solid rgba(0,255,212,0.3)",
          background: "rgba(0,255,212,0.07)",
          padding: "4px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#00FFD4", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            {title}
          </span>
          <div style={{ display: "flex", gap: "6px" }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{ width: "8px", height: "8px", background: "rgba(0,255,212,0.3)", display: "block" }} />
            ))}
          </div>
        </div>
      )}
      <div style={{ padding: "16px" }}>{children}</div>
    </div>
  );
}

function TBtn({ children, onClick, variant = "primary", disabled, style, testId, type = "button" }) {
  const base = {
    padding: "6px 16px",
    fontSize: "11px",
    fontFamily: "'JetBrains Mono', monospace",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    border: "none",
    transition: "all 0.15s",
  };
  const variants = {
    primary: { background: "rgba(0,255,212,0.15)", color: "#00FFD4", border: "1px solid rgba(0,255,212,0.5)" },
    outline: { background: "transparent", color: "#00FFD4", border: "1px solid rgba(0,255,212,0.4)" },
    destructive: { background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.4)" },
    ghost: { background: "transparent", color: "#A1A1AA", border: "1px solid transparent" },
    accent: { background: "rgba(168,85,247,0.15)", color: "#A855F7", border: "1px solid rgba(168,85,247,0.5)" },
    success: { background: "rgba(0,255,212,0.2)", color: "#00FFD4", border: "1px solid #00FFD4" },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

function TBadge({ children, variant = "default" }) {
  const variants = {
    default: { color: "rgba(0,255,212,0.7)", border: "1px solid rgba(0,255,212,0.3)", background: "rgba(0,255,212,0.05)" },
    success: { color: "#00FFD4", border: "1px solid #00FFD4", background: "rgba(0,255,212,0.1)" },
    warning: { color: "#F59E0B", border: "1px solid #F59E0B", background: "rgba(245,158,11,0.1)" },
    destructive: { color: "#EF4444", border: "1px solid rgba(239,68,68,0.5)", background: "rgba(239,68,68,0.08)" },
  };
  return (
    <span style={{
      padding: "2px 8px",
      fontSize: "10px",
      fontFamily: "'JetBrains Mono', monospace",
      textTransform: "uppercase",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      ...variants[variant],
    }}>
      {children}
    </span>
  );
}

// ── Confirmation Modal ────────────────────────────────────────────────
function ConfirmModal({ count, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 999, backdropFilter: "blur(4px)",
    }}>
      <TWindow title="SYS.CONFIRM_ACTION" style={{ maxWidth: "420px", width: "90%" }}>
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <Send size={32} style={{ color: "#A855F7", margin: "0 auto 12px" }} />
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: "bold", color: "#F8F8F8", marginBottom: "8px" }}>
            SEND {count} RECORD{count !== 1 ? "S" : ""} TO ADVOCATE?
          </p>
          <p style={{ color: "#A1A1AA", fontSize: "12px", marginBottom: "20px", lineHeight: "1.6" }}>
            {count} selected item{count !== 1 ? "s" : ""} will be dispatched to the AI Advocate for analysis. This will switch to the Chat tab.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <TBtn variant="ghost" onClick={onCancel}>CANCEL</TBtn>
            <TBtn variant="accent" onClick={onConfirm} testId="confirm-bulk-send">
              <Zap size={13} /> CONFIRM_DISPATCH
            </TBtn>
          </div>
        </div>
      </TWindow>
    </div>
  );
}

// ── Upload Zone ──────────────────────────────────────────────────────
function UploadZone({ onUploadDone }) {
  const [dragging, setDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const dragCounter = useRef(0); // prevents false onDragLeave fires on child elements

  const filterFiles = (fileList) => {
    return Array.from(fileList).filter(f => {
      const ext = f.name.split(".").pop().toLowerCase();
      return ACCEPTED_EXTS.includes(ext);
    });
  };

  const uploadFiles = useCallback(async (files) => {
    if (!files.length) {
      setGlobalError("No supported files found. Accepted: " + ACCEPTED_EXTS.join(", "));
      return;
    }
    setGlobalError(null);
    const queue = files.map(f => ({ file: f, status: "pending", error: null }));
    setUploadQueue(queue);
    setIsUploading(true);

    const updated = [...queue];
    for (let i = 0; i < files.length; i++) {
      updated[i] = { ...updated[i], status: "uploading" };
      setUploadQueue([...updated]);
      try {
        const fd = new FormData();
        fd.append("file", files[i]);
        const res = await fetch(`${API}/api/ec/upload`, { method: "POST", body: fd });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.detail || "Upload failed");
        }
        updated[i] = { ...updated[i], status: "done" };
      } catch (e) {
        updated[i] = { ...updated[i], status: "error", error: e.message };
      }
      setUploadQueue([...updated]);
    }

    setIsUploading(false);
    onUploadDone();
    setTimeout(() => setUploadQueue([]), 3000);
  }, [onUploadDone]);

  const onDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setDragging(true);
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragging(false);
    const files = filterFiles(e.dataTransfer.files);
    if (!files.length) {
      setGlobalError("No supported files in drop. Accepted: " + ACCEPTED_EXTS.join(", "));
      return;
    }
    uploadFiles(files);
  }, [uploadFiles]);

  const onFileChange = (e) => {
    const files = filterFiles(e.target.files);
    if (files.length) uploadFiles(files);
    else setGlobalError("No supported files selected. Accepted: " + ACCEPTED_EXTS.join(", "));
    e.target.value = "";
  };

  const onFolderChange = (e) => {
    const files = filterFiles(e.target.files);
    if (files.length) uploadFiles(files);
    else setGlobalError("No supported files found in folder. Accepted: " + ACCEPTED_EXTS.join(", "));
    e.target.value = "";
  };

  const doneCount = uploadQueue.filter(q => q.status === "done").length;
  const errorCount = uploadQueue.filter(q => q.status === "error").length;

  return (
    <TWindow title="SYS.INPUT_STREAM" style={{ marginBottom: "24px" }}>
      {/* Drag-drop zone */}
      <div
        data-testid="upload-dropzone"
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragging ? "#00FFD4" : "rgba(0,255,212,0.3)"}`,
          background: dragging ? "rgba(0,255,212,0.08)" : "transparent",
          padding: "32px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s",
          position: "relative",
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_STR}
          multiple
          style={{ display: "none" }}
          onChange={onFileChange}
          data-testid="file-upload-input"
        />
        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory="true"
          directory="true"
          multiple
          style={{ display: "none" }}
          onChange={onFolderChange}
          data-testid="folder-upload-input"
        />

        {isUploading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#00FFD4", width: "100%" }}>
            <Loader2 size={36} style={{ marginBottom: "12px", animation: "spin 1s linear infinite" }} />
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "14px", fontWeight: "bold", letterSpacing: "0.2em", marginBottom: "16px" }}>
              PROCESSING {uploadQueue.length} FILE{uploadQueue.length !== 1 ? "S" : ""}...
            </p>
            <div style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {uploadQueue.slice(0, 8).map((q, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace" }}>
                  {q.status === "done" ? <CheckCircle2 size={11} style={{ color: "#00FFD4", flexShrink: 0 }} /> :
                   q.status === "error" ? <AlertCircle size={11} style={{ color: "#EF4444", flexShrink: 0 }} /> :
                   q.status === "uploading" ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite", color: "#A855F7", flexShrink: 0 }} /> :
                   <Clock size={11} style={{ color: "#A1A1AA", flexShrink: 0 }} />}
                  <span style={{ color: q.status === "error" ? "#EF4444" : q.status === "done" ? "#00FFD4" : "#A1A1AA", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {q.file.name}
                  </span>
                </div>
              ))}
              {uploadQueue.length > 8 && (
                <p style={{ color: "rgba(0,255,212,0.5)", fontSize: "10px", fontFamily: "'JetBrains Mono', monospace" }}>
                  +{uploadQueue.length - 8} more...
                </p>
              )}
            </div>
          </div>
        ) : uploadQueue.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#00FFD4" }}>
            <CheckCircle2 size={36} style={{ marginBottom: "10px" }} />
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", letterSpacing: "0.1em" }}>
              {doneCount} UPLOADED — {errorCount > 0 ? `${errorCount} FAILED` : "ALL OK"}
            </p>
          </div>
        ) : (
          <>
            <div style={{
              background: "#030305",
              border: "1px solid rgba(0,255,212,0.4)",
              padding: "14px",
              borderRadius: "50%",
              marginBottom: "14px",
              boxShadow: "0 0 15px rgba(0,255,212,0.15)",
            }}>
              <Upload size={26} style={{ color: dragging ? "#00FFD4" : "rgba(0,255,212,0.6)" }} />
            </div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: "bold", fontSize: "16px", color: "#00FFD4", marginBottom: "6px", letterSpacing: "0.1em" }}>
              DRAG & DROP FILES
            </p>
            <p style={{ color: "#A1A1AA", fontSize: "12px", textAlign: "center", maxWidth: "440px", marginBottom: "8px", lineHeight: "1.6" }}>
              Supports: <span style={{ color: "#00FFD4" }}>.eml  .mbox  .pdf  .txt  .html  .htm  .msg</span>
            </p>
            <p style={{ color: "rgba(0,255,212,0.4)", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", marginBottom: "18px" }}>
              — or —
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
              <TBtn
                variant="outline"
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                testId="select-files-btn"
              >
                <FileCode size={13} /> SELECT_FILES
              </TBtn>
              <TBtn
                variant="primary"
                onClick={e => { e.stopPropagation(); folderInputRef.current?.click(); }}
                testId="select-folder-btn"
              >
                <FolderOpen size={13} /> SELECT_FOLDER
              </TBtn>
            </div>
            <p style={{ color: "rgba(0,255,212,0.35)", fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", marginTop: "10px", textAlign: "center" }}>
              SELECT_FOLDER scans all subfolders recursively
            </p>
          </>
        )}

        {dragging && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,255,212,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)",
            border: "3px solid #00FFD4",
          }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: "bold", fontSize: "22px", color: "#00FFD4", letterSpacing: "0.2em" }}>
              DROP_TO_EXECUTE
            </p>
          </div>
        )}
      </div>

      {globalError && (
        <div style={{
          marginTop: "12px", padding: "12px",
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.4)",
          color: "#EF4444", display: "flex", gap: "10px", fontSize: "13px",
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: "bold", marginBottom: "2px" }}>ERR_UPLOAD_FAILED</p>
            <p>{globalError}</p>
          </div>
        </div>
      )}
    </TWindow>
  );
}


// ── Status Badge ─────────────────────────────────────────────────────
function StatusBadge({ status }) {
  switch (status) {
    case "completed": return <TBadge variant="success"><CheckCircle2 size={10} /> COMPLETED</TBadge>;
    case "processing": return <TBadge variant="warning"><RefreshCw size={10} style={{ animation: "spin 1s linear infinite" }} /> PROCESSING</TBadge>;
    case "pending": return <TBadge variant="default"><Clock size={10} /> PENDING</TBadge>;
    case "failed": return <TBadge variant="destructive"><AlertTriangle size={10} /> FAILED</TBadge>;
    default: return <TBadge>{status}</TBadge>;
  }
}


// ── Jobs Table ───────────────────────────────────────────────────────
const COLUMNS = [
  { key: "JOB_ID", defaultWidth: 100, minWidth: 60 },
  { key: "SOURCE_FILE", defaultWidth: 380, minWidth: 120 },
  { key: "STATUS", defaultWidth: 140, minWidth: 90 },
  { key: "PROGRESS", defaultWidth: 110, minWidth: 70 },
  { key: "TIMESTAMP", defaultWidth: 200, minWidth: 120 },
  { key: "ACTIONS", defaultWidth: 110, minWidth: 80 },
];

function JobsTable({ onViewJob }) {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [colWidths, setColWidths] = useState(() => COLUMNS.map(c => c.defaultWidth));
  const dragRef = useRef(null);
  const limit = 10;
  const prevStatuses = useRef({});
  const pollRef = useRef(null);

  const onResizeStart = useCallback((colIdx, e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = colWidths[colIdx];
    const minW = COLUMNS[colIdx].minWidth;

    const onMove = (ev) => {
      const delta = ev.clientX - startX;
      setColWidths(prev => {
        const next = [...prev];
        next[colIdx] = Math.max(minW, startW + delta);
        return next;
      });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      dragRef.current = null;
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    dragRef.current = colIdx;
  }, [colWidths]);

  const fetchJobs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setFetching(true);
    try {
      const res = await fetch(`${API}/api/ec/jobs?limit=${limit}&offset=${page * limit}`);
      const data = await res.json();
      const newJobs = data.jobs || [];
      setJobs(newJobs);
      setTotal(data.total || 0);

      for (const job of newJobs) {
        const prev = prevStatuses.current[job.id];
        if (prev && prev !== "completed" && job.status === "completed" && job.total_emails > 0) {
          triggerAutoDownload(job.id, job.original_filename);
        }
      }
      const updated = {};
      for (const j of newJobs) updated[j.id] = j.status;
      prevStatuses.current = updated;
    } catch (e) {
      console.error("Jobs fetch error", e);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [page]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  useEffect(() => {
    clearInterval(pollRef.current);
    const hasPending = jobs.some(j => j.status === "pending" || j.status === "processing");
    if (hasPending) {
      pollRef.current = setInterval(() => fetchJobs(true), 2000);
    }
    return () => clearInterval(pollRef.current);
  }, [jobs, fetchJobs]);

  const deleteJob = async (id) => {
    if (!window.confirm(`Execute deletion of job? This cannot be undone.`)) return;
    await fetch(`${API}/api/ec/jobs/${id}`, { method: "DELETE" });
    fetchJobs();
  };

  const wipeAll = async () => {
    if (!window.confirm(`WIPE ALL conversion history? This permanently deletes all jobs, parsed emails, and attachments. This cannot be undone.`)) return;
    setWiping(true);
    try {
      await fetch(`${API}/api/ec/wipe`, { method: "DELETE" });
      setPage(0);
      fetchJobs();
    } catch (e) {
      alert("Wipe failed: " + e.message);
    } finally {
      setWiping(false);
    }
  };

  const thBase = { padding: "8px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#00FFD4", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: "normal", borderBottom: "1px solid rgba(0,255,212,0.2)", textAlign: "left", background: "rgba(0,255,212,0.05)", position: "relative", overflow: "hidden" };
  const tdStyle = { padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", verticalAlign: "middle", overflow: "hidden" };

  return (
    <TWindow title="SYS.DB_RECORDS // jobs_queue">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: "bold", color: "#00FFD4", letterSpacing: "0.1em" }}>
            CONVERSION_HISTORY
          </span>
          {fetching && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "rgba(0,255,212,0.5)" }}>fetching updates...</span>}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <TBtn variant="outline" onClick={() => fetchJobs(true)} style={{ padding: "4px 10px" }}>
            <RefreshCw size={11} style={{ animation: fetching ? "spin 1s linear infinite" : "none" }} />
            SYNC
          </TBtn>
          {jobs.length > 0 && (
            <TBtn
              variant="destructive"
              onClick={wipeAll}
              disabled={wiping}
              style={{ padding: "4px 10px" }}
              testId="wipe-database-btn"
            >
              {wiping
                ? <><Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> WIPING...</>
                : <><Trash2 size={11} /> WIPE_DB</>
              }
            </TBtn>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "48px", display: "flex", flexDirection: "column", alignItems: "center", color: "rgba(0,255,212,0.5)" }}>
          <div style={{ width: "28px", height: "28px", border: "2px solid rgba(0,255,212,0.2)", borderTop: "2px solid #00FFD4", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "12px" }} />
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", letterSpacing: "0.2em" }}>QUERYING_DATABASE...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", border: "1px dashed rgba(0,255,212,0.15)", background: "rgba(0,255,212,0.02)", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <FileCode size={40} style={{ color: "rgba(0,255,212,0.3)", marginBottom: "12px" }} />
          <p style={{ fontFamily: "'JetBrains Mono', monospace", color: "rgba(0,255,212,0.5)", letterSpacing: "0.2em" }}>QUEUE_EMPTY</p>
          <p style={{ color: "#A1A1AA", fontSize: "12px", marginTop: "6px" }}>Upload files above to begin processing.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: "13px", tableLayout: "fixed", width: colWidths.reduce((a, b) => a + b, 0) }}>
            <colgroup>
              {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
            </colgroup>
            <thead>
              <tr>
                {COLUMNS.map((col, i) => (
                  <th key={col.key} style={{ ...thBase, textAlign: i === 5 ? "right" : "left" }}>
                    {col.key}
                    {i < COLUMNS.length - 1 && (
                      <span
                        onMouseDown={(e) => onResizeStart(i, e)}
                        style={{
                          position: "absolute", right: 0, top: 0, bottom: 0, width: "6px",
                          cursor: "col-resize", background: dragRef.current === i ? "rgba(0,255,212,0.5)" : "transparent",
                          zIndex: 2,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,255,212,0.35)"}
                        onMouseLeave={e => { if (dragRef.current !== i) e.currentTarget.style.background = "transparent"; }}
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id}
                  style={{ transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(0,255,212,0.03)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={tdStyle}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#A1A1AA", fontSize: "12px" }}>
                      #{(job.id || "").slice(-6).toUpperCase()}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                      {getFileIcon(job.original_filename)}
                      <span style={{ fontWeight: "bold", color: "#00FFD4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>
                        {job.original_filename}
                      </span>
                      <span style={{ fontSize: "10px", border: "1px solid rgba(0,255,212,0.3)", padding: "0 4px", color: "rgba(0,255,212,0.6)", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                        {(job.file_type || "").toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td style={tdStyle}><StatusBadge status={job.status} /></td>
                  <td style={{ ...tdStyle, color: "#A1A1AA", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>
                    {job.processed_emails} / {job.total_emails || "?"}
                  </td>
                  <td style={{ ...tdStyle, color: "#A1A1AA", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}>
                    {new Date(job.created_at).toLocaleString("en-CA")}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                      <TBtn variant="outline" onClick={() => onViewJob(job)} style={{ padding: "4px 8px" }} testId={`view-job-${job.id}`}>
                        <Eye size={13} />
                      </TBtn>
                      <TBtn variant="destructive" onClick={() => deleteJob(job.id)} style={{ padding: "4px 8px" }} testId={`delete-job-${job.id}`}>
                        <Trash2 size={13} />
                      </TBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {total > limit && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", padding: "0 4px" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#A1A1AA" }}>
                Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <TBtn variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: "3px 10px" }}>&lt; PREV</TBtn>
                <TBtn variant="outline" disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)} style={{ padding: "3px 10px" }}>NEXT &gt;</TBtn>
              </div>
            </div>
          )}
        </div>
      )}
    </TWindow>
  );
}


// ── Job Detail View ───────────────────────────────────────────────────
function JobDetail({ jobId, onBack, onSendToAdvocate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const pollRef = useRef(null);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/ec/jobs/${jobId}`);
      const d = await res.json();
      setData(d);
    } catch (e) {
      console.error("Job detail error", e);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
    return () => clearInterval(pollRef.current);
  }, [fetchJob]);

  useEffect(() => {
    clearInterval(pollRef.current);
    if (data?.job?.status === "pending" || data?.job?.status === "processing") {
      pollRef.current = setInterval(fetchJob, 3000);
    }
    return () => clearInterval(pollRef.current);
  }, [data, fetchJob]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const emails = data?.emails || [];
    if (selected.size === emails.length) setSelected(new Set());
    else setSelected(new Set(emails.map(e => e.id)));
  };

  const handleBulkSend = () => {
    setShowConfirm(true);
  };

  const confirmBulkSend = () => {
    setShowConfirm(false);
    const selectedEmails = (data?.emails || []).filter(e => selected.has(e.id));
    if (!selectedEmails.length || !onSendToAdvocate) return;
    // Save each email separately so AI has full untruncated content per email
    selectedEmails.forEach(em => onSendToAdvocate(em));
    setSelected(new Set());
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${API}/api/ec/jobs/${jobId}/export`);
      const blob = await res.blob();
      triggerBlobDownload(blob, `CONVERTED_JOB_${jobId.slice(-6)}.zip`);
    } catch (e) {
      alert("Export failed: " + e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTxt = async (emailId, filename) => {
    setDownloadingId(emailId);
    try {
      const res = await fetch(`${API}/api/ec/emails/${emailId}/download`);
      const blob = await res.blob();
      triggerBlobDownload(blob, `${filename}.txt`);
    } catch (e) {
      alert("Download failed: " + e.message);
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "300px", color: "#00FFD4" }}>
      <Loader2 size={36} style={{ animation: "spin 1s linear infinite", marginBottom: "12px" }} />
      <p style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.2em" }}>ACCESSING_DATA_STREAM...</p>
    </div>
  );

  if (!data?.job) return (
    <TWindow title="SYS.ERROR">
      <div style={{ padding: "40px", textAlign: "center", color: "#EF4444" }}>
        <AlertCircle size={40} style={{ marginBottom: "12px", margin: "0 auto 12px" }} />
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: "bold" }}>ERR_RECORD_NOT_FOUND</p>
        <TBtn variant="primary" onClick={onBack} style={{ marginTop: "16px" }}>RETURN_TO_QUEUE</TBtn>
      </div>
    </TWindow>
  );

  const { job, emails } = data;
  const isComplete = job.status === "completed";
  const allSelected = emails?.length > 0 && selected.size === emails.length;

  return (
    <div>
      {showConfirm && (
        <ConfirmModal
          count={selected.size}
          onConfirm={confirmBulkSend}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* Back + Meta */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <TBtn variant="ghost" onClick={onBack}>
          <ArrowLeft size={14} /> BACK_TO_QUEUE
        </TBtn>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#A1A1AA" }}>
          UUID: {job.id?.slice(-8)} // TYPE: {(job.file_type || "").toUpperCase()}
        </span>
      </div>

      {/* Job Header */}
      <TWindow title={`JOB_INSPECTOR // ${job.original_filename}`} style={{ marginBottom: "20px", borderColor: "rgba(168,85,247,0.4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: "bold", fontSize: "18px", color: "#A855F7", marginBottom: "8px", letterSpacing: "0.05em" }}>
              {job.original_filename}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
              <StatusBadge status={job.status} />
              <TBadge variant="default">EXTRACTED: {job.processed_emails} / {job.total_emails || "?"}</TBadge>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#A1A1AA", display: "flex", alignItems: "center", gap: "4px" }}>
                <Calendar size={10} /> {new Date(job.created_at).toLocaleString("en-CA")}
              </span>
            </div>
          </div>
          <TBtn
            variant="accent"
            onClick={handleExport}
            disabled={!isComplete || exporting || !emails?.length}
            testId="export-zip-button"
          >
            {exporting
              ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> PACKAGING...</>
              : <><FileArchive size={13} /> EXPORT_ALL_ZIP</>
            }
          </TBtn>
        </div>
        {job.error_message && (
          <div style={{ marginTop: "12px", padding: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>
            <strong>SYS_FAULT:</strong> {job.error_message}
          </div>
        )}
      </TWindow>

      {/* Multi-select toolbar */}
      {emails?.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
          padding: "10px 14px",
          background: selected.size > 0 ? "rgba(168,85,247,0.08)" : "rgba(0,255,212,0.03)",
          border: `1px solid ${selected.size > 0 ? "rgba(168,85,247,0.3)" : "rgba(0,255,212,0.15)"}`,
          transition: "all 0.2s",
        }}>
          <button
            onClick={toggleAll}
            data-testid="select-all-toggle"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#00FFD4", display: "flex", alignItems: "center", gap: "6px", padding: 0 }}
          >
            {allSelected
              ? <CheckSquare size={16} style={{ color: "#00FFD4" }} />
              : <Square size={16} style={{ color: "rgba(0,255,212,0.5)" }} />
            }
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: "0.1em" }}>
              {allSelected ? "DESELECT_ALL" : "SELECT_ALL"}
            </span>
          </button>

          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#A1A1AA", marginLeft: "4px" }}>
            {selected.size} / {emails.length} SELECTED
          </span>

          <div style={{ flex: 1 }} />

          {selected.size > 0 && (
            <TBtn
              variant="accent"
              onClick={handleBulkSend}
              testId="bulk-send-advocate"
              disabled={!onSendToAdvocate}
            >
              <Zap size={12} />
              SEND {selected.size} TO ADVOCATE
            </TBtn>
          )}
        </div>
      )}

      {/* Emails List */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "rgba(0,255,212,0.6)" }}>
          <Mail size={14} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: "bold", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            Extracted_Payloads [{emails?.length || 0}]
          </span>
          <div style={{ flex: 1, height: "1px", background: "rgba(0,255,212,0.15)", marginLeft: "8px" }} />
        </div>

        {!emails || emails.length === 0 ? (
          <div style={{ border: "1px dashed rgba(0,255,212,0.15)", padding: "32px", textAlign: "center", color: "#A1A1AA", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", letterSpacing: "0.1em" }}>
            {job.status === "pending" || job.status === "processing" ? "AWAITING_EXTRACTION_PROCESS..." : "NO_VALID_PAYLOADS_FOUND"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {emails.map(em => {
              const isExp = expanded === em.id;
              const isSel = selected.has(em.id);
              return (
                <div
                  key={em.id}
                  data-testid={`email-row-${em.id}`}
                  style={{
                    border: `1px solid ${isSel ? "rgba(168,85,247,0.6)" : isExp ? "rgba(0,255,212,0.5)" : "rgba(0,255,212,0.15)"}`,
                    background: isSel ? "rgba(168,85,247,0.04)" : "#030305",
                    boxShadow: isExp ? "0 0 12px rgba(0,255,212,0.08)" : "none",
                    transition: "all 0.2s",
                  }}
                >
                  {/* Header Row */}
                  <div style={{ padding: "12px 14px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(em.id)}
                      data-testid={`select-email-${em.id}`}
                      style={{ background: "none", border: "none", cursor: "pointer", color: isSel ? "#A855F7" : "rgba(0,255,212,0.4)", padding: "2px 0", flexShrink: 0, marginTop: "2px" }}
                    >
                      {isSel ? <CheckSquare size={15} /> : <Square size={15} />}
                    </button>

                    {/* Content — clickable to expand */}
                    <div
                      style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                      onClick={() => setExpanded(isExp ? null : em.id)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#A855F7", border: "1px solid rgba(168,85,247,0.3)", padding: "1px 6px", background: "rgba(168,85,247,0.05)", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {em.generated_filename}
                        </span>
                        {em.has_attachments && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#00FFD4", border: "1px solid rgba(0,255,212,0.3)", padding: "1px 6px", background: "rgba(0,255,212,0.05)", flexShrink: 0 }}>
                            <Paperclip size={9} /> {em.attachment_count}
                          </span>
                        )}
                      </div>
                      <p style={{ fontWeight: "bold", color: "#F8F8F8", fontSize: "14px", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {em.subject || "<NO_SUBJECT>"}
                      </p>
                      <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "#A1A1AA", fontFamily: "'JetBrains Mono', monospace", flexWrap: "wrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><User size={10} /> {em.sender}</span>
                        {em.email_date && (
                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Calendar size={10} /> {new Date(em.email_date).toLocaleDateString("en-CA")}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      <TBtn
                        variant="outline"
                        style={{ padding: "4px 10px" }}
                        testId={`download-txt-${em.id}`}
                        onClick={e => { e.stopPropagation(); handleDownloadTxt(em.id, em.generated_filename); }}
                        disabled={downloadingId === em.id}
                      >
                        {downloadingId === em.id
                          ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
                          : <Download size={11} />
                        }
                        TXT
                      </TBtn>
                      {onSendToAdvocate && (
                        <TBtn
                          variant="accent"
                          style={{ padding: "4px 10px" }}
                          testId={`send-to-advocate-${em.id}`}
                          onClick={e => {
                            e.stopPropagation();
                            onSendToAdvocate(em);
                          }}
                        >
                          <Zap size={11} />
                          SEND
                        </TBtn>
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExp && (
                    <div style={{ borderTop: "1px solid rgba(0,255,212,0.15)", background: "rgba(0,0,0,0.4)", padding: "14px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid rgba(0,255,212,0.1)", fontSize: "12px" }}>
                        <FieldBlock label="FROM:" value={em.sender} />
                        <FieldBlock label="TO:" value={em.recipients || "<UNDISCLOSED>"} />
                        {em.structured_json?.body_word_count && (
                          <FieldBlock label="WORDS:" value={`${em.structured_json.body_word_count.toLocaleString()} (after signature strip)`} />
                        )}
                        {em.has_attachments && em.attachment_names && (
                          <div style={{ gridColumn: "1 / -1" }}>
                            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "rgba(0,255,212,0.5)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                              <Paperclip size={9} /> ATTACHMENTS ({em.attachment_count}):
                            </p>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", padding: "8px", background: "rgba(0,255,212,0.04)", border: "1px solid rgba(0,255,212,0.1)", color: "#A1A1AA" }}>
                              {(em.attachment_names || "").split(",").map((n, i) => (
                                <div key={i}>· {n.trim()}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Tabs: BODY | JSON */}
                      <DetailTabs emailId={em.id} bodyText={em.body_text} structuredJson={em.structured_json} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FieldBlock({ label, value }) {
  return (
    <div>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "rgba(0,255,212,0.5)", marginBottom: "2px" }}>{label}</p>
      <p style={{ color: "#00FFD4", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", wordBreak: "break-all" }}>{value}</p>
    </div>
  );
}

function DetailTabs({ emailId, bodyText, structuredJson }) {
  const [activeTab, setActiveTab] = useState("body");
  const tabBtn = (id, label) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", textTransform: "uppercase",
        letterSpacing: "0.1em", padding: "3px 10px", border: "none", cursor: "pointer",
        background: activeTab === id ? "rgba(0,255,212,0.12)" : "transparent",
        borderBottom: activeTab === id ? "2px solid #00FFD4" : "2px solid transparent",
        color: activeTab === id ? "#00FFD4" : "#A1A1AA",
      }}
    >{label}</button>
  );

  // Build a clean JSON for display — structured_json minus clean_body (shown in body tab)
  const jsonDisplay = structuredJson
    ? { ...structuredJson, clean_body: `[${(structuredJson.clean_body || "").split(" ").length} words — see BODY tab]` }
    : null;

  return (
    <div>
      <div style={{ display: "flex", borderBottom: "1px solid rgba(0,255,212,0.15)", marginBottom: "10px" }}>
        {tabBtn("body", "Body")}
        {tabBtn("json", "JSON")}
      </div>
      {activeTab === "body" && (
        <>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "rgba(0,255,212,0.4)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
            <AlignLeft size={10} /> CLEAN_BODY (signatures & quoted replies stripped):
          </p>
          <pre style={{
            background: "#030305", border: "1px solid rgba(0,255,212,0.2)",
            padding: "12px", maxHeight: "320px", overflowY: "auto",
            fontFamily: "'JetBrains Mono', monospace", fontSize: "11px",
            color: "rgba(248,248,248,0.85)", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: "1.6",
          }}>
            {bodyText || "<EMPTY_BODY>"}
          </pre>
        </>
      )}
      {activeTab === "json" && (
        <>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "rgba(0,255,212,0.4)", marginBottom: "6px" }}>
            STRUCTURED_JSON (stored in DB, sent to advocate):
          </p>
          <pre style={{
            background: "#030305", border: "1px solid rgba(168,85,247,0.3)",
            padding: "12px", maxHeight: "320px", overflowY: "auto",
            fontFamily: "'JetBrains Mono', monospace", fontSize: "11px",
            color: "#A855F7", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: "1.6",
          }}>
            {jsonDisplay ? JSON.stringify(jsonDisplay, null, 2) : "{ \"error\": \"structured_json not available\" }"}
          </pre>
        </>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────
function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function triggerAutoDownload(jobId, filename) {
  fetch(`${API}/api/ec/jobs/${jobId}/export`)
    .then(r => r.blob())
    .then(blob => {
      const safe = (filename || "job").replace(/\.[^.]+$/, "");
      triggerBlobDownload(blob, `${safe}_converted.zip`);
    })
    .catch(() => {});
}


// ── Main Email Converter Page ─────────────────────────────────────────
export default function EmailConverter({ onSendToAdvocate }) {
  const [view, setView] = useState("jobs"); // "jobs" | "detail"
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [jobsKey, setJobsKey] = useState(0);

  const handleViewJob = (job) => {
    setSelectedJobId(job.id);
    setView("detail");
  };

  return (
    <div
      data-testid="email-converter-page"
      style={{
        flex: 1, overflowY: "auto", padding: "24px 28px",
        background: "#08080C",
      }}
    >
      {/* Page Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: "22px", fontWeight: "900", color: "#00FFD4", letterSpacing: "-0.02em", lineHeight: "1.2" }}>
          EMAIL_CONVERTER
        </h1>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "rgba(0,255,212,0.5)", marginTop: "2px", letterSpacing: "0.15em" }}>
          .EML / .MBOX / .PDF / .TXT / .HTML / .MSG → STRUCTURED JSON // MULTI-SELECT // ZIP EXPORT
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {view === "jobs" ? (
        <>
          <UploadZone onUploadDone={() => setJobsKey(k => k + 1)} />
          <JobsTable key={jobsKey} onViewJob={handleViewJob} />
        </>
      ) : (
        <JobDetail
          jobId={selectedJobId}
          onBack={() => setView("jobs")}
          onSendToAdvocate={onSendToAdvocate}
        />
      )}
    </div>
  );
}
