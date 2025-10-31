import { cn } from "@workspace/ui/lib/utils";

interface StreamingIndicatorProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "dots" | "cursor" | "wave";
}

export function StreamingIndicator({
  className,
  size = "md",
  variant = "dots",
}: StreamingIndicatorProps) {
  const sizeClasses = {
    sm: "gap-0.5",
    md: "gap-1",
    lg: "gap-1.5",
  };

  const dotSizeClasses = {
    sm: "w-1 h-1",
    md: "w-1.5 h-1.5",
    lg: "w-2 h-2",
  };

  if (variant === "cursor") {
    return (
      <span
        className={cn(
          "inline-block w-0.5 h-4 bg-primary animate-pulse",
          className
        )}
      />
    );
  }

  if (variant === "wave") {
    return (
      <div className={cn("flex items-center", sizeClasses[size], className)}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "bg-primary/70 rounded-full animate-bounce",
              dotSizeClasses[size]
            )}
            style={{
              animationDelay: `${i * 0.15}s`,
              animationDuration: "1s",
            }}
          />
        ))}
      </div>
    );
  }

  // Default dots variant
  return (
    <div className={cn("flex items-center", sizeClasses[size], className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "bg-primary/60 rounded-full animate-pulse",
            dotSizeClasses[size]
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: "1.4s",
          }}
        />
      ))}
    </div>
  );
}
