"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  Columns2,
  Compass,
  Maximize2,
  MessageCircle,
  Minimize2,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { assistantName, OPEN_CHAT_EVENT } from "@/lib/site";
import {
  type ChatMessage,
  createSessionId,
  isChatConnected,
  sendChatMessage,
  suggestedPrompts,
} from "@/lib/chat";

const GREETING =
  "Hello, I'm Musafir — your personal travel consultant here at Meridian & Co. Tell me a little about the trip you have in mind, or ask about visas, cancellations, or anything else on the site, and I'll help shape it into something extraordinary.";

/** Compact = floating card. Half = right half of the viewport, site visible alongside. Full = covers everything. */
type PanelSize = "compact" | "half" | "full";

const nextPanelSize: Record<PanelSize, PanelSize> = {
  compact: "half",
  half: "full",
  full: "compact",
};

const panelSizeControl: Record<PanelSize, { icon: typeof Maximize2; label: string }> = {
  compact: { icon: Columns2, label: "Switch to split view" },
  half: { icon: Maximize2, label: "Switch to full screen" },
  full: { icon: Minimize2, label: "Exit full screen" },
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<PanelSize>("compact");
  // Seeded at mount rather than in an effect — avoids a cascading render.
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: "greeting", role: "assistant", text: GREETING, at: 0 },
  ]);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(false);

  // Lazy initialiser keeps this out of the render path.
  const [sessionId] = useState(createSessionId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastSent = useRef<string>("");

  const reduceMotion = useReducedMotion();

  /* Opening always clears the unread dot — done in the handler, not an effect. */
  const openPanel = useCallback(() => {
    setOpen(true);
    setUnread(false);
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
    setSize("compact");
    launcherRef.current?.focus();
  }, []);

  /* "Plan My Trip" in the nav / hero opens this panel. */
  useEffect(() => {
    window.addEventListener(OPEN_CHAT_EVENT, openPanel);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, openPanel);
  }, [openPanel]);

  /* Escape closes, and focus returns to the launcher. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closePanel]);

  /* Focus the composer once the open animation has settled. */
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [open]);

  /* Keep the newest message in view. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [messages, isTyping, reduceMotion]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (trimmed === "" || isTyping) return;

      lastSent.current = trimmed;
      setError(null);
      setDraft("");

      const outgoing: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        text: trimmed,
        at: Date.now(),
      };

      const history = messages
        .filter((m) => m.id !== "greeting")
        .map(({ role, text: t }) => ({ role, text: t }));

      setMessages((prev) => [...prev, outgoing]);
      setIsTyping(true);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const reply = await sendChatMessage(
          { message: trimmed, sessionId, history },
          controller.signal,
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            text: reply,
            at: Date.now(),
          },
        ]);
        if (!open) setUnread(true);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong reaching the assistant.",
        );
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, messages, open, sessionId],
  );

  const retry = () => {
    if (lastSent.current) {
      setMessages((prev) => prev.slice(0, -1));
      void send(lastSent.current);
    }
  };

  const onComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(draft);
    }
  };

  const showChips = messages.length <= 1 && !isTyping;

  return (
    <>
      {/* ── Launcher ───────────────────────────────────────────────── */}
      <motion.button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? closePanel() : openPanel())}
        aria-label={open ? "Close Musafir chat" : "Open Musafir chat"}
        aria-expanded={open}
        aria-haspopup="dialog"
        whileHover={reduceMotion ? undefined : { scale: 1.05 }}
        whileTap={reduceMotion ? undefined : { scale: 0.95 }}
        className={cn(
          "fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full",
          "bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-500 text-white",
          "shadow-lg shadow-cyan-900/30 ring-1 ring-white/20",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2",
          "sm:bottom-6 sm:right-6",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "close" : "open"}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="grid place-items-center"
          >
            {open ? (
              <X className="h-6 w-6" aria-hidden />
            ) : (
              <MessageCircle className="h-6 w-6" aria-hidden />
            )}
          </motion.span>
        </AnimatePresence>

        {/* Idle attention ring — suppressed for reduced-motion users. */}
        {!open && !reduceMotion && (
          <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-cyan-400/25" />
        )}
        {unread && !open && (
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-orange-500" />
        )}
      </motion.button>

      {/* ── Panel ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            layout
            role="dialog"
            aria-modal={size === "full"}
            aria-label="Musafir, Meridian & Co. travel consultant"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn(
              "fixed z-50 flex flex-col overflow-hidden",
              "border border-white/20 bg-white/85 shadow-2xl shadow-slate-900/20 backdrop-blur-xl",
              "dark:border-white/10 dark:bg-slate-900/85 dark:shadow-black/40",
              // Compact: near-fullscreen sheet on mobile, floating card on desktop.
              size === "compact" &&
                "inset-x-3 bottom-24 top-16 rounded-3xl sm:inset-auto sm:bottom-24 sm:right-6 sm:top-auto sm:h-[min(34rem,calc(100vh-9rem))] sm:w-[24rem]",
              // Half: full screen on mobile (a half-width sheet isn't usable there); right half of the viewport from sm up, site still visible alongside.
              size === "half" &&
                "inset-0 rounded-none sm:inset-y-0 sm:left-1/2 sm:right-0 sm:top-0 sm:rounded-l-3xl",
              // Full: covers the entire viewport at every breakpoint.
              size === "full" && "inset-0 rounded-none",
            )}
          >
            {/* Header */}
            <header className="flex items-center gap-3 border-b border-slate-900/10 bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 px-4 py-3 text-white dark:border-white/10">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 ring-1 ring-white/30">
                <Compass className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold tracking-tight">
                  {assistantName}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-white/80">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isChatConnected ? "bg-emerald-300" : "bg-amber-300",
                    )}
                    aria-hidden
                  />
                  {isChatConnected ? "Online" : "Demo mode"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSize(nextPanelSize[size])}
                  aria-label={panelSizeControl[size].label}
                  title={panelSizeControl[size].label}
                  className="hidden rounded-full p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:inline-flex"
                >
                  {(() => {
                    const SizeIcon = panelSizeControl[size].icon;
                    return <SizeIcon className="h-4 w-4" aria-hidden />;
                  })()}
                </button>
                <button
                  type="button"
                  onClick={closePanel}
                  aria-label="Close Musafir chat"
                  className="rounded-full p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </header>

            {/* Transcript */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
            >
              <div aria-live="polite" aria-atomic="false" className="space-y-3">
                {messages.map((m) => (
                  <Bubble key={m.id} message={m} reduceMotion={!!reduceMotion} />
                ))}
              </div>

              {isTyping && <TypingIndicator />}

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-2xl border border-red-300/60 bg-red-50 px-3 py-2.5 text-xs text-red-800 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="break-words">{error}</p>
                    <button
                      type="button"
                      onClick={retry}
                      className="mt-1.5 inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:no-underline"
                    >
                      <RotateCcw className="h-3 w-3" aria-hidden />
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {/* Suggested prompts */}
              {showChips && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="flex flex-wrap gap-2 pt-1"
                >
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void send(prompt)}
                      className={cn(
                        "rounded-full border border-slate-300/70 bg-white/70 px-3 py-1.5 text-xs text-slate-700",
                        "transition hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-900",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
                        "dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:border-cyan-400/60 dark:hover:bg-cyan-500/10 dark:hover:text-cyan-100",
                      )}
                    >
                      {prompt}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-slate-900/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-end gap-2 rounded-2xl border border-slate-300/70 bg-white px-3 py-2 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/30 dark:border-white/15 dark:bg-slate-900">
                <label htmlFor="chat-composer" className="sr-only">
                  Message Musafir
                </label>
                <textarea
                  id="chat-composer"
                  ref={inputRef}
                  rows={1}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={onComposerKeyDown}
                  placeholder="Ask about a destination…"
                  className="max-h-[120px] min-h-[24px] flex-1 resize-none bg-transparent text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => void send(draft)}
                  disabled={draft.trim() === "" || isTyping}
                  aria-label="Send message"
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full transition",
                    "bg-gradient-to-br from-sky-500 to-teal-500 text-white",
                    "hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
                    "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100",
                  )}
                >
                  <Send className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <p className="mt-1.5 px-1 text-[11px] text-slate-500 dark:text-slate-400">
                Enquiries only — we never take payment through chat.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({
  message,
  reduceMotion,
}: {
  message: ChatMessage;
  reduceMotion: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={cn("flex items-end gap-2", isUser && "flex-row-reverse")}
    >
      {!isUser && (
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-white">
          <Compass className="h-3.5 w-3.5" aria-hidden />
        </span>
      )}
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-br-md bg-gradient-to-br from-sky-600 to-teal-600 text-white"
            : "rounded-bl-md bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-100",
        )}
      >
        <span className="sr-only">
          {isUser ? "You said: " : "Musafir said: "}
        </span>
        {message.text}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-white">
        <Compass className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 dark:bg-white/10">
        <span className="sr-only">Musafir is typing</span>
        <span className="flex gap-1" aria-hidden>
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 dark:bg-slate-300"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
