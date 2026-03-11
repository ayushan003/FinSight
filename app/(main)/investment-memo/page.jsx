import { getMemo } from "@/actions/memo";
import MemoBuilder from "./_components/memo-builder";

export default async function InvestmentMemoPage() {
  const memo = await getMemo();

  return (
    <div className="container mx-auto py-6">
      <MemoBuilder initialContent={memo?.content} />
    </div>
  );
}
