"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

interface WaitlistFormProps {
  title?: string;
  description?: string;
  className?: string;
  windowWidth?: number;
}

export function WaitlistForm({
  title = "Join the Waitlist",
  description = "We’ll notify you when it’s ready",
  className = "",
  windowWidth = 1200,
}: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setEmail("");
      setShowModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div
        className={className}
        style={{
          position: "absolute",
          bottom: "40px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: "1000",
          backgroundColor: "rgba(15, 15, 15, 0.95)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          padding: "24px 28px",
          borderRadius: "4px",
          fontFamily:
            "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
          width: windowWidth < 768 ? "calc(100vw - 40px)" : "auto",
          minWidth: windowWidth < 768 ? "280px" : "320px",
          maxWidth: windowWidth < 768 ? "340px" : "400px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "20px",
            color: "#ffffff",
            fontSize: "14px",
            fontFamily:
              "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
          }}
        >
          ┌── {title} ──┐
        </div>
        <form onSubmit={handleSubmit}>
          <label
            style={{
              display: "block",
              color: "#a0a0a0",
              fontSize: "13px",
              marginBottom: "8px",
              fontFamily:
                "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
            }}
          >
            Email Address
          </label>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "12px 14px",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "2px",
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              color: "#ffffff",
              fontSize: "14px",
              fontFamily:
                "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
              outline: "none",
              marginBottom: "16px",
              boxSizing: "border-box",
              transition: "all 0.2s ease",
              opacity: isLoading ? 0.6 : 1,
            }}
            onFocus={(e) => {
              if (!isLoading) {
                e.target.style.borderColor = "#ffffff";
                e.target.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255, 255, 255, 0.3)";
              e.target.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
            }}
          />
          {error && (
            <div
              style={{
                color: "#ff6b6b",
                fontSize: "12px",
                marginBottom: "16px",
                fontFamily:
                  "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
              }}
            >
              Error: {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading || !email}
            style={{
              width: "100%",
              padding: "12px 16px",
              backgroundColor: isLoading || !email ? "#666666" : "#ffffff",
              color: isLoading || !email ? "#cccccc" : "#000000",
              border: "none",
              borderRadius: "2px",
              fontSize: "14px",
              fontFamily:
                "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
              cursor: isLoading || !email ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              fontWeight: "500",
            }}
            onMouseEnter={(e) => {
              if (!isLoading && email) {
                e.currentTarget.style.backgroundColor = "#e0e0e0";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading && email) {
                e.currentTarget.style.backgroundColor = "#ffffff";
              }
            }}
          >
            {isLoading ? "Processing..." : "Get Notified"}
          </button>
        </form>
        <div
          style={{
            marginTop: "12px",
            color: "#707070",
            fontSize: "12px",
            textAlign: "center",
            fontFamily:
              "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
          }}
        >
          {description}
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent
          className="sm:max-w-md bg-black border-white/20"
          style={{ zIndex: 9999 }}
        >
          <DialogHeader className="text-center">
            <DialogTitle className="text-center text-2xl font-bold font-mono text-white">
              Success!
            </DialogTitle>
            <DialogDescription className="mt-4 text-center text-gray-300 font-mono">
              You&rsquo;ve been added to our waitlist.
              <br />
              We&rsquo;ll notify you when it&rsquo;s ready!
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-center">
            <Button
              onClick={() => setShowModal(false)}
              className="bg-white text-black hover:bg-gray-200 font-mono"
            >
              └── Got it! ──┘
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
