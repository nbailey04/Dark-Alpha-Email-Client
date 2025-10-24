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

  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /** --- Fetch recipients from DB --- */
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

  /** --- Load template by ID if present --- */
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

  const handleEmailChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setEmailContent({ ...emailContent, [e.target.name]: e.target.value });

  const toggleRecipient = (id: number) =>
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  const selectAllRecipients = () => setSelectedRecipients(recipients.map((r) => r.id));
  const deselectAllRecipients = () => setSelectedRecipients([]);

  const addManualRecipient = () =>
    setManualBulkData((s) => [...s, { firstName: "", lastName: "", company: "", jobTitle: "", email: "" }]);
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

  /** --- Drag & drop / CSV parsing --- */
  const handleFile = async (file: File | null) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv")) {
      const text = await file.text();
      parseCsvAndPopulate(text);
      toast.success("CSV loaded");
    } else {
      toast.error("Only CSV files are supported client-side for now");
    }
  };

  function parseCsvAndPopulate(csvText: string) {
    const rows = csvText.split(/\r?\n/).filter(Boolean);
    if (rows.length === 0) return;
    const headers = rows[0].split(",").map((h) => h.trim());
    const dataRows = rows.slice(1);
    const parsed = dataRows.map((r) => {
      const cols = r.split(",").map((c) => c.trim());
      const obj: any = {};
      headers.forEach((h, i) => (obj[h] = cols[i] ?? ""));
      return obj;
    });

    const mapped = parsed.map((p) => ({
      firstName: p["firstName"] || p["FirstName"] || p["first_name"] || p["name"] || "",
      lastName: p["lastName"] || p["LastName"] || p["last_name"] || "",
      company: p["company"] || p["Company"] || "",
      jobTitle: p["jobTitle"] || p["JobTitle"] || p["job_title"] || "",
      email: p["email"] || p["Email"] || "",
    }));

    if (isBulk) {
      setUseDB(false);
      setManualBulkData(mapped);
      toast.info("CSV loaded as manual recipients (switched to Manual mode)");
    } else {
      setManualData(mapped[0] ?? manualData);
    }
  }

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    await handleFile(file);
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);
  const onChooseFileClick = () => fileInputRef.current?.click();
  const onFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    await handleFile(f);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /** --- Helper functions to generate preview text --- */
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

  /** --- Render --- */
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Put all your current JSX from page.tsx here, unchanged */}
      {/* ... */}
      <h1 className="text-4xl font-bold">Email Template Generator</h1>
      {/* Keep the rest of the JSX intact as in your current file */}
    </div>
  );
}
