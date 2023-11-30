import { cn } from "@utils/shadcn";
import type { ReactElement } from "react";
import { RunningStatus, ServerStatus, StoppedStatus } from "@type/ml/server";

/**
 * Animated status indicator
 * @dev Cannot use dynamic classnames because of missing Tailwind support. Instead, uses manual conditional return.
 * @param {ServerStatus} status of server
 * @param {boolean} displayText whether to display status text
 * @param {string?} className additional div wrapper classes
 * @returns {ReactElement} status indicator
 */
export default function StatusIndicator({
  status,
  displayText,
  className,
}: {
  status: ServerStatus;
  displayText: boolean;
  className?: string;
}): ReactElement {
  // Running (green pulse)
  if (RunningStatus.has(status)) {
    return (
      <div className={cn("flex flex-row items-center")}>
        <div className={cn("h-3 w-3 relative flex", className)}>
          <span
            className={
              "animate-ping absolute h-full w-full inline-flex rounded-full opacity-75 bg-green-400"
            }
          />
          <span className={"h-3 w-3 inline-flex rounded-full bg-green-500"} />
        </div>
        {displayText && "Running"}
      </div>
    );
    // Stopped (red pulse)
  } else if (StoppedStatus.has(status)) {
    return (
      <div className={cn("flex flex-row items-center")}>
        <div className={cn("h-3 w-3 relative flex", className)}>
          <span
            className={
              "animate-ping absolute h-full w-full inline-flex rounded-full opacity-75 bg-red-400"
            }
          />
          <span className={"h-3 w-3 inline-flex rounded-full bg-red-500"} />
        </div>
        {displayText && "Stopped"}
      </div>
    );
    // All other states (yellow pulse)
  } else {
    return (
      <div className={cn("flex flex-row items-center")}>
        <div className={cn("h-3 w-3 relative flex", className)}>
          <span
            className={
              "animate-ping absolute h-full w-full inline-flex rounded-full opacity-75 bg-yellow-400"
            }
          />
          <span className={"h-3 w-3 inline-flex rounded-full bg-yellow-500"} />
        </div>
        {displayText && status}
      </div>
    );
  }
}
