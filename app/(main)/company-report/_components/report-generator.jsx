"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateCompanyReport } from "@/actions/report";
import useFetch from "@/hooks/use-fetch";
import { reportSchema } from "@/app/lib/schema";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReportGenerator() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(reportSchema),
  });

  const {
    loading: generating,
    fn: generateReportFn,
    data: generatedReport,
  } = useFetch(generateCompanyReport);

  useEffect(() => {
    if (generatedReport) {
      toast.success("Analysis report generated successfully!");
      router.push(`/company-report/${generatedReport.id}`);
      reset();
    }
  }, [generatedReport]);

  const onSubmit = async (data) => {
    try {
      await generateReportFn(data);
    } catch (error) {
      toast.error(error.message || "Failed to generate analysis report");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
          <CardDescription>
            Provide information about the company you want to analyze
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Enter company name"
                  {...register("companyName")}
                />
                {errors.companyName && (
                  <p className="text-sm text-red-500">
                    {errors.companyName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sector">Sector / Focus Area</Label>
                <Input
                  id="sector"
                  placeholder="e.g., FinTech, Banking, Real Estate"
                  {...register("sector")}
                />
                {errors.sector && (
                  <p className="text-sm text-red-500">
                    {errors.sector.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyDescription">
                Company Description &amp; Financials
              </Label>
              <Textarea
                id="companyDescription"
                placeholder="Describe the company's business model, recent financials, market position, or paste relevant context..."
                className="h-32"
                {...register("companyDescription")}
              />
              {errors.companyDescription && (
                <p className="text-sm text-red-500">
                  {errors.companyDescription.message}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  "Generate Analysis Report"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
