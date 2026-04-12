"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { generateQuiz, saveQuizResult } from "@/actions/assessment";
import QuizResult from "./quiz-result";
import useFetch from "@/hooks/use-fetch";
import { BarLoader } from "react-spinners";

export default function Quiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  const {
    loading: generatingQuiz,
    fn: generateQuizFn,
    data: quizData,
  } = useFetch(generateQuiz);

  const {
    loading: savingResult,
    fn: saveQuizResultFn,
    data: resultData,
    setData: setResultData,
  } = useFetch(saveQuizResult);

  useEffect(() => {
    if (quizData?.questions) {
      setAnswers(new Array(quizData.questions.length).fill(null));
      setSessionId(quizData.sessionId);
      setCurrentQuestion(0);
    }
  }, [quizData]);

  const handleAnswer = (answer) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answer;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < quizData.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    try {
      await saveQuizResultFn(sessionId, answers);
      toast.success("Assessment completed!");
    } catch (error) {
      toast.error(error.message || "Failed to save assessment results");
    }
  };

  const startNewQuiz = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setSessionId(null);
    setResultData(null);
    generateQuizFn();
  };

  if (generatingQuiz) {
    return (
      <Card className="mx-2">
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Preparing adaptive assessment...</p>
            <p className="text-xs text-muted-foreground">Selecting questions based on your ability profile</p>
            <BarLoader className="mx-auto" width={"60%"} color="gray" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (resultData) {
    return (
      <div className="mx-2">
        <QuizResult result={resultData} onStartNew={startNewQuiz} />
      </div>
    );
  }

  if (!quizData?.questions) {
    return (
      <Card className="mx-2">
        <CardHeader>
          <CardTitle>Adaptive Knowledge Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This assessment adapts to your skill level. Questions are selected based on your
            estimated ability per topic using an Elo-style rating system. Missed questions
            will reappear at spaced intervals for review.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Questions</p>
              <p className="text-lg font-bold">10</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Adaptive</p>
              <p className="text-lg font-bold">Elo</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Review</p>
              <p className="text-lg font-bold">Spaced</p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={generateQuizFn} className="w-full">
            Start Assessment
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const questions = quizData.questions;
  const question = questions[currentQuestion];

  const getDifficultyLabel = (d) => {
    if (d < 0.3) return { label: "Easy", variant: "outline" };
    if (d < 0.7) return { label: "Medium", variant: "secondary" };
    return { label: "Hard", variant: "destructive" };
  };

  const diff = getDifficultyLabel(question.difficulty || 0.5);

  return (
    <Card className="mx-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Question {currentQuestion + 1} of {questions.length}
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant={diff.variant}>{diff.label}</Badge>
            <Badge variant="outline">{question.topic}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-lg font-medium">{question.question}</p>
        <RadioGroup
          onValueChange={handleAnswer}
          value={answers[currentQuestion]}
          className="space-y-2"
        >
          {(question.options || []).map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem value={option} id={`option-${index}`} />
              <Label htmlFor={`option-${index}`}>{option}</Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          onClick={handleNext}
          disabled={!answers[currentQuestion] || savingResult}
          className="ml-auto"
        >
          {savingResult && <BarLoader className="mr-2" width={40} color="gray" />}
          {currentQuestion < questions.length - 1 ? "Next Question" : "Finish Assessment"}
        </Button>
      </CardFooter>
    </Card>
  );
}
