// StreamingBuffer class to handle chunked JSON data
class StreamingBuffer {
  private buffer = "";
  private onComplete: (data: string) => void;

  constructor(onComplete: (data: string) => void) {
    this.onComplete = onComplete;
  }

  append(chunk: string): void {
    // Filter out null bytes that can corrupt JSON parsing
    const cleanChunk = chunk.replace(/\0/g, "");
    this.buffer += cleanChunk;
    this.processBuffer();
  }

  private processBuffer(): void {
    let bracketCount = 0;
    let inString = false;
    let escaped = false;
    let start = 0;

    for (let i = 0; i < this.buffer.length; i++) {
      const char = this.buffer[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === "{") {
        bracketCount++;
      } else if (char === "}") {
        bracketCount--;

        if (bracketCount === 0) {
          // Found complete JSON object
          const jsonStr = this.buffer.slice(start, i + 1);
          try {
            // Validate JSON before calling callback
            JSON.parse(jsonStr);
            this.onComplete(jsonStr);
          } catch (e) {
            // Invalid JSON, continue buffering
          }

          // Move to next potential JSON object
          start = i + 1;

          // If there's a newline after this JSON, skip it
          if (start < this.buffer.length && this.buffer[start] === "\n") {
            start++;
          }
        }
      }
    }

    // Keep only the remaining unparsed part
    this.buffer = this.buffer.slice(start);
  }

  // Handle any remaining non-JSON output (like raw text)
  flush(): void {
    if (this.buffer.trim()) {
      // If it's not JSON, pass it through as-is
      this.onComplete(this.buffer);
      this.buffer = "";
    }
  }
}

export function escapePrompt(prompt: string): string {
  // Escape backticks and other special characters
  return prompt.replace(/[`"$\\]/g, "\\$&");
}
