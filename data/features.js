import { BrainCircuit, Briefcase, LineChart, ScrollText } from "lucide-react";

export const features = [
  {
    icon: <BrainCircuit className="w-10 h-10 mb-4 text-primary" />,
    title: "Real-Time Sector Analysis",
    description:
      "Live market data pipeline with computed SMA, volatility, and returns — AI narration built on real metrics, not hallucinations.",
  },
  {
    icon: <Briefcase className="w-10 h-10 mb-4 text-primary" />,
    title: "Adaptive Assessments",
    description:
      "Elo-rated questions that target your weak spots. Spaced repetition ensures missed concepts resurface at optimal intervals.",
  },
  {
    icon: <LineChart className="w-10 h-10 mb-4 text-primary" />,
    title: "Company Analysis Reports",
    description:
      "Generate structured analysis reports for any company with AI that incorporates your analytical profile.",
  },
  {
    icon: <ScrollText className="w-10 h-10 mb-4 text-primary" />,
    title: "Observable Data Pipeline",
    description:
      "Watch your dashboard refresh in real time — SSE streams every stage from data fetch to metric computation to AI analysis.",
  },
];
