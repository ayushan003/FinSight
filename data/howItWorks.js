import { UserPlus, FileEdit, Users, LineChart } from "lucide-react";

export const howItWorks = [
  {
    title: "Analyst Setup",
    description: "Select your financial sector and expertise to unlock personalized tools",
    icon: <UserPlus className="w-8 h-8 text-primary" />,
  },
  {
    title: "Report Generation",
    description: "Create investment memos and company analysis reports with AI assistance",
    icon: <FileEdit className="w-8 h-8 text-primary" />,
  },
  {
    title: "Knowledge Assessment",
    description: "Test your finance knowledge with AI-generated sector-specific questions",
    icon: <Users className="w-8 h-8 text-primary" />,
  },
  {
    title: "Performance Tracking",
    description: "Monitor your assessment scores and identify areas for deeper study",
    icon: <LineChart className="w-8 h-8 text-primary" />,
  },
];
