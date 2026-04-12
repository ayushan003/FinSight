import { getAssessments, getTopicAbilities } from "@/actions/assessment";
import StatsCards from "./_components/stats-cards";
import PerformanceChart from "./_components/performance-chart";
import QuizList from "./_components/quiz-list";
import TopicAbilities from "./_components/topic-abilities";

export default async function AssessmentPage() {
  const assessments = await getAssessments();
  const abilities = await getTopicAbilities();

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-6xl font-bold gradient-title">
          Adaptive Assessment
        </h1>
      </div>
      <div className="space-y-6">
        <StatsCards assessments={assessments} />
        {abilities.length > 0 && <TopicAbilities abilities={abilities} />}
        <PerformanceChart assessments={assessments} />
        <QuizList assessments={assessments} />
      </div>
    </div>
  );
}
