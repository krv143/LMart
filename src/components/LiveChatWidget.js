/**
 * LiveChatWidget — User chat. ZERO on mount. Voice shows only audio player (no raw data).
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";

const API = "/api";
const POLL_MS = 5000;

/* ── tiny audio player (no raw base64 shown) ── */
const VoicePlayer = ({ src }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().catch(() => {}); setPlaying(true); }
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button type="button" onClick={toggle}
        style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: playing ? "#f44336" : "#4CAF50", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        {playing ? <PauseIcon style={{ fontSize: 18 }} /> : <PlayArrowIcon style={{ fontSize: 18 }} />}
      </button>
      <span style={{ fontSize: 12, color: "#888" }}>Voice message</span>
      <audio ref={audioRef} src={src} onEnded={() => setPlaying(false)} style={{ display: "none" }} />
    </div>
  );
};

const LiveChatWidget = ({ userId, userName }) => {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const sidRef = useRef(null);
  const pollingRef = useRef(false);
  const [recording, setRecording] = useState(false);
  const endRef = useRef(null);
  const pollTimer = useRef(null);
  const mediaRec = useRef(null);
  const chunks = useRef([]);

  const scroll = useCallback(() => { try { endRef.current?.scrollIntoView({ behavior: "smooth" }); } catch {} }, []);
  useEffect(scroll, [msgs, scroll]);
  useEffect(() => () => { try { clearInterval(pollTimer.current); } catch {} }, []);

  const fmt = () => new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  const handleOpen = () => {
    setOpen(true);
    if (msgs.length === 0) {
      setMsgs([{ id: "w", text: "\ud83d\udc4b Hi! We're ready to help you. Tell us your query and our team will respond shortly.", type: "system", kind: "text", time: fmt() }]);
    }
  };

  const ensureSession = () => {
    if (sidRef.current) return;
    const localId = "local_" + Date.now();
    sidRef.current = localId;
    fetch(API + "/LiveChat/CreateSession", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "string", userId: userId || "", userName: userName || "Customer", userType: "customer", status: "waiting", agentId: "", agentName: "", lastMessage: "", createdAt: new Date().toISOString() }),
    }).then(r => r.ok ? r.json() : null).then(d => {
      if (d) { const realId = d.id || d.sessionId || String(d); sidRef.current = realId; startPolling(realId); }
    }).catch(() => {});
  };

  const handleSubmit = (e) => { e.preventDefault(); e.stopPropagation(); const t = input.trim(); if (!t) return; setInput(""); addAndSend(t, "text"); };

  const addAndSend = (content, kind) => {
    setMsgs(prev => [...prev, { id: "u" + Date.now() + Math.random(), text: content, type: "user", kind, time: fmt() }]);
    ensureSession();
    const sid = sidRef.current;
    if (sid) {
      fetch(API + "/LiveChat/SendMessage", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "string", sessionId: sid, text: content, kind, senderType: "user", senderId: userId || "", senderName: userName || "Customer", timestamp: new Date().toISOString() }),
      }).catch(() => {});
    }
    if (!pollingRef.current && sid) startPolling(sid);
    setTimeout(() => {
      setMsgs(prev => {
        if (prev.some(m => m.type === "agent") || prev.some(m => m.id === "busy40")) return prev;
        return [...prev, { id: "busy40", text: "\u23f3 Our operators are currently busy. You can continue texting your queries here \u2014 an operator will respond as soon as they're available.", type: "system", kind: "text", time: fmt() }];
      });
    }, 40000);
  };

  const startPolling = (sessionId) => {
    if (pollingRef.current || !sessionId || sessionId.startsWith("local_")) return;
    pollingRef.current = true;
    const poll = () => {
      fetch(API + "/LiveChat/GetMessages?sessionId=" + sessionId).then(r => r.ok ? r.json() : []).then(data => {
        if (!Array.isArray(data) || !data.length) return;
        setMsgs(prev => {
          const ids = new Set(prev.map(m => m.id));
          const fresh = data.filter(m => !ids.has(m.id)).map(m => ({
            id: m.id, text: m.text, kind: m.kind || "text", time: m.timestamp,
            type: m.senderType === "user" ? "user" : m.senderType === "system" ? "system" : "agent",
            senderName: m.senderName,
          }));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
      }).catch(() => {});
    };
    setTimeout(poll, 3000);
    pollTimer.current = setInterval(poll, POLL_MS);
  };

  const startRec = () => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const mr = new MediaRecorder(stream); chunks.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); const blob = new Blob(chunks.current, { type: "audio/webm" }); const r = new FileReader(); r.onloadend = () => addAndSend(r.result, "voice"); r.readAsDataURL(blob); };
      mr.start(); mediaRec.current = mr; setRecording(true);
    }).catch(() => alert("Please allow microphone access."));
  };
  const stopRec = () => { try { if (mediaRec.current?.state === "recording") mediaRec.current.stop(); } catch {} setRecording(false); };

  /* ── render single message ── */
  const renderBubble = (m) => {
    if (m.type === "system") return <div className="live-chat-system-text">{m.text}</div>;
    const isVoice = m.kind === "voice";
    return (
      <>
        {m.type === "agent" && <div className="live-chat-agent-label">{m.senderName || "Support Agent"}</div>}
        <div className="live-chat-bubble">
          {isVoice ? <VoicePlayer src={m.text} /> : m.text}
        </div>
        <div className="live-chat-time">{m.time}</div>
      </>
    );
  };

  return (
    <>
      {!open && <div className="live-chat-fab" onClick={handleOpen}><ChatIcon style={{ fontSize: 28, color: "#fff" }} /></div>}
      {open && (
        <div className="live-chat-window" onClick={e => e.stopPropagation()}>
          <div className="live-chat-header">
            <div className="live-chat-header-info">
              <SupportAgentIcon style={{ fontSize: 30, color: "#fff" }} />
              <div>
                <div className="live-chat-header-title">Support Chat</div>
                <div className="live-chat-header-status"><span className="live-chat-online-dot" /> We're here to help</div>
              </div>
            </div>
            <CloseIcon style={{ cursor: "pointer", color: "#fff", fontSize: 22 }} onClick={() => setOpen(false)} />
          </div>
          <div className="live-chat-messages">
            {msgs.map(m => <div key={m.id} className={"live-chat-message live-chat-message-" + m.type}>{renderBubble(m)}</div>)}
            <div ref={endRef} />
          </div>
          <form className="live-chat-input-area" onSubmit={handleSubmit}>
            <input type="text" className="live-chat-input" placeholder="Type your message\u2026" value={input} onChange={e => setInput(e.target.value)} autoComplete="off" />
            <button type="button" className={"live-chat-voice-btn" + (recording ? " live-chat-voice-recording" : "")} onClick={recording ? stopRec : startRec}>
              {recording ? <StopIcon style={{ fontSize: 20 }} /> : <MicIcon style={{ fontSize: 20 }} />}
            </button>
            <button type="submit" className="live-chat-send-btn" disabled={!input.trim()}><SendIcon style={{ fontSize: 20 }} /></button>
          </form>
        </div>
      )}
    </>
  );
};

export default LiveChatWidget;
