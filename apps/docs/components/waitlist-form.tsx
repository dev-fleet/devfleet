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
}

export function WaitlistForm({
  title = "Join the Waitlist",
  description = "We'll notify you when it's ready",
  className = "",
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
      const baseUrl =
        // eslint-disable-next-line no-restricted-properties
        process.env.NODE_ENV === "development"
          ? "http://localhost:3001"
          : "https://app.devfleet.ai";

      const response = await fetch(`${baseUrl}/api/waitlist`, {
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
        className={`bg-black/95 border border-white/20 p-6 rounded font-mono min-w-[240px] max-w-[400px] shadow-[0_8px_32px_rgba(0,0,0,0.6)] ${className}`}
      >
        <div className="text-center mb-5 text-white text-sm font-mono">
          ┌── {title} ──┐
        </div>
        <form onSubmit={handleSubmit}>
          <label className="block text-gray-400 text-xs mb-2 font-mono">
            Email Address
          </label>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="w-full p-3 border border-white/30 rounded-sm bg-black/40 text-white text-sm font-mono outline-none mb-4 box-border transition-all duration-200 disabled:opacity-60 focus:border-white focus:bg-black/60"
          />
          {error && (
            <div className="text-red-400 text-xs mb-4 font-mono">
              Error: {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full p-3 bg-white text-black border-none rounded-sm text-sm font-mono cursor-pointer transition-all duration-200 font-medium disabled:bg-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed hover:bg-gray-200 disabled:hover:bg-gray-600"
          >
            {isLoading ? "Processing..." : "Get Notified"}
          </button>
        </form>
        <div className="mt-3 text-gray-500 text-xs text-center font-mono">
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
