"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ChroniclerWelcomePage() {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setIsLeaving(true), 4200);
    const routeTimer = window.setTimeout(() => router.push("/dm"), 5000);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(routeTimer);
    };
  }, [router]);

  return (
    <main className={`cinematic-welcome ${isLeaving ? "leaving" : ""}`}>
      <div className="ornate-rule" aria-hidden="true" />
      <h1>Welcome Chronicler</h1>
      <div className="ornate-rule right" aria-hidden="true" />
    </main>
  );
}
