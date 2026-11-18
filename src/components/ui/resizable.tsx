"use client"

import { GripVerticalIcon } from "lucide-react"
import { Panel, Group, Separator } from "react-resizable-panels"
import * as React from "react"

import { cn } from "@/lib/utils"

export type ImperativePanelHandle = {
  collapse: () => void;
  expand: () => void;
  resize: (size: number) => void;
  getSize: () => number;
};

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof Group>) {
  return (
    <Group
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full aria-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const ResizablePanel = React.forwardRef<
  ImperativePanelHandle,
  React.ComponentProps<typeof Panel>
>(({ className, ...props }, ref) => {
  return (
    <Panel
      // @ts-expect-error - Panel ref type mismatch workaround
      ref={ref}
      data-slot="resizable-panel"
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:h-auto data-[panel-group-direction=vertical]:w-full",
        className
      )}
      {...props}
    />
  )
})
ResizablePanel.displayName = "ResizablePanel"

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean
}) {
  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        "group/handle bg-border/80 hover:bg-primary/40 active:bg-primary/60 focus-visible:ring-ring relative flex w-px items-center justify-center transition-colors after:absolute after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-2 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 [&[aria-orientation=horizontal]>div]:rotate-90",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-card text-muted-foreground group-hover/handle:border-primary/40 group-hover/handle:text-primary z-10 flex h-7 w-3.5 items-center justify-center rounded-full border border-border/80 shadow-2xs transition-colors">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </Separator>
  )
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
