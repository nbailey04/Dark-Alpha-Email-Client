"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Send, Upload } from "lucide-react";
import { EmailTemplate } from "@/app/components/email-template";
import { getTemplateByIdAction } from "@/lib/db/actions";
import * as XLSX from "xlsx";

type Recipient = {
  id: number;
  firstName: string;
  lastName: string;
  company: string;
  jobTitle?: string;
  email: string;
};

type ManualRecipient = {
  firstName: string;
  lastName: string;
  company: string;
  jobTitle?: string;
  email?: string;
};

type EmailContent = {
  subject: string;
  body: string;
  signature: string;
};

export default function NewEmailPage() {
  const searchParams = useSearchParams();
  const queryType = searchParams?.get("type") || "single";
  const isBulk = queryType === "bulk";
  const templateId = searchParams?.get("template") || null;

  const [useDB, setUseDB] = useState<boolean>(true);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipientIndex, setSelectedRecipientIndex] = useState<number>(0);
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]);
  const [manualData, setManualData] = useState<ManualRecipient>({
    firstName: "",
    lastName: "",
    company: "",
    jobTitle: "",
    email: "",
  });
  const [manualBulkData, setManualBulkData] = useState<ManualRecipient[]>([]);
  const [emailContent, setEmailContent] = useState<EmailContent>({
    subject: "Partnership Opportunity",
    body: `I hope this email finds you well. I'm reaching out to you as the {jobTitle} at {company}.\n\nWe've been following {company}'s work and are impressed by your innovative approach to the industry. I believe there could be valuable opportunities for collaboration between our organizations.\n\nWould you be available for a brief call next week to discuss potential partnership opportunities? I'd love to learn more about {company}'s current initiatives and share how we might be able to support your goals.\n\nLooking forward to connecting with you, {firstName}.`,
    signature: `Best Regards,\nYour Name\nYour Title\nYour Company`,
  });

  // drag/drop state
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /** --- Fetch DB recipients --- */
  useEffect(() => {
    async function fetchRecipients() {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        const normalized: Recipient[] = (data || []).map((d: any, idx: number) => ({
          id: d.id ?? idx,
          firstName: d.firstName ?? d.first_name ?? d.first ?? "[First]",
          lastName: d.lastName ?? d.last_name ?? d.last ?? "[Last]",
          company: d.company ?? d.companyName ?? "",
          jobTitle: d.jobTitle ?? d.position ?? "",
          email: d.email ?? "",
        }));
        setRecipients(normalized);
        setSelectedRecipients(normalized.map((r) => r.id));
        setSelectedRecipientIndex(0);
      } catch (err) {
        console.error(err);
        toast.error("Error fetching recipients");
      }
    }
    fetchRecipients();
  }, []);

  /** --- Load template if present --- */
  useEffect(() => {
    async function loadTemplate() {
      if (templateId) {
        const result = await getTemplateByIdAction(Number(templateId));
        if (result.success && result.data) {
          setEmailContent((prev) => ({
            ...prev,
            subject: result.data.subject || "",
            body: result.data.body || "",
          }));
          toast.success("Template loaded!");
        } else {
          toast.error(result.error || "Failed to load template");
        }
      }
    }
    loadTemplate();
  }, [templateId]);

  /** --- Handlers --- */
  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setManualData({ ...manualData, [e.target.name]: e.target.value });

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setEmailContent({ ...emailContent, [e.target.name]: e.target.value });

  const toggleRecipient = (id: number) =>
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const selectAllRecipients = () => setSelectedRecipients(recipients.map((r) => r.id));
  const deselectAllRecipients = () => setSelectedRecipients([]);

  const addManualRecipient = () =>
    setManualBulkData((s) => [
      ...s,
      { firstName: "", lastName: "", company: "", jobTitle: "", email: "" },
    ]);

  const removeManualRecipient = (index: number) =>
    setManualBulkData((s) => s.filter((_, i) => i !== index));

  const updateManualRecipient = (
    index: number,
    field: keyof ManualRecipient,
    value: string
  ) => {
    setManualBulkData((s) => {
      const copy = [...s];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  /** --- Preview helpers --- */
  const getPreviewBody = (data?: Partial<ManualRecipient> | Partial<Recipient>) => {
    const firstName = data?.firstName ?? "[First Name]";
    const lastName = data?.lastName ?? "[Last Name]";
    const company = (data as any)?.company ?? (data as any)?.companyName ?? "[Company]";
    const jobTitle = (data as any)?.jobTitle ?? (data as any)?.position ?? "";

    return emailContent.body
      .replace(/\{firstName\}/g, firstName)
      .replace(/\{lastName\}/g, lastName)
      .replace(/\{company\}/g, company)
      .replace(/\{companyName\}/g, company)
      .replace(/\{jobTitle\}/g, jobTitle);
  };

  const getPreviewSubject = (data?: Partial<ManualRecipient> | Partial<Recipient>) => {
    const firstName = data?.firstName ?? "[First Name]";
    const company = (data as any)?.company ?? (data as any)?.companyName ?? "[Company]";
    return emailContent.subject
      .replace(/\{firstName\}/g, firstName)
      .replace(/\{company\}/g, company)
      .replace(/\{companyName\}/g, company);
  };

  const currentData: ManualRecipient | Recipient =
    useDB && !isBulk
      ? recipients[selectedRecipientIndex] ?? {
          firstName: "[First Name]",
          lastName: "[Last Name]",
          company: "[Company]",
          jobTitle: "[Job Title]",
          email: "",
        }
      : manualData;

  const copyToClipboard = async () => {
    const emailText = document.getElementById("email-preview")?.innerText || "";
    await navigator.clipboard.writeText(emailText);
    toast.success("Email template copied to clipboard");
  };

  const generateEmail = () => {
    toast.success("Your personalized email is ready");
  };

  /** --- File parsing --- */
  const handleFile = async (file: File | null) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv")) {
      const text = await file.text();
      parseCsv(text);
      toast.success("CSV loaded");
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      const headers = rows[0].map((h: string) => h.toString().trim());
      const dataRows = rows.slice(1);

      const mapped = dataRows.map((row) => {
        const obj: any = {};
        headers.forEach((h, i) => {
          obj[h] = row[i] ?? "";
        });
        return {
          firstName: obj["firstName"] || obj["FirstName"] || obj["first_name"] || obj["First Name"] || "",
          lastName: obj["lastName"] || obj["LastName"] || obj["last_name"] || obj["Last Name"] || "",
          company: obj["company"] || obj["Company"] || "",
          jobTitle: obj["jobTitle"] || obj["JobTitle"] || obj["job_title"] || obj["Job Title"] || "",
          email: obj["email"] || obj["Email"] || "",
        };
      });

      setUseDB(false);
      setManualBulkData(mapped);
      toast.success("Excel loaded as manual recipients");
    } else {
      toast.error("Only CSV or XLSX files are supported");
    }
  };

  function parseCsv(csvText: string) {
    const rows = csvText.split(/\r?\n/).filter(Boolean);
    if (!rows.length) return;
    const headers = rows[0].split(",").map((h) => h.trim());
    const dataRows = rows.slice(1);
    const mapped = dataRows.map((r) => {
      const cols = r.split(",").map((c) => c.trim());
      const obj: any = {};
      headers.forEach((h, i) => (obj[h] = cols[i] ?? ""));
      return {
        firstName: obj["firstName"] || obj["FirstName"] || obj["first_name"] || obj["First Name"] || "",
        lastName: obj["lastName"] || obj["LastName"] || obj["last_name"] || obj["Last Name"] || "",
        company: obj["company"] || obj["Company"] || "",
        jobTitle: obj["jobTitle"] || obj["JobTitle"] || obj["job_title"] || obj["Job Title"] || "",
        email: obj["email"] || obj["Email"] || "",
      };
    });
    setUseDB(false);
    setManualBulkData(mapped);
  }

  /** --- Drag & drop handlers --- */
  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    await handleFile(e.dataTransfer.files?.[0] ?? null);
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);
  const onChooseFileClick = () => fileInputRef.current?.click();
  const onFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleFile(e.target.files?.[0] ?? null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /** --- Render --- */
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Email Template Generator</h1>
          <p className="mt-2 text-muted-foreground">
            Create personalized email templates with dynamic content!
          </p>
        </div>

        {/* Toggle */}
        <div className="flex gap-4 mb-4">
          <Button variant={useDB ? "default" : "outline"} onClick={() => setUseDB(true)}>DB Recipients</Button>
          <Button variant={!useDB ? "default" : "outline"} onClick={() => setUseDB(false)}>Manual Input</Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <Card>
            <CardHeader>
              <CardTitle>
                {useDB
                  ? isBulk
                    ? "Select Recipients"
                    : "Select Recipient"
                  : isBulk
                  ? "Manual Recipients"
                  : "Manual Recipient Input"}
              </CardTitle>
              <CardDescription>Customize the recipient details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Recipients */}
              {useDB ? (
                isBulk ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto border p-2 rounded">
                    <div className="flex justify-between mb-2">
                      <Button size="sm" onClick={selectAllRecipients}>Select All</Button>
                      <Button size="sm" onClick={deselectAllRecipients}>Deselect All</Button>
                    </div>
                    {recipients.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 py-1">
                        <input aria-label={`select-${r.id}`} type="checkbox" checked={selectedRecipients.includes(r.id)} onChange={() => toggleRecipient(r.id)} />
                        <span className="truncate">{r.firstName} {r.lastName} ({r.company})</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Select Recipient</Label>
                    <select value={selectedRecipientIndex} onChange={(e) => setSelectedRecipientIndex(Number(e.target.value))} className="w-full border rounded-md px-2 py-1">
                      {recipients.map((r, idx) => <option key={r.id} value={idx}>{r.firstName} {r.lastName} ({r.company})</option>)}
                    </select>
                  </div>
                )
              ) : isBulk ? (
                <div className="space-y-2">
                  {manualBulkData.map((m, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input placeholder="First Name" value={m.firstName} onChange={(e) => updateManualRecipient(idx, "firstName", e.target.value)} />
                      <Input placeholder="Last Name" value={m.lastName} onChange={(e) => updateManualRecipient(idx, "lastName", e.target.value)} />
                      <Input placeholder="Company" value={m.company} onChange={(e) => updateManualRecipient(idx, "company", e.target.value)} />
                      <Input placeholder="Job Title" value={m.jobTitle} onChange={(e) => updateManualRecipient(idx, "jobTitle", e.target.value)} />
                      <Input placeholder="Email" value={m.email} onChange={(e) => updateManualRecipient(idx, "email", e.target.value)} />
                      <Button size="sm" onClick={() => removeManualRecipient(idx)}>Remove</Button>
                    </div>
                  ))}
                  <Button size="sm" onClick={addManualRecipient}>Add Recipient</Button>
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

              {/* File upload */}
              <div>
                <Label>Upload Recipients (CSV or XLSX)</Label>
                <div
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onClick={onChooseFileClick}
                  className={`mt-2 rounded border-2 border-dashed p-6 text-center cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-muted"}`}
                >
                  <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFileInputChange} />
                  <div className="flex items-center justify-center gap-2">
                    <Upload />
                    <span>{dragOver ? "Drop file to upload" : "Drag & drop CSV/XLSX here, or click to choose"}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  File should include a header row (e.g. firstName,lastName,company,jobTitle,email)
                </p>
              </div>

              {/* Email inputs */}
              <div className="space-y-2 border-t pt-2">
                <Label>Subject</Label>
                <Input name="subject" value={emailContent.subject} onChange={handleEmailChange} />
                <Label>Body</Label>
                <textarea name="body" className="min-h-[200px] w-full rounded-md border px-3 py-2" value={emailContent.body} onChange={handleEmailChange} />
                <Label>Signature</Label>
                <textarea name="signature" className="min-h-[100px] w-full rounded-md border px-3 py-2" value={emailContent.signature} onChange={handleEmailChange} />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={generateEmail} className="flex-1"><Send className="mr-2 h-4 w-4" /> Generate Email</Button>
                <Button onClick={copyToClipboard} variant="outline"><Copy className="mr-2 h-4 w-4" /> Copy</Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <div className="space-y-4">
            {isBulk ? (
              (useDB ? recipients.filter(r => selectedRecipients.includes(r.id)) : manualBulkData).map((r, idx) => (
                <Card key={idx}>
                    <CardHeader>
                      <CardTitle>
                        {r.firstName} {r.lastName} ({(r as any).company})
                      </CardTitle>
                    </CardHeader>
                    <CardContent id="email-preview" className="whitespace-pre-wrap">
                      <p className="font-semibold">{getPreviewSubject(r)}</p>
                      <p className="mt-1">{getPreviewBody(r)}</p>
                      <p className="mt-2">{emailContent.signature}</p>
                    </CardContent>
                  </Card>
              ))
            ) : (
              <Card>
                <CardHeader>
                  <CardContent>
                    <h3 className="font-bold">{getPreviewSubject(currentData)}</h3>
                    <p id="email-preview" className="whitespace-pre-wrap">{getPreviewBody(currentData)}{"\n\n"}{emailContent.signature}</p>
                  </CardContent>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
