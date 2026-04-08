"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

type DialogContextValue = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const DialogContext = React.createContext<DialogContextValue>({
  open: false,
  setOpen: () => {},
})

function Dialog({
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  children,
  ...props
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  children?: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen: React.Dispatch<React.SetStateAction<boolean>> = (value) => {
    const next = typeof value === "function" ? value(open) : value
    setUncontrolledOpen(next)
    onOpenChange?.(next)
  }
  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      <div data-slot="dialog" {...props}>
        {children}
      </div>
    </DialogContext.Provider>
  )
}

function DialogTrigger({
  children,
  asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { setOpen } = React.useContext(DialogContext)
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        setOpen(true)
        ;(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>).props.onClick?.(e as React.MouseEvent<HTMLElement>)
      },
    })
  }
  return (
    <button
      data-slot="dialog-trigger"
      onClick={() => setOpen(true)}
      {...props}
    >
      {children}
    </button>
  )
}

function DialogPortal({ children }: { children?: React.ReactNode }) {
  const { open } = React.useContext(DialogContext)
  if (!open) return null
  return <>{children}</>
}

function DialogClose({
  children,
  asChild,
  render,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
  render?: React.ReactElement
}) {
  const { setOpen } = React.useContext(DialogContext)
  const handleClose = () => setOpen(false)

  if (render) {
    return React.cloneElement(render, {
      onClick: handleClose,
      children,
    } as React.HTMLAttributes<HTMLElement>)
  }

  return (
    <button
      data-slot="dialog-close"
      onClick={handleClose}
      {...props}
    >
      {children}
    </button>
  )
}

function DialogOverlay({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { setOpen } = React.useContext(DialogContext)
  return (
    <div
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      onClick={() => setOpen(false)}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <div
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none sm:max-w-sm",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogClose
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogClose>
        )}
      </div>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogClose>
          <Button variant="outline">Close</Button>
        </DialogClose>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      data-slot="dialog-title"
      className={cn("font-heading text-base leading-none font-medium", className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
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
