"use client";
import { useState } from "react";
import { Send } from "lucide-react";
import { store } from "@/lib/store";
import type { Application } from "@/lib/types";
import { requestIdOf } from "@/lib/requestId";
import { useToast } from "./ui";

export function MessageThread({ app, by }: { app: Application; by: "club" | "usg" }) {
  const [text, setText] = useState("");
  const [toast, say] = useToast();
  const rid = requestIdOf(app);
  const messages = app.messages ?? [];

  function send() {
    if (!text.trim()) return say("Write a message first", "error");
    store.addMessage(app.id, by, text);
    store.audit(app.id, { by, action: "message", detail: text.trim().slice(0, 160) });
    setText("");
    say("Message sent");
  }

  return (
    <section className="card card-pad stack-sm">
      {toast}
      <div className="between">
        <h2>Messages</h2>
        <span className="tiny faint code">{rid}</span>
      </div>
      <p className="tiny faint">Every message is tagged with the request ID. New messages email the other side when accounts are connected.</p>
      {messages.length === 0 ? (
        <p className="small muted">No messages yet.</p>
      ) : (
        <div className="stack-sm">
          {messages.map((m) => (
            <div key={m.id} className="inset stack-xs" style={{ padding: 10 }}>
              <span className="tiny faint"><strong>{m.by === "club" ? "Club" : "USG"}</strong> · {m.at.slice(0, 16).replace("T", " ")} · {m.requestId}</span>
              <span className="small">{m.text}</span>
            </div>
          ))}
        </div>
      )}
      <label className="field">
        <span className="lbl">New message</span>
        <textarea className="textarea" style={{ minHeight: 72 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a question or reply about this request" aria-label="New message" />
      </label>
      <button className="btn btn-sm" style={{ justifySelf: "start" }} onClick={send}><Send />Send message</button>
    </section>
  );
}
