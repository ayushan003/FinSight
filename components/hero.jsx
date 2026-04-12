"use client";

import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const PARTICLE_COUNT = 180;
const ORB_RADIUS = 160;

const HeroSection = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let width = canvas.parentElement.offsetWidth;
    let height = 500;
    canvas.width = width;
    canvas.height = height;
    const cx = width / 2;
    const cy = height / 2;

    // Generate particles on a sphere surface using fibonacci distribution
    const particles = [];
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;

      particles.push({
        // base position on unit sphere
        bx: radiusAtY * Math.cos(theta),
        by: y,
        bz: radiusAtY * Math.sin(theta),
        // organic float offset phase
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        phaseZ: Math.random() * Math.PI * 2,
        floatSpeed: 0.3 + Math.random() * 0.5,
        floatAmp: 0.02 + Math.random() * 0.04,
        size: 1 + Math.random() * 2,
      });
    }

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / width - 0.5) * 2;
      mouseRef.current.y = ((e.clientY - rect.top) / height - 0.5) * 2;
    };

    const handleResize = () => {
      width = canvas.parentElement.offsetWidth;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    let time = 0;
    const animate = () => {
      time += 0.008;
      ctx.clearRect(0, 0, width, height);

      // Rotation angles — slow auto-rotate + mouse parallax
      const rotY = time * 0.4 + mouseRef.current.x * 0.3;
      const rotX = Math.sin(time * 0.2) * 0.1 + mouseRef.current.y * 0.2;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // Sort particles by z-depth for correct rendering order
      const projected = particles.map((p) => {
        // Add organic floating motion
        const fx = p.bx + Math.sin(time * p.floatSpeed + p.phaseX) * p.floatAmp;
        const fy = p.by + Math.sin(time * p.floatSpeed * 0.8 + p.phaseY) * p.floatAmp;
        const fz = p.bz + Math.sin(time * p.floatSpeed * 0.6 + p.phaseZ) * p.floatAmp;

        // Rotate Y
        const x1 = fx * cosY - fz * sinY;
        const z1 = fx * sinY + fz * cosY;
        // Rotate X
        const y1 = fy * cosX - z1 * sinX;
        const z2 = fy * sinX + z1 * cosX;

        const scale = 1 / (1 + z2 * 0.3);
        return {
          x: cx + x1 * ORB_RADIUS * scale,
          y: cy + y1 * ORB_RADIUS * scale,
          z: z2,
          scale,
          size: p.size,
        };
      });

      projected.sort((a, b) => a.z - b.z);

      // Draw glow background
      const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ORB_RADIUS * 1.8);
      glowGrad.addColorStop(0, "rgba(99, 102, 241, 0.08)");
      glowGrad.addColorStop(0.4, "rgba(139, 92, 246, 0.04)");
      glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw particles
      for (const p of projected) {
        const alpha = 0.15 + (p.z + 1) * 0.4; // front particles brighter
        const radius = p.size * p.scale;

        // Blue-purple gradient per particle based on depth
        const r = Math.round(96 + (p.z + 1) * 30);
        const g = Math.round(90 + (p.z + 1) * 20);
        const b = Math.round(220 + (p.z + 1) * 20);

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(alpha, 0.9)})`;
        ctx.fill();

        // Glow effect on front-facing particles
        if (p.z > 0.2) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.15})`;
          ctx.fill();
        }
      }

      // Draw connecting lines between nearby particles (subtle mesh)
      ctx.strokeStyle = "rgba(139, 92, 246, 0.04)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].x - projected[j].x;
          const dy = projected[i].y - projected[j].y;
          const dist = dx * dx + dy * dy;
          if (dist < 2500 && projected[i].z > -0.3 && projected[j].z > -0.3) {
            ctx.beginPath();
            ctx.moveTo(projected[i].x, projected[i].y);
            ctx.lineTo(projected[j].x, projected[j].y);
            ctx.stroke();
          }
        }
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
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
            Navigate financial markets with real-time data pipelines,
            adaptive assessments, and AI-powered sector analysis.
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

        <div className="relative mx-auto" style={{ maxWidth: "800px" }}>
          <canvas
            ref={canvasRef}
            className="w-full"
            style={{ height: "500px" }}
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
