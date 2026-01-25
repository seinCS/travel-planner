import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        "h-10 w-full min-w-0 rounded-xl border px-4 py-2 text-base transition-all duration-200 outline-none md:text-sm",
        "bg-white/60 backdrop-blur-sm border-white/40",
        "hover:bg-white/80 hover:border-gray-200/60",
        "focus-visible:bg-white/90 focus-visible:border-gray-300 focus-visible:ring-[3px] focus-visible:ring-gray-200/50",
        "shadow-[0_1px_2px_oklch(0_0_0/3%),inset_0_1px_1px_oklch(1_0_0/50%)]",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "dark:bg-input/30",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
