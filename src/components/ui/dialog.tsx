"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-[var(--sys-color-overlay)]",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  presentation = "default",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  presentation?: "default" | "reading"
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogSurface
        data-slot="dialog-content"
        className={cn(
          "parity-dialog fixed z-50 w-full outline-none",
          presentation !== "reading" && "grid gap-6",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="parity-close absolute top-2 right-2 inline-flex items-center justify-center [&_svg]:size-4"
          >
            <XIcon />
            <span className="sr-only">Schließen</span>
          </DialogPrimitive.Close>
        )}
      </DialogSurface>
    </DialogPortal>
  )
}

// Mounted inside the portal so only visible dialogs subscribe to viewport changes.
function DialogSurface({ style, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  const [viewport, setViewport] = React.useState<React.CSSProperties>({})

  React.useEffect(() => {
    const visualViewport = window.visualViewport
    if (!visualViewport) return
    const updateViewport = () => setViewport({
      "--dialog-viewport-height": `${visualViewport.height}px`,
      "--dialog-keyboard-inset": `${Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop)}px`,
    } as React.CSSProperties)
    updateViewport()
    visualViewport.addEventListener("resize", updateViewport)
    visualViewport.addEventListener("scroll", updateViewport)
    return () => {
      visualViewport.removeEventListener("resize", updateViewport)
      visualViewport.removeEventListener("scroll", updateViewport)
    }
  }, [])

  return <DialogPrimitive.Content {...props} style={{ ...viewport, ...style }} />
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("parity-dialog-title", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
