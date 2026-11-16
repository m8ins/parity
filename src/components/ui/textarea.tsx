import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "parity-input min-h-32",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
