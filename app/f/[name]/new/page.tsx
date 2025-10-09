"use client"

import type React from "react"

import { LeftSidebar } from "@/app/components/left-sidebar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { sendEmailAction } from "@/lib/db/actions"
import { ExclamationTriangleIcon } from "@radix-ui/react-icons"
import { Paperclip, Trash2, Plus, X, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Suspense, useActionState, useState } from "react"

const DEFAULT_VARIABLES = [
  { key: "firstName", label: "First Name", placeholder: "{{firstName}}" },
  { key: "lastName", label: "Last Name", placeholder: "{{lastName}}" },
  { key: "companyName", label: "Company Name", placeholder: "{{companyName}}" },
]

function DiscardDraftLink() {
  const { name } = useParams()

  return (
    <Link href={`/f/${name}`} className="text-gray-400 hover:text-gray-600">
      <Trash2 size={20} />
    </Link>
  )
}

function EmailBody({
  defaultValue = "",
  value,
  onChange,
}: {
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
}) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "Enter" || e.key === "NumpadEnter")) {
      e.preventDefault()
      e.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <div>
      <textarea
        name="body"
        placeholder="Compose your email... Use variables like {{firstName}} for personalization"
        className="h-[calc(100vh-450px)] w-full resize-none rounded-md border border-gray-300 p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-sans text-sm leading-relaxed"
        required
        onKeyDown={handleKeyDown}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        //defaultValue={defaultValue}
      />
    </div>
  )
}

