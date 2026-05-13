"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { TenantLayout } from "@/components/tenant/tenant-layout";
import { ToastViewport, useToast } from "@/components/ui/toast";

type TenantProfile = {
  permanent_address: string;
  occupation_type: string;
  occupation_details: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  id_proof_type: string;
  id_proof_number: string;
  pan_number: string;
  secondary_id_type: string;
  secondary_id_number: string;
};

type TenantDocument = {
  id: string;
  document_type: string;
  secure_url?: string;
  file_name?: string;
  status?: string;
};

const defaultProfile: TenantProfile = {
  permanent_address: "",
  occupation_type: "",
  occupation_details: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_contact_relation: "",
  id_proof_type: "",
  id_proof_number: "",
  pan_number: "",
  secondary_id_type: "",
  secondary_id_number: "",
};

const documentTypes = [
  { value: "aadhaar", label: "Aadhaar" },
  { value: "voter_id", label: "Voter ID" },
  { value: "license", label: "Driving License" },
  { value: "pan", label: "PAN Card" },
  { value: "student_id", label: "Student ID" },
  { value: "employee_id", label: "Employee ID" },
];

export default function TenantOnboardingPage() {
  const [profile, setProfile] = useState<TenantProfile>(defaultProfile);
  const [documents, setDocuments] = useState<TenantDocument[]>([]);
  const [docForm, setDocForm] = useState({
    document_type: "",
    secure_url: "",
    file_name: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const { toast, showToast } = useToast({ defaultDurationMs: 3200 });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profileRes, docRes] = await Promise.all([
        fetch("/api/tenant/profile", { cache: "no-store" }),
        fetch("/api/tenant/documents", { cache: "no-store" }),
      ]);

      const profileData = (await profileRes.json()) as Partial<TenantProfile> & { message?: string };
      const docData = (await docRes.json()) as TenantDocument[] | { message?: string };

      if (profileRes.ok) {
        setProfile({
          permanent_address: profileData.permanent_address || "",
          occupation_type: profileData.occupation_type || "",
          occupation_details: profileData.occupation_details || "",
          emergency_contact_name: profileData.emergency_contact_name || "",
          emergency_contact_phone: profileData.emergency_contact_phone || "",
          emergency_contact_relation: profileData.emergency_contact_relation || "",
          id_proof_type: profileData.id_proof_type || "",
          id_proof_number: profileData.id_proof_number || "",
          pan_number: profileData.pan_number || "",
          secondary_id_type: profileData.secondary_id_type || "",
          secondary_id_number: profileData.secondary_id_number || "",
        });
      }

      if (docRes.ok) {
        setDocuments(Array.isArray(docData) ? docData : []);
      }
    } catch {
      showToast("Unable to load onboarding data.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingProfile(true);

    try {
      const response = await fetch("/api/tenant/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        showToast(result.message || "Failed to save profile.", "error");
        return;
      }

      showToast("Profile saved.", "success");
    } catch {
      showToast("Unable to save profile.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const onAddDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!docForm.document_type) {
      showToast("Select a document type.", "error");
      return;
    }

    setIsAddingDoc(true);

    try {
      const response = await fetch("/api/tenant/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_type: docForm.document_type,
          secure_url: docForm.secure_url,
          file_name: docForm.file_name,
          provider: "cloudinary",
        }),
      });

      const result = (await response.json()) as { message?: string } & TenantDocument;
      if (!response.ok) {
        showToast(result.message || "Failed to add document.", "error");
        return;
      }

      setDocuments((prev) => [result, ...prev]);
      setDocForm({ document_type: "", secure_url: "", file_name: "" });
      showToast("Document metadata added.", "success");
    } catch {
      showToast("Unable to add document.", "error");
    } finally {
      setIsAddingDoc(false);
    }
  };

  const onComplete = async () => {
    setIsCompleting(true);

    try {
      const response = await fetch("/api/tenant/onboarding/complete", { method: "POST" });
      const result = (await response.json()) as { message?: string; missing?: string[] };

      if (!response.ok) {
        const missing = Array.isArray(result.missing) ? result.missing.join(", ") : "";
        showToast(result.message || `Onboarding incomplete: ${missing}`, "error");
        return;
      }

      showToast("Onboarding completed successfully.", "success");
    } catch {
      showToast("Unable to complete onboarding.", "error");
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <TenantLayout>
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">Onboarding</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-text-title)]">Complete your profile</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">Fill your details and upload required documents.</p>

        {isLoading ? (
          <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 text-sm text-[var(--color-text-muted)]">
            Loading onboarding...
          </div>
        ) : null}

        <form onSubmit={onSaveProfile} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-[var(--color-text-secondary)] sm:col-span-2">
            Permanent Address
            <input value={profile.permanent_address} onChange={(e) => setProfile((p) => ({ ...p, permanent_address: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Occupation Type (student/employee)
            <input value={profile.occupation_type} onChange={(e) => setProfile((p) => ({ ...p, occupation_type: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Occupation Details
            <input value={profile.occupation_details} onChange={(e) => setProfile((p) => ({ ...p, occupation_details: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Emergency Contact Name
            <input value={profile.emergency_contact_name} onChange={(e) => setProfile((p) => ({ ...p, emergency_contact_name: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Emergency Contact Phone
            <input value={profile.emergency_contact_phone} onChange={(e) => setProfile((p) => ({ ...p, emergency_contact_phone: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Emergency Contact Relation
            <input value={profile.emergency_contact_relation} onChange={(e) => setProfile((p) => ({ ...p, emergency_contact_relation: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            ID Proof Type (aadhaar/voter_id/license)
            <input value={profile.id_proof_type} onChange={(e) => setProfile((p) => ({ ...p, id_proof_type: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            ID Proof Number
            <input value={profile.id_proof_number} onChange={(e) => setProfile((p) => ({ ...p, id_proof_number: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            PAN Number
            <input value={profile.pan_number} onChange={(e) => setProfile((p) => ({ ...p, pan_number: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Secondary ID Type (student_id/employee_id)
            <input value={profile.secondary_id_type} onChange={(e) => setProfile((p) => ({ ...p, secondary_id_type: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Secondary ID Number
            <input value={profile.secondary_id_number} onChange={(e) => setProfile((p) => ({ ...p, secondary_id_number: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button disabled={isSavingProfile} type="submit" className="cursor-pointer rounded-md bg-[var(--color-emerald)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {isSavingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
        <h2 className="text-xl font-black text-[var(--color-text-title)]">Documents</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Upload your documents via Cloudinary later. For now, add metadata.</p>

        <form onSubmit={onAddDocument} className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Document Type
            <select value={docForm.document_type} onChange={(e) => setDocForm((p) => ({ ...p, document_type: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
              <option value="">Select type</option>
              {documentTypes.map((doc) => (
                <option key={doc.value} value={doc.value}>{doc.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Secure URL
            <input value={docForm.secure_url} onChange={(e) => setDocForm((p) => ({ ...p, secure_url: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            File Name
            <input value={docForm.file_name} onChange={(e) => setDocForm((p) => ({ ...p, file_name: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <div className="sm:col-span-3 flex justify-end">
            <button disabled={isAddingDoc} type="submit" className="cursor-pointer rounded-md bg-[var(--color-sky)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {isAddingDoc ? "Adding..." : "Add Document"}
            </button>
          </div>
        </form>

        {documents.length ? (
          <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">File</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Status</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-t border-[var(--color-border)]">
                    <td className="px-4 py-3 font-semibold text-[var(--color-text-title)]">{doc.document_type}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{doc.file_name || doc.secure_url || "-"}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{doc.status || "pending"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">No documents added yet.</p>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onComplete}
            disabled={isCompleting}
            className="cursor-pointer rounded-xl bg-[var(--color-emerald)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] disabled:opacity-60"
          >
            {isCompleting ? "Completing..." : "Complete Onboarding"}
          </button>
        </div>
      </section>

      <ToastViewport toast={toast} />
    </TenantLayout>
  );
}
