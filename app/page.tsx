import type { Metadata } from "next";
import { ConverterCard } from "@/components/converter/ConverterCard";

export const metadata: Metadata = {
  title: "Convert",
  description:
    "Convert fiat, crypto and precious metals at live rates, with a rate readout that moves as the market does.",
};

export default function ConvertPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="mb-5 px-0.5">
        <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">Converter</h1>
        <p className="mt-1 max-w-prose text-sm leading-6 text-muted">
          Live rates across currencies, crypto and metals — the number moves when the
          market does.
        </p>
      </header>
      <ConverterCard />
    </div>
  );
}
