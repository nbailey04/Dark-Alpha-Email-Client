"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Copy, Send } from "lucide-react"
import { EmailTemplate } from "@/app/components/email-template"

interface Recipient {
  id: number
  firstName: string
  lastName: string
  company: string
  jobTitle?: string
  email: string
}

export default function EmailTemplatePage() {
  const [useDB, setUseDB] = useState(true) // toggle between DB/manual
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [selectedRecipientIndex, setSelectedRecipientIndex] = useState(0)

  const [manualData, setManualData] = useState({
    firstName: "",
    lastName: "",
    company: "",
    jobTitle: "",
    email: "",
  })

  const [emailContent, setEmailContent] = useState({
    subject: "Partnership Opportunity",
    body: `I hope this email finds you well. I'm reaching out to you as the {jobTitle} at {company}.

We've been following {company}'s work and are impressed by your innovative approach to the industry. I believe there could be valuable opportunities for collaboration between our organizations.

Would you be available for a brief call next week to discuss potential partnership opportunities? I'd love to learn more about {company}'s current initiatives and share how we might be able to support your goals.

Looking forward to connecting with you, {firstName}.`,
    signature: `Your Name
Your Title
Your Company`,
  })

  useEffect(() => {
    async function fetchRecipients() {
      try {
        const res = await fetch("/api/users")
        const data = await res.json()
        setRecipients(data)
      } catch (err) {
        console.error(err)
        toast.error("Error fetching recipients")
      }
    }
    fetchRecipients()
  }, [])

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualData({ ...manualData, [e.target.name]: e.target.value })
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEmailContent({ ...emailContent, [e.target.name]: e.target.value })
  }

  const copyToClipboard = async () => {
    const emailText = document.getElementById("email-preview")?.innerText || ""
    await navigator.clipboard.writeText(emailText)
    toast.success("Email template copied to clipboard") // 
  }

  const generateEmail = () => {
    toast.success("Your personalized email is ready")
  }

  // select current data based on toggle
  const currentData = useDB
    ? recipients[selectedRecipientIndex] || { firstName: "[First Name]", lastName: "[Last Name]", company: "[Company]", jobTitle: "[Job Title]", email: "" }
    : manualData

  // replace placeholders for preview
  const previewBody = emailContent.body
    .replace(/\{firstName\}/g, currentData.firstName)
    .replace(/\{lastName\}/g, currentData.lastName)
    .replace(/\{company\}/g, currentData.company)
    .replace(/\{jobTitle\}/g, currentData.jobTitle || "")

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Email Template Generator</h1>
          <p className="mt-2 text-muted-foreground">Create personalized email templates with dynamic content</p>
        </div>

        <div className="flex gap-4 mb-4">
          <Button variant={useDB ? "default" : "outline"} onClick={() => setUseDB(true)}>DB Recipients</Button>
          <Button variant={!useDB ? "default" : "outline"} onClick={() => setUseDB(false)}>Manual Input</Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <Card>
            <CardHeader>
              <CardTitle>{useDB ? "Select Recipient" : "Manual Recipient Input"}</CardTitle>
              <CardDescription>Customize the recipient details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {useDB ? (
                <div className="space-y-2">
                  <Label>Select Recipient</Label>
                  <select
                    value={selectedRecipientIndex}
                    onChange={(e) => setSelectedRecipientIndex(Number(e.target.value))}
                    className="w-full border rounded-md px-2 py-1"
                  >
                    {recipients.map((r, idx) => (
                      <option key={r.id} value={idx}>
                        {r.firstName} {r.lastName} ({r.company})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input name="firstName" value={manualData.firstName} onChange={handleManualChange} />
                  <Label>Last Name</Label>
                  <Input name="lastName" value={manualData.lastName} onChange={handleManualChange} />
                  <Label>Company</Label>
                  <Input name="company" value={manualData.company} onChange={handleManualChange} />
                  <Label>Job Title</Label>
                  <Input name="jobTitle" value={manualData.jobTitle} onChange={handleManualChange} />
                  <Label>Email</Label>
                  <Input name="email" value={manualData.email} onChange={handleManualChange} />
                </div>
              )}

              <div className="space-y-2 border-t pt-2">
                <Label>Subject</Label>
                <Input name="subject" value={emailContent.subject} onChange={handleEmailChange} />
                <Label>Body</Label>
                <textarea
                  name="body"
                  className="min-h-[200px] w-full rounded-md border px-3 py-2"
                  value={emailContent.body}
                  onChange={handleEmailChange}
                />
                <Label>Signature</Label>
                <textarea
                  name="signature"
                  className="min-h-[100px] w-full rounded-md border px-3 py-2"
                  value={emailContent.signature}
                  onChange={handleEmailChange}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={generateEmail} className="flex-1">
                  <Send className="mr-2 h-4 w-4" />
                  Generate Email
                </Button>
                <Button onClick={copyToClipboard} variant="outline">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Email Preview</CardTitle>
              <CardDescription>See how your personalized email will look</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="html">HTML</TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-4">
                  <div id="email-preview" className="rounded-lg border bg-card p-6">
                    <EmailTemplate
                      firstName={currentData.firstName}
                      lastName={currentData.lastName}
                      companyName={currentData.company}
                      position={currentData.jobTitle}
                      body={previewBody}
                      signature={emailContent.signature}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="html" className="mt-4">
                  <pre className="overflow-x-auto text-xs bg-muted p-4 rounded">{`<EmailTemplate
  firstName="${currentData.firstName}"
  lastName="${currentData.lastName}"
  companyName="${currentData.company}"
  position="${currentData.jobTitle}"
  body="${emailContent.body}"
  signature="${emailContent.signature}"
/>`}</pre>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