export default function ComposePage() {
  const [state, formAction] = useActionState(sendEmailAction, {
    error: "",
    previous: {
      recipientEmail: "",
      subject: "",
      body: "",
    },
  })

  const [subject, setSubject] = useState(state.previous.subject?.toString() || "")
  const [body, setBody] = useState(state.previous.body?.toString() || "")
  const [variables, setVariables] = useState(DEFAULT_VARIABLES)
  const [newVariableName, setNewVariableName] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const isProduction = process.env.NEXT_PUBLIC_VERCEL_ENV === "production"

  const insertVariable = (placeholder: string, target: "subject" | "body") => {
    if (target === "subject") {
      setSubject((prev) => prev + placeholder)
    } else {
      setBody((prev) => prev + placeholder)
    }
  }

  const addCustomVariable = () => {
    if (!newVariableName.trim()) return

    const key = newVariableName.toLowerCase().replace(/\s+/g, "")
    const placeholder = `{{${key}}}`

    setVariables([...variables, { key, label: newVariableName, placeholder }])
    setNewVariableName("")

    setAlertMessage({ type: "success", message: `${placeholder} variable added successfully` })
    setTimeout(() => setAlertMessage(null), 3000)
  }

  const removeVariable = (key: string) => {
    if (DEFAULT_VARIABLES.some((v) => v.key === key)) {
      setAlertMessage({ type: "error", message: "Default variables cannot be removed" })
      setTimeout(() => setAlertMessage(null), 3000)
      return
    }
    setVariables(variables.filter((v) => v.key !== key))
  }

  const previewWithSampleData = (text: string) => {
    let preview = text
    const sampleData: Record<string, string> = {
      firstName: "John",
      lastName: "Doe",
      companyName: "Acme Corp",
    }

    variables.forEach((v) => {
      preview = preview.replace(
        new RegExp(v.placeholder.replace(/[{}]/g, "\\$&"), "g"),
        sampleData[v.key] || `[${v.label}]`,
      )
    })
    return preview
  }

  return (
    <div className="flex h-full grow">
      <LeftSidebar />
      <div className="grow p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">New Message</h1>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? "Hide Preview" : "Show Preview"}
          </Button>
        </div>

        {state.error && (
          <div className="mb-4">
            <Alert variant="destructive" className="relative">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          </div>
        )}

        {alertMessage && (
          <div className="mb-4">
            <Alert variant={alertMessage.type === "error" ? "destructive" : "default"} className="relative">
              {alertMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <ExclamationTriangleIcon className="h-4 w-4" />
              )}
              <AlertDescription>{alertMessage.message}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
          <div>
            <form action={formAction} className="space-y-4">
              <div className="relative">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-500 text-sm">To</span>
                <input
                  type="email"
                  name="recipientEmail"
                  defaultValue={state.previous.recipientEmail?.toString()}
                  className="w-full rounded-md border border-gray-300 py-2 pr-10 pl-12 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="recipient@example.com"
                />
              </div>

              <div className="relative">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-500 text-sm">
                  Subject
                </span>
                <input
                  type="text"
                  name="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-md border border-gray-300 py-2 pl-20 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Email subject"
                />
              </div>

              <EmailBody value={body} onChange={setBody} defaultValue={state.previous.body?.toString()} />

              <div className="flex flex-col items-center justify-between sm:flex-row">
                <TooltipProvider>
                  <div className="flex space-x-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="submit"
                          disabled={isProduction}
                          className="cursor-pointer rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Send
                        </button>
                      </TooltipTrigger>
                      {isProduction && (
                        <TooltipContent>
                          <p>Sending emails is disabled in production</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          disabled={isProduction}
                          className="cursor-pointer rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Schedule
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This feature is not yet implemented</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="mt-4 ml-auto flex space-x-3 sm:mt-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          disabled
                          type="button"
                          className="cursor-pointer text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                        >
                          <Paperclip size={20} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Attachments are not yet implemented</p>
                      </TooltipContent>
                    </Tooltip>
                    <Suspense fallback={<Trash2 size={20} />}>
                      <DiscardDraftLink />
                    </Suspense>
                  </div>
                </TooltipProvider>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Template Variables</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-600 mb-2 block font-medium">Insert into Subject</label>
                  <div className="flex flex-wrap gap-1.5">
                    {variables.map((variable) => (
                      <button
                        key={`subject-${variable.key}`}
                        type="button"
                        className="px-2 py-1 text-xs bg-white border border-gray-300 text-gray-700 rounded-md cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                        onClick={() => insertVariable(variable.placeholder, "subject")}
                      >
                        <span className="font-mono">{variable.placeholder}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-600 mb-2 block font-medium">Insert into Body</label>
                  <div className="flex flex-wrap gap-1.5">
                    {variables.map((variable) => (
                      <button
                        key={`body-${variable.key}`}
                        type="button"
                        className="px-2 py-1 text-xs bg-white border border-gray-300 text-gray-700 rounded-md cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors group inline-flex items-center gap-1"
                        onClick={() => insertVariable(variable.placeholder, "body")}
                      >
                        <span className="font-mono">{variable.placeholder}</span>
                        {!DEFAULT_VARIABLES.some((v) => v.key === variable.key) && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              removeVariable(variable.key)
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <label className="text-xs text-gray-600 mb-2 block font-medium">Add Custom Variable</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Variable name"
                      value={newVariableName}
                      onChange={(e) => setNewVariableName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustomVariable()}
                      className="h-8 text-sm flex-1 rounded-md border border-gray-300 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <Button
                      onClick={addCustomVariable}
                      size="icon"
                      className="h-8 w-8 bg-blue-600 hover:bg-blue-700"
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                Click a variable to insert it. Variables will be replaced with actual data when sending.
              </p>
            </div>

            {showPreview && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Preview with Sample Data</h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block font-medium">Subject</label>
                    <div className="p-2 bg-white rounded border border-blue-200 text-sm">
                      {subject ? (
                        previewWithSampleData(subject)
                      ) : (
                        <span className="text-gray-400 italic">No subject</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 mb-1 block font-medium">Body</label>
                    <div className="p-2 bg-white rounded border border-blue-200 text-sm max-h-48 overflow-y-auto">
                      <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                        {body ? previewWithSampleData(body) : <span className="text-gray-400 italic">No content</span>}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
