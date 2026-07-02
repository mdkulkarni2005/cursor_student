"use client";

import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="absolute right-2 top-2 rounded-md border border-line-strong bg-card px-2 py-0.5 text-[10.5px] text-muted transition-colors hover:text-cyan"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

const components: Components = {
  code({ className, children, ...props }) {
    const isBlock = /language-/.test(className ?? "");
    const text = String(children).replace(/\n$/, "");
    if (!isBlock) {
      return (
        <code className="rounded bg-base/60 px-1 py-0.5 font-mono text-[12px]" {...props}>
          {children}
        </code>
      );
    }
    return (
      <div className="relative my-2 overflow-x-auto rounded-lg bg-[#0d1117] p-3 font-mono text-[12px] leading-relaxed text-[#e6edf3]">
        <CopyButton text={text} />
        <code>{text}</code>
      </div>
    );
  },
  p: ({ children }) => <p className="whitespace-pre-line">{children}</p>,
  pre: ({ children }) => <>{children}</>,
};

/** Safe Markdown rendering for AI-produced text (chat replies, code review) — fenced code blocks get monospace + copy. */
export function MessageMarkdown({ content }: { content: string }) {
  return (
    <div className="text-[13px] leading-relaxed [&_pre]:whitespace-pre">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
