import { getCompanyReports } from "@/actions/report";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReportList from "./_components/report-list";

export default async function CompanyReportPage() {
  const reports = await getCompanyReports();

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-2 items-center justify-between mb-5">
        <h1 className="text-6xl font-bold gradient-title">
          Company Analysis Reports
        </h1>
        <Link href="/company-report/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Button>
        </Link>
      </div>

      <ReportList reports={reports} />
    </div>
  );
}
