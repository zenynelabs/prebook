'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close

function SheetContent({ className, children, side = 'right', closeLabel = 'Close navigation', ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: 'left' | 'right'; closeLabel?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="sheet-overlay fixed inset-0 z-50 bg-black/40" />
      <DialogPrimitive.Content data-slot="sheet-content" className={cn('sheet-content fixed inset-y-0 z-50 flex w-[min(88vw,400px)] flex-col bg-background p-8 outline-none', side === 'right' ? 'right-0' : 'left-0', className)} {...props}>
        {children}
        <DialogPrimitive.Close className="sheet-close absolute right-5 top-5 flex size-11 items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="size-5" aria-hidden="true" /><span className="sr-only">{closeLabel}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-header" className={cn('flex flex-col gap-2', className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="sheet-title" className={cn('text-lg font-semibold', className)} {...props} />
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="sheet-description" className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription }
