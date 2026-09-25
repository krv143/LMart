/**
 * AdminLiveChat — Admin dashboard with:
 * - Clean voice play/record (no raw data)
 * - Active/Inactive user lists
 * - Push notification send UI
 * - All sync handlers (no page blank)
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { confirmDialog } from "../CommonPages/DialogSystem";
import {
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  SupportAgent as SupportAgentIcon,
  Chat as ChatIcon,
  PersonOutline as PersonOutlineIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  Close as CloseIcon,
  FiberManualRecord as DotIcon,
  Mic as MicIcon,
  Stop as StopIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  NotificationsActive as NotificationsActiveIcon,
  People as PeopleIcon,
  PersonOff as PersonOffIcon,
} from "@mui/icons-material";
import { Button } from "react-bootstrap";
import Footer from "../CommonPages/Footer.js";
import "../App.css";

const API = "/api";
const BACKEND = "https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api";
const POLL_MS = 4000;

/* ── Voice Player (no raw base64 shown) ── */
const VoicePlayer = ({ src, label }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        onClick={toggle}
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: "none",
          background: playing ? "#f44336" : "#4CAF50",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        {playing ? (
          <PauseIcon style={{ fontSize: 18 }} />
        ) : (
          <PlayArrowIcon style={{ fontSize: 18 }} />
        )}
      </button>
      <span style={{ fontSize: 12, color: "#666" }}>
        {label || "Voice message"}
      </span>
      <audio
        ref={audioRef}
        src={src}
        onEnded={() => setPlaying(false)}
        style={{ display: "none" }}
      />
    </div>
  );
};

