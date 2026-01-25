import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_2px_4px_oklch(0_0_0/10%)] hover:shadow-[0_4px_8px_oklch(0_0_0/15%)]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 shadow-[0_2px_4px_oklch(0_0_0/10%)]",
        outline:
          "border bg-white/70 backdrop-blur-sm shadow-[0_1px_2px_oklch(0_0_0/5%)] hover:bg-white/90 hover:shadow-[0_2px_4px_oklch(0_0_0/8%)] hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary/80 backdrop-blur-sm text-secondary-foreground hover:bg-secondary shadow-[0_1px_2px_oklch(0_0_0/5%)]",
        ghost:
          "hover:bg-white/60 hover:text-accent-foreground dark:hover:bg-accent/50 hover:backdrop-blur-sm",
        link: "text-primary underline-offset-4 hover:underline",
        glass: "bg-white/70 backdrop-blur-md border border-white/40 shadow-[0_2px_4px_oklch(0_0_0/6%)] hover:bg-white/85 hover:shadow-[0_4px_8px_oklch(0_0_0/10%)]",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-xl gap-1.5 px-3 has-[>svg]:px-2.5 min-h-[44px] md:min-h-0",
        lg: "h-10 rounded-xl px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-xl",
        "icon-sm": "size-8 rounded-xl",
        "icon-lg": "size-10 rounded-xl",
        // Mobile-optimized touch target (WCAG 2.1 AAA: 44x44px minimum)
        touch: "h-11 px-4 py-3 min-w-[44px] min-h-[44px] rounded-xl",
        "icon-touch": "size-11 min-w-[44px] min-h-[44px] rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
