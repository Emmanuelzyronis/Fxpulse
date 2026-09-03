import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { CompareTable } from "@/components/compare/CompareTable";

export const metadata: Metadata = { title: "Compare" };

export default function ComparePage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Compare"
        description="Fan one amount out across many currencies at once, each with its own trend."
      />
      <CompareTable />
    </div>
  );
}
