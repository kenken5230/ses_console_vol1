"use client";

import { useState } from "react";

const wrapperStyle = {
  alignItems: "center",
  display: "inline-flex",
  gap: 8,
};

const statusStyle = {
  color: "#475569",
  fontSize: 13,
  fontWeight: 800,
};

async function copyCurrentUrl() {
  if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.clipboard) {
    return false;
  }
  await navigator.clipboard.writeText(window.location.href);
  return true;
}

export default function MarketShareButton({ disabled = false }) {
  const [status, setStatus] = useState("");

  async function handleCopy() {
    try {
      const copied = await copyCurrentUrl();
      setStatus(copied ? "コピーしました" : "コピーできませんでした");
    } catch {
      setStatus("コピーできませんでした");
    }
    window.setTimeout(() => setStatus(""), 1800);
  }

  return (
    <span style={wrapperStyle}>
      <button className="outline-primary" disabled={disabled} onClick={handleCopy} type="button">
        共有URLをコピー
      </button>
      {status ? (
        <span aria-live="polite" style={statusStyle}>
          {status}
        </span>
      ) : null}
    </span>
  );
}
