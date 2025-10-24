"use client"

import type React from "react"

import { saveTemplateAction } from "@/lib/db/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"

interface Template {
  id: number
  name: string
  subject: string | null
  body: string | null
}

interface TemplateEditorModalProps {
  template?: Template | null
  onActionComplete: (newTemplateId?: number) => void
  trigger?: React.ReactNode
  // New props for controlled pattern
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TemplateEditorModal({
  template,
  onActionComplete,
  trigger,
  isOpen: controlledIsOpen,
  onOpenChange,
}: TemplateEditorModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isControlled = controlledIsOpen !== undefined
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen

  const setIsOpen = (open: boolean) => {
    if (isControlled) {
      onOpenChange?.(open)
    } else {
      setInternalIsOpen(open)
    }
  }

  const [subject, setSubject] = useState(template?.subject || "")
  const [body, setBody] = useState(template?.body || "")
  const [name, setName] = useState(template?.name || "")
  const [insertTarget, setInsertTarget] = useState<"subject" | "body">("body")

  const subjectRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setSubject(template?.subject || "")
      setBody(template?.body || "")
      setName(template?.name || "")
    }
  }, [isOpen, template])

  const placeholders = ["{firstName}", "{lastName}", "{company}", "{jobTitle}", "{email}"]

  const insertAtCursor = (placeholder: string) => {
    const targetRef = insertTarget === "subject" ? subjectRef.current : bodyRef.current
    if (!targetRef) return

    const start = targetRef.selectionStart ?? 0
    const end = targetRef.selectionEnd ?? 0
    const value = targetRef.value

    const newValue = value.slice(0, start) + placeholder + value.slice(end)
    if (insertTarget === "subject") {
      setSubject(newValue)
      setTimeout(() => targetRef.setSelectionRange(start + placeholder.length, start + placeholder.length), 0)
    } else {
      setBody(newValue)
      setTimeout(() => targetRef.setSelectionRange(start + placeholder.length, start + placeholder.length), 0)
    }

    targetRef.focus()
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast.error("Template name is required")

    const formData = new FormData()
    formData.append("name", name)
    formData.append("subject", subject)
    formData.append("body", body)

    if (template) formData.append("templateId", String(template.id))

    const result = await saveTemplateAction(formData)
    if (result.success) {
      toast.success(template ? "Template updated!" : "Template created!")
      onActionComplete(result.data?.id)
      setIsOpen(false)
    } else {
      toast.error(result.error)
    }
  }

  const dialogContent = (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{template ? "Edit Template" : "Create New Template"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSave} className="space-y-4 py-2">
        <div>
          <Label htmlFor="name">Template Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="subject">Subject</Label>
            <div className="text-sm text-muted-foreground">
              Insert into:
              <Button
                type="button"
                size="sm"
                variant={insertTarget === "subject" ? "default" : "outline"}
                className="ml-2"
                onClick={() => setInsertTarget("subject")}
              >
                Subject
              </Button>
              <Button
                type="button"
                size="sm"
                variant={insertTarget === "body" ? "default" : "outline"}
                className="ml-2"
                onClick={() => setInsertTarget("body")}
              >
                Body
              </Button>
            </div>
          </div>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} ref={subjectRef} />
        </div>

        <div>
          <Label htmlFor="body">Body</Label>
          <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={6} ref={bodyRef} />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {placeholders.map((p) => (
            <Button type="button" key={p} size="sm" variant="outline" onClick={() => insertAtCursor(p)}>
              {p}
            </Button>
          ))}
        </div>

        <DialogFooter className="flex justify-end gap-2 pt-4">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit">Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )

  // If trigger is provided, use trigger pattern
  if (trigger) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {dialogContent}
      </Dialog>
    )
  }

  // Otherwise use controlled pattern
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {dialogContent}
    </Dialog>
  )
}
