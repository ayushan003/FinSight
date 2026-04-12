"use client";

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function TopicAbilities({ abilities }) {
  if (!abilities?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="gradient-title text-3xl md:text-4xl">
          Topic Proficiency
        </CardTitle>
        <CardDescription>
          Your estimated ability per topic (Elo-rated, updates after each quiz)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {abilities.map((a) => {
            const pct = Math.round(a.ability * 100);
            const accuracy = a.attempts > 0 ? Math.round((a.correct / a.attempts) * 100) : 0;
            return (
              <div key={a.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{a.topic}</span>
                  <span className="text-muted-foreground">
                    {pct}% ability · {accuracy}% accuracy · {a.attempts} attempts
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
