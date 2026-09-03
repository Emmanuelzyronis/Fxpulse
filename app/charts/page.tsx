import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChartsWorkspace } from "@/components/chart/ChartsWorkspace";

export const metadata: Metadata = { title: "Charts" };

export default function ChartsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Charts"
        description="Rate history across timeframes, with multi-pair overlays for comparing trends."
      />
      <ChartsWorkspace />
    </div>
  );
}