const AdminLiveChat = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  const [agentName, setAgentName] = useState("Admin");
  const agentId = "admin-001";
  const [isAvailable, setIsAvailable] = useState(true);

  // Chat state
  const [waitingSessions, setWaitingSessions] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [closedSessions, setClosedSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);

  // Users & Push state
  const [activeTab, setActiveTab] = useState("chats"); // chats | users | push
  const [allUsers, setAllUsers] = useState([]);
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushSending, setPushSending] = useState(false);
  const [pushResult, setPushResult] = useState(null);
  const [pushHistory, setPushHistory] = useState([]);

  const endRef = useRef(null);
  const pollRef = useRef(null);
  const msgPollRef = useRef(null);
  const mediaRec = useRef(null);
  const chunks = useRef([]);
  const selectedRef = useRef(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    h();
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const scroll = useCallback(() => {
    try {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {}
  }, []);
  useEffect(scroll, [msgs, scroll]);
  useEffect(
    () => () => {
      clearInterval(pollRef.current);
      clearInterval(msgPollRef.current);
    },
    [],
  );

  /* ── Poll sessions ── */
  useEffect(() => {
    const poll = () => {
      Promise.all([
        fetch(`${API}/LiveChat/GetSessions?status=waiting`)
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
        fetch(`${API}/LiveChat/GetSessions?status=active&agentId=${agentId}`)
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
        fetch(`${API}/LiveChat/GetSessions?status=closed`)
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
      ]).then(([w, a, c]) => {
        setWaitingSessions(Array.isArray(w) ? w : []);
        setActiveSessions(Array.isArray(a) ? a : []);
        setClosedSessions(Array.isArray(c) ? c.slice(0, 20) : []);
      });
    };
    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [agentId]);

  /* ── Fetch all registered users ── */
  useEffect(() => {
    fetch(`${BACKEND}/customer/GetAllCustomerProfiles`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setAllUsers(Array.isArray(d) ? d : []))
      .catch(() => {});
    // Load push history from localStorage
    setPushHistory(JSON.parse(localStorage.getItem("hm_push_history") || "[]"));
  }, []);

  /* ── Poll messages for selected session ── */
  useEffect(() => {
    clearInterval(msgPollRef.current);
    if (!selected) {
      setMsgs([]);
      return;
    }
    const sid = selected.id;
    const poll = () => {
      fetch(`${API}/LiveChat/GetMessages?sessionId=${sid}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => {
          if (Array.isArray(d)) setMsgs(d);
        })
        .catch(() => {});
    };
    poll();
    msgPollRef.current = setInterval(poll, POLL_MS);
    return () => clearInterval(msgPollRef.current);
  }, [selected]);

  /* ── Accept chat ── */
  const accept = (session) => {
    fetch(`${API}/LiveChat/AcceptSession`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, agentId, agentName }),
    }).catch(() => {});
    setSelected({ ...session, status: "active", agentName });
  };

  /* ── Send text — FULLY SYNC ── */
  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const t = input.trim();
    if (!t || !selected) return;
    setInput("");
    addAndSend(t, "text");
  };

  const addAndSend = (content, kind) => {
    const sel = selectedRef.current;
    if (!sel) return;
    setMsgs((prev) => [
      ...prev,
      {
        id: "a" + Date.now() + Math.random(),
        text: content,
        senderType: "agent",
        kind,
        senderId: agentId,
        senderName: agentName,
        timestamp: new Date().toISOString(),
      },
    ]);
    fetch(`${API}/LiveChat/SendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "string",
        sessionId: sel.id,
        text: content,
        kind,
        senderType: "agent",
        senderId: agentId,
        senderName: agentName,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  };

  const closeChat = async (sid) => {
    if (!(await confirmDialog("Close?"))) return;
    fetch(`${API}/LiveChat/CloseSession?sessionId=${sid}`, {
      method: "PUT",
    }).catch(() => {});
    if (selected?.id === sid) {
      setSelected(null);
      setMsgs([]);
    }
  };

  /* ── Voice ── */
  const startRec = () => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const mr = new MediaRecorder(stream);
        chunks.current = [];
        mr.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.current.push(e.data);
        };
        mr.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks.current, { type: "audio/webm" });
          const r = new FileReader();
          r.onloadend = () => addAndSend(r.result, "voice");
          r.readAsDataURL(blob);
        };
        mr.start();
        mediaRec.current = mr;
        setRecording(true);
      })
      .catch(() => alert("Allow microphone access."));
  };
  const stopRec = () => {
    try {
      if (mediaRec.current?.state === "recording") mediaRec.current.stop();
    } catch {}
    setRecording(false);
  };

  /* ── Push notification send ── */
  const sendPush = (e) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushBody.trim()) return;
    setPushSending(true);
    setPushResult(null);
    const entry = {
      title: pushTitle.trim(),
      body: pushBody.trim(),
      sentAt: new Date().toISOString(),
      targetType: "all",
    };
    const hist = [entry, ...pushHistory].slice(0, 30);
    localStorage.setItem("hm_push_history", JSON.stringify(hist));
    setPushHistory(hist);
    // Try API
    fetch(`${BACKEND}/ProfileMessage/SendPushNotification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...entry,
        id: "string",
        sentBy: "Admin",
        messageType: "push",
      }),
    })
      .then(() => setPushResult("Sent!"))
      .catch(() => setPushResult("Saved locally"))
      .finally(() => {
        setPushSending(false);
        setPushTitle("");
        setPushBody("");
      });
  };

  /* ── Helpers ── */
  const fmt = (ts) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };
  const fmtDt = (ts) => {
    if (!ts) return "Just now";
    return new Date(ts).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const renderMsg = (m) => {
    const isVoice = m.kind === "voice";
    if (m.senderType === "system")
      return <div className="admin-chat-msg-system-text">{m.text}</div>;
    return (
      <>
        {m.senderType !== "agent" && (
          <div
            style={{
              fontSize: 11,
              color: "#1976D2",
              fontWeight: 600,
              marginBottom: 2,
            }}
          >
            {m.senderName || "Customer"}
          </div>
        )}
        <div className="admin-chat-msg-bubble">
          {isVoice ? (
            <VoicePlayer
              src={m.text}
              label={m.senderType === "agent" ? "Your voice" : "Customer voice"}
            />
          ) : (
            m.text
          )}
        </div>
        <div className="admin-chat-msg-time">{fmt(m.timestamp)}</div>
      </>
    );
  };

  const all = [...waitingSessions, ...activeSessions];
  const activeUserIds = new Set(all.map((s) => s.userId));
  const onlineUsers = allUsers.filter((u) =>
    activeUserIds.has(u.userId || u.id),
  );
  const offlineUsers = allUsers.filter(
    (u) => !activeUserIds.has(u.userId || u.id),
  );

  return (
    <>
      <div className="d-flex flex-row justify-content-start align-items-start mt-mob-50">
        {!isMobile && (
          <div className="ml-0 p-0 adm_mnu">
            <AdminSidebar />
          </div>
        )}
        {isMobile && (
          <div className="floating-menu">
            <Button
              variant="primary"
              className="rounded-circle shadow"
              onClick={() => setShowMenu(!showMenu)}
            >
              <ChatIcon />
            </Button>
            {showMenu && (
              <div className="sidebar-container">
                <AdminSidebar />
              </div>
            )}
          </div>
        )}

        <div className={`container m-1 ${isMobile ? "w-100" : "w-75"}`}>
          {/* Header */}
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="d-flex align-items-center">
              <ArrowBackIcon
                fontSize="large"
                style={{ cursor: "pointer" }}
                onClick={() => navigate(-1)}
              />
              <h2 className="ms-2 mb-0 fs-20">
                <SupportAgentIcon fontSize="large" className="me-2" />
                Admin Dashboard
                {waitingSessions.length > 0 && (
                  <span className="badge bg-danger ms-2">
                    {waitingSessions.length}
                  </span>
                )}
              </h2>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: 14 }}>
                {isAvailable ? "Available" : "Away"}
              </span>
              <div
                className="admin-chat-toggle"
                onClick={() => setIsAvailable(!isAvailable)}
                style={{ backgroundColor: isAvailable ? "#4CAF50" : "#ccc" }}
              >
                <div
                  className="admin-chat-toggle-knob"
                  style={{
                    transform: isAvailable
                      ? "translateX(22px)"
                      : "translateX(2px)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="d-flex gap-2 mb-3 flex-wrap">
            {[
              [
                "chats",
                <ChatIcon style={{ fontSize: 16 }} />,
                `Chats (${all.length})`,
              ],
              [
                "users",
                <PeopleIcon style={{ fontSize: 16 }} />,
                `Users (${allUsers.length})`,
              ],
              [
                "push",
                <NotificationsActiveIcon style={{ fontSize: 16 }} />,
                "Push Notify",
              ],
            ].map(([tab, icon, label]) => (
              <button
                key={tab}
                className={`btn btn-sm ${activeTab === tab ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setActiveTab(tab)}
              >
                {icon} {label}
              </button>
            ))}
            <div className="ms-auto d-flex align-items-center gap-2">
              <small className="text-muted">Agent:</small>
              <input
                type="text"
                className="form-control form-control-sm"
                style={{ maxWidth: 140 }}
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
              />
            </div>
          </div>

          {/* ═══ CHATS TAB ═══ */}
          {activeTab === "chats" && (
            <div className="admin-chat-layout">
              <div className="admin-chat-sessions">
                <div className="admin-chat-sessions-header">
                  <span>Chats ({all.length})</span>
                </div>
                {waitingSessions.length > 0 && (
                  <div className="admin-chat-section-label">
                    <AccessTimeIcon style={{ fontSize: 16 }} /> Waiting (
                    {waitingSessions.length})
                  </div>
                )}
                {waitingSessions.map((s) => (
                  <div
                    key={s.id}
                    className={`admin-chat-session-item admin-chat-session-waiting ${selected?.id === s.id ? "admin-chat-session-active" : ""}`}
                    onClick={() => setSelected(s)}
                  >
                    <div className="admin-chat-session-avatar">
                      <PersonOutlineIcon />
                    </div>
                    <div className="admin-chat-session-info">
                      <div className="admin-chat-session-name">
                        {s.userName || "Customer"}
                      </div>
                      <div className="admin-chat-session-preview">
                        {s.lastMessage || "New chat…"}
                      </div>
                      <div className="admin-chat-session-time">
                        {fmtDt(s.createdAt)}
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={(e) => {
                        e.stopPropagation();
                        accept(s);
                      }}
                    >
                      Accept
                    </button>
                  </div>
                ))}
                {activeSessions.length > 0 && (
                  <div className="admin-chat-section-label">
                    <CheckCircleIcon
                      style={{ fontSize: 16, color: "#4CAF50" }}
                    />{" "}
                    Active ({activeSessions.length})
                  </div>
                )}
                {activeSessions.map((s) => (
                  <div
                    key={s.id}
                    className={`admin-chat-session-item ${selected?.id === s.id ? "admin-chat-session-active" : ""}`}
                    onClick={() => setSelected(s)}
                  >
                    <div className="admin-chat-session-avatar">
                      <PersonOutlineIcon />
                    </div>
                    <div className="admin-chat-session-info">
                      <div className="admin-chat-session-name">
                        {s.userName || "Customer"}
                        <DotIcon
                          style={{
                            fontSize: 10,
                            color: "#4CAF50",
                            marginLeft: 4,
                          }}
                        />
                      </div>
                      <div className="admin-chat-session-preview">
                        {s.lastMessage || "…"}
                      </div>
                    </div>
                  </div>
                ))}
                {closedSessions.length > 0 && (
                  <div className="admin-chat-section-label">
                    <PersonOffIcon style={{ fontSize: 16, color: "#999" }} />{" "}
                    Closed ({closedSessions.length})
                  </div>
                )}
                {closedSessions.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="admin-chat-session-item"
                    style={{ opacity: 0.6 }}
                    onClick={() => setSelected(s)}
                  >
                    <div className="admin-chat-session-avatar">
                      <PersonOutlineIcon />
                    </div>
                    <div className="admin-chat-session-info">
                      <div className="admin-chat-session-name">
                        {s.userName || "Customer"}
                      </div>
                      <div
                        className="admin-chat-session-preview"
                        style={{ color: "#999" }}
                      >
                        Closed
                      </div>
                    </div>
                  </div>
                ))}
                {all.length === 0 && closedSessions.length === 0 && (
                  <div className="admin-chat-empty">
                    <ChatIcon style={{ fontSize: 48, color: "#ccc" }} />
                    <p>No chats</p>
                  </div>
                )}
              </div>

              {/* Chat area */}
              <div className="admin-chat-area">
                {selected ? (
                  <>
                    <div className="admin-chat-area-header">
                      <div className="d-flex align-items-center">
                        <PersonOutlineIcon className="me-2" />
                        <div>
                          <div className="fw-bold">
                            {selected.userName || "Customer"}
                          </div>
                          <div style={{ fontSize: 12, color: "#666" }}>
                            {selected.status === "waiting"
                              ? "Waiting…"
                              : selected.status === "closed"
                                ? "Closed"
                                : "Connected"}
                          </div>
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        {selected.status === "waiting" && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => accept(selected)}
                          >
                            Accept
                          </button>
                        )}
                        {selected.status !== "closed" && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => closeChat(selected.id)}
                          >
                            <CloseIcon style={{ fontSize: 18 }} /> Close
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="admin-chat-messages">
                      {msgs.map((m) => (
                        <div
                          key={m.id}
                          className={`admin-chat-msg ${m.senderType === "agent" ? "admin-chat-msg-agent" : m.senderType === "system" ? "admin-chat-msg-system" : "admin-chat-msg-user"}`}
                        >
                          {renderMsg(m)}
                        </div>
                      ))}
                      <div ref={endRef} />
                    </div>
                    {selected.status === "active" && (
                      <form
                        className="admin-chat-input-area"
                        onSubmit={handleSubmit}
                      >
                        <input
                          type="text"
                          className="admin-chat-input"
                          placeholder="Type reply…"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          className={
                            "live-chat-voice-btn" +
                            (recording ? " live-chat-voice-recording" : "")
                          }
                          onClick={recording ? stopRec : startRec}
                        >
                          {recording ? (
                            <StopIcon style={{ fontSize: 20 }} />
                          ) : (
                            <MicIcon style={{ fontSize: 20 }} />
                          )}
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={!input.trim()}
                        >
                          <SendIcon style={{ fontSize: 20 }} />
                        </button>
                      </form>
                    )}
                  </>
                ) : (
                  <div className="admin-chat-no-selection">
                    <SupportAgentIcon style={{ fontSize: 64, color: "#ccc" }} />
                    <h5 className="text-muted mt-3">Select a chat</h5>
                    <p className="text-muted">
                      {waitingSessions.length > 0
                        ? `${waitingSessions.length} waiting`
                        : "No chats"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ USERS TAB ═══ */}
          {activeTab === "users" && (
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 20,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              {/* Active users (in chat) */}
              <h6 className="mb-3">
                <DotIcon style={{ fontSize: 12, color: "#4CAF50" }} /> Active
                Users ({onlineUsers.length})
              </h6>
              {onlineUsers.length === 0 ? (
                <p className="text-muted">No active users right now</p>
              ) : (
                <div className="table-responsive mb-4">
                  <table className="table table-sm table-bordered">
                    <thead style={{ background: "#e8f5e9" }}>
                      <tr>
                        <th>Name</th>
                        <th>Mobile</th>
                        <th>District</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {onlineUsers.map((u, i) => (
                        <tr key={i}>
                          <td>{u.fullName}</td>
                          <td>{u.mobileNumber}</td>
                          <td>{u.district}</td>
                          <td>
                            <span className="badge bg-success">Online</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Inactive users */}
              <h6 className="mb-3">
                <PersonOffIcon style={{ fontSize: 16, color: "#999" }} />{" "}
                Offline Users ({offlineUsers.length})
              </h6>
              {offlineUsers.length === 0 ? (
                <p className="text-muted">No offline users</p>
              ) : (
                <div
                  className="table-responsive"
                  style={{ maxHeight: 300, overflowY: "auto" }}
                >
                  <table className="table table-sm table-bordered">
                    <thead
                      style={{
                        background: "#f5f5f5",
                        position: "sticky",
                        top: 0,
                      }}
                    >
                      <tr>
                        <th>Name</th>
                        <th>Mobile</th>
                        <th>District</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offlineUsers.slice(0, 50).map((u, i) => (
                        <tr key={i}>
                          <td>{u.fullName}</td>
                          <td>{u.mobileNumber}</td>
                          <td>{u.district}</td>
                          <td>
                            <span className="badge bg-secondary">Offline</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-muted mt-2" style={{ fontSize: 12 }}>
                Total registered: {allUsers.length}
              </p>
            </div>
          )}

          {/* ═══ PUSH TAB ═══ */}
          {activeTab === "push" && (
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 20,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <h5 className="mb-3">
                <NotificationsActiveIcon className="me-2" />
                Send Push Notification
              </h5>
              <form onSubmit={sendPush}>
                <div className="mb-3">
                  <label className="form-label fw-bold">Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Flash Sale! 50% Off"
                    value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    maxLength={100}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">
                    Message *{" "}
                    <small className="text-muted ms-1">
                      {pushBody.length}/256
                    </small>
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Enter notification message…"
                    value={pushBody}
                    onChange={(e) => setPushBody(e.target.value)}
                    maxLength={256}
                    required
                  />
                </div>
                {/* Preview */}
                {(pushTitle || pushBody) && (
                  <div
                    className="mb-3 p-3"
                    style={{
                      background: "#fafafa",
                      borderRadius: 8,
                      border: "1px solid #eee",
                    }}
                  >
                    <small className="text-muted">Preview</small>
                    <div className="d-flex align-items-start mt-1 gap-2">
                      <img
                        src="/logo192.png"
                        alt=""
                        style={{ width: 32, height: 32, borderRadius: 6 }}
                      />
                      <div>
                        <div className="fw-bold" style={{ fontSize: 14 }}>
                          {pushTitle || "Title"}
                        </div>
                        <div style={{ fontSize: 13, color: "#555" }}>
                          {pushBody || "Message…"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {pushResult && (
                  <div className="alert alert-success py-2">{pushResult}</div>
                )}
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={
                    pushSending || !pushTitle.trim() || !pushBody.trim()
                  }
                >
                  {pushSending ? (
                    "Sending…"
                  ) : (
                    <>
                      <SendIcon className="me-1" style={{ fontSize: 18 }} />{" "}
                      Send to All Users
                    </>
                  )}
                </button>
              </form>

              {/* History */}
              {pushHistory.length > 0 && (
                <div className="mt-4">
                  <h6>Recent ({pushHistory.length})</h6>
                  <div
                    className="table-responsive"
                    style={{ maxHeight: 200, overflowY: "auto" }}
                  >
                    <table className="table table-sm table-bordered">
                      <thead
                        style={{
                          background: "#f0f8ff",
                          position: "sticky",
                          top: 0,
                        }}
                      >
                        <tr>
                          <th>Title</th>
                          <th>Message</th>
                          <th>Sent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pushHistory.slice(0, 10).map((h, i) => (
                          <tr key={i}>
                            <td>{h.title}</td>
                            <td
                              style={{
                                maxWidth: 180,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {h.body}
                            </td>
                            <td style={{ fontSize: 12 }}>
                              {new Date(h.sentAt).toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AdminLiveChat;
