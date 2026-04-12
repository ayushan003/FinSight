import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReportGenerator from "../_components/report-generator";

export default function NewCompanyReportPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-2">
        <Link href="/company-report">
          <Button variant="link" className="gap-2 pl-0">
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
        </Link>

        <div className="pb-6">
          <h1 className="text-6xl font-bold gradient-title">
            Generate Analysis Report
          </h1>
          <p className="text-muted-foreground">
            Create a structured company analysis report using AI
          </p>
        </div>
      </div>

      <ReportGenerator />
    </div>
  );
}
