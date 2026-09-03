import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AlertForm } from "@/components/alerts/AlertForm";
import { AlertList } from "@/components/alerts/AlertList";

export const metadata: Metadata = { title: "Alerts" };

export default function AlertsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Rate alerts"
        description="Get told the moment a rate crosses the level you're watching for."
      />
      <AlertForm />
      <AlertList />
    </div>
  );
}
