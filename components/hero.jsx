"use client";

import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const HeroSection = () => {
  const imageRef = useRef(null);

  useEffect(() => {
    const imageElement = imageRef.current;

    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const scrollThreshold = 100;

      if (scrollPosition > scrollThreshold) {
        imageElement.classList.add("scrolled");
      } else {
        imageElement.classList.remove("scrolled");
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="w-full pt-36 md:pt-48 pb-10">
      <div className="space-y-6 text-center">
        <div className="space-y-6 mx-auto">
          <h1 className="text-5xl font-bold md:text-6xl lg:text-7xl xl:text-8xl gradient-title animate-gradient">
            Your AI Finance Analyst for
            <br />
            Smarter Decisions
          </h1>
          <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl">
            Navigate financial markets with AI-powered sector analysis,
            investment memos, and structured assessments.
          </p>
        </div>

        <div className="flex justify-center space-x-4">
          <Link href="/dashboard">
            <Button size="lg" className="px-8">
              Get Started
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline" className="px-8">
              Learn More
            </Button>
          </Link>
        </div>

        <div className="hero-image-wrapper mt-5 md:mt-0">
          <div ref={imageRef} className="hero-image">
            <div className="max-w-5xl mx-auto rounded-lg shadow-2xl border border-border/50 overflow-hidden bg-card">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/80 border-b border-border/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/70"></div>
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-background/60 rounded-md px-3 py-1 text-xs text-muted-foreground text-center">
                    localhost:3000/dashboard
                  </div>
                </div>
              </div>
              {/* Dashboard mockup content */}
              <div className="p-6 space-y-4">
                {/* Stat cards row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                    <div className="text-xs text-muted-foreground">
                      Sector Growth
                    </div>
                    <div className="text-2xl font-bold text-green-500">
                      +12.4%
                    </div>
                    <div className="h-1.5 rounded-full bg-green-500/20">
                      <div className="h-1.5 rounded-full bg-green-500 w-3/4"></div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                    <div className="text-xs text-muted-foreground">
                      Investment Activity
                    </div>
                    <div className="text-2xl font-bold">High</div>
                    <div className="h-1.5 rounded-full bg-blue-500/20">
                      <div className="h-1.5 rounded-full bg-blue-500 w-4/5"></div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                    <div className="text-xs text-muted-foreground">
                      Assessment Score
                    </div>
                    <div className="text-2xl font-bold text-primary">87%</div>
                    <div className="h-1.5 rounded-full bg-primary/20">
                      <div className="h-1.5 rounded-full bg-primary w-[87%]"></div>
                    </div>
                  </div>
                </div>
                {/* Chart area */}
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="text-sm font-medium mb-3">
                    Compensation Benchmarks by Role
                  </div>
                  <div className="flex items-end gap-3" style={{ height: "128px" }}>
                    {[65, 82, 45, 90, 72, 55, 88, 60].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t"
                        style={{
                          height: `${Math.round(128 * h / 100)}px`,
                          background: "linear-gradient(to top, #2563eb, #60a5fa)",
                          minWidth: "8px",
                        }}
                      ></div>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-2">
                    {[
                      "Analyst",
                      "Associate",
                      "VP",
                      "Director",
                      "MD",
                      "PM",
                      "Quant",
                      "Risk",
                    ].map((l, i) => (
                      <div
                        key={i}
                        className="flex-1 text-[9px] text-muted-foreground text-center truncate"
                      >
                        {l}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Bottom row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="text-sm font-medium mb-2">
                      Key Sector Trends
                    </div>
                    <div className="space-y-2">
                      {[
                        "AI-driven risk modeling",
                        "ESG integration",
                        "DeFi convergence",
                      ].map((t, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                          <span className="text-xs text-muted-foreground">
                            {t}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="text-sm font-medium mb-2">
                      Recommended Skills
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {["Python", "DCF", "Monte Carlo", "Bloomberg", "SQL"].map(
                        (s, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                          >
                            {s}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
