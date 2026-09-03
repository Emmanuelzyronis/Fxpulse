import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { LogList } from "@/components/log/LogList";

export const metadata: Metadata = { title: "Log" };

export default function LogPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Conversion log"
        description="A running record of the conversions you make — search it, export it, or clear it."
      />
      <LogList />
    </div>
  );
}
