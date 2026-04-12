import { Brain, Target, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StatsCards({ assessments }) {
  const hasAssessments = assessments?.length > 0;

  const averageScore = hasAssessments
    ? (
        assessments.reduce((sum, a) => sum + a.quizScore, 0) /
        assessments.length
      ).toFixed(1)
    : "0";

  const totalQuestions = hasAssessments
    ? assessments.reduce((sum, a) => sum + (a.questions?.length || 0), 0)
    : 0;

  const latestScore = hasAssessments
    ? assessments[assessments.length - 1].quizScore.toFixed(1)
    : "0";

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageScore}%</div>
          <p className="text-xs text-muted-foreground">
            Across all assessments
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Questions Completed
          </CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalQuestions}</div>
          <p className="text-xs text-muted-foreground">Total questions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Latest Score</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{latestScore}%</div>
          <p className="text-xs text-muted-foreground">
            Most recent assessment
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
