import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "parity-control inline-flex items-center justify-center gap-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "parity-primary",
        destructive: "parity-destructive",
        outline: "parity-outline",
        secondary: "parity-secondary",
        ghost: "parity-ghost",
        link: "parity-link",
      },
      size: {
        default: "",
        sm: "parity-control-small",
        lg: "",
        icon: "parity-control-icon",
        "icon-sm": "parity-control-icon",
        "icon-lg": "parity-control-icon",
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
