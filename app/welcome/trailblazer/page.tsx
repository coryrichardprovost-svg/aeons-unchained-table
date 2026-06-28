"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TrailblazerWelcomePage() {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setIsLeaving(true), 4200);
    const routeTimer = window.setTimeout(() => router.push("/player/characters"), 5000);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(routeTimer);
    };
  }, [router]);

  return (
    <main className={`cinematic-welcome ${isLeaving ? "leaving" : ""}`}>
      <div className="ornate-rule" aria-hidden="true" />
      <h1>Welcome Trailblazer</h1>
      <div className="ornate-rule right" aria-hidden="true" />
    </main>
  );
}
