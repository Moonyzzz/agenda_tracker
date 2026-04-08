"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { ChevronDownIcon } from "lucide-react"

// Lightweight native-select wrapper preserving the same export surface
// as the original @base-ui/react/select version.

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      data-slot="select"
      className={cn(
        "flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-8 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 h-8 appearance-none dark:bg-input/30 dark:hover:bg-input/50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
)
Select.displayName = "Select"

function SelectGroup({ className, ...props }: React.HTMLAttributes<HTMLOptGroupElement> & { label?: string }) {
  return <optgroup className={cn(className)} {...props} />
}

// SelectValue is not meaningful for native selects; kept as a no-op for API compat
function SelectValue(_props: React.HTMLAttributes<HTMLSpanElement>) {
  return null
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { size?: "sm" | "default" }) {
  return (
    <div
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "relative flex w-fit items-center",
        size === "sm" ? "h-7" : "h-8",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon className="pointer-events-none absolute right-2 size-4 text-muted-foreground" />
    </div>
  )
}

function SelectContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="select-content" className={cn("relative", className)} {...props}>
      {children}
    </div>
  )
}

function SelectLabel({ className, ...props }: React.HTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      data-slot="select-label"
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({ className, children, value, ...props }: React.OptionHTMLAttributes<HTMLOptionElement>) {
  return (
    <option
      data-slot="select-item"
      value={value}
      className={cn("relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm", className)}
      {...props}
    >
      {children}
    </option>
  )
}

function SelectSeparator({ className, ...props }: React.HTMLAttributes<HTMLHRElement>) {
  return (
    <hr
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="select-scroll-up-button"
      className={cn("flex w-full cursor-default items-center justify-center bg-popover py-1", className)}
      {...props}
    />
  )
}

function SelectScrollDownButton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="select-scroll-down-button"
      className={cn("flex w-full cursor-default items-center justify-center bg-popover py-1", className)}
      {...props}
    />
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
