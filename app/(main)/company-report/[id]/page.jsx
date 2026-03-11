import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCompanyReport } from "@/actions/report";
import ReportPreview from "../_components/report-preview";

export default async function ViewCompanyReportPage({ params }) {
  const { id } = await params;
  const report = await getCompanyReport(id);

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-2">
        <Link href="/company-report">
          <Button variant="link" className="gap-2 pl-0">
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
        </Link>

        <h1 className="text-6xl font-bold gradient-title mb-6">
          {report?.companyName} — {report?.sector}
        </h1>
      </div>

      <ReportPreview content={report?.content} />
    </div>
  );
}
