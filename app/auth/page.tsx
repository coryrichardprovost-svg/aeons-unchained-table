"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { createClient } from "@/lib/supabase/browser";

type AuthMode = "sign-in" | "sign-up";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function submitAuth() {
    setIsLoading(true);
    setMessage("");

    const supabase = createClient();
    const cleanUsername = username.trim().toLowerCase();

    if (mode === "sign-in") {
      if (!cleanUsername) {
        setIsLoading(false);
        setMessage("Enter your username.");
        return;
      }

      const { data: resolvedEmail, error: lookupError } = await supabase.rpc("get_email_for_username", {
        input_username: cleanUsername,
      });

      if (lookupError?.message.includes("get_email_for_username")) {
        setIsLoading(false);
        setMessage("Username login is not connected yet. Run supabase/migrations/004_username_login.sql in Supabase SQL Editor.");
        return;
      }

      if (lookupError || !resolvedEmail) {
        setIsLoading(false);
        setMessage("No account was found for that username.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });

      if (error) {
        setIsLoading(false);
        setMessage(error.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const fallbackUsername = user.email?.split("@")[0]?.toLowerCase() || `trailblazer-${user.id.slice(0, 8)}`;
        const metadata = user.user_metadata || {};
        const profileUsername = String(metadata.username || fallbackUsername).toLowerCase();

        await supabase.from("profiles").upsert(
          {
            id: user.id,
            username: profileUsername,
            display_name: profileUsername,
            email: user.email?.toLowerCase(),
          },
          { onConflict: "id" },
        );

        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
        const hasChroniclerRole = roles?.some((row) => row.role === "chronicler");

        setIsLoading(false);
        router.push(hasChroniclerRole ? "/welcome/chronicler" : "/welcome/trailblazer");
        router.refresh();
        return;
      }

      setIsLoading(false);
      setMessage("Could not load your signed-in user.");
      return;
    }

    if (!cleanUsername) {
      setIsLoading(false);
      setMessage("Choose a username before creating your account.");
      return;
    }

    if (password !== confirmPassword) {
      setIsLoading(false);
      setMessage("Passwords do not match.");
      return;
    }

    if (!email.trim()) {
      setIsLoading(false);
      setMessage("Enter your email before creating your account.");
      return;
    }

    const { data: existingEmail, error: usernameCheckError } = await supabase.rpc("get_email_for_username", {
      input_username: cleanUsername,
    });

    if (usernameCheckError) {
      setIsLoading(false);
      setMessage(
        usernameCheckError.message.includes("get_email_for_username")
          ? "Username login is not connected yet. Run supabase/migrations/004_username_login.sql in Supabase SQL Editor."
          : usernameCheckError.message,
      );
      return;
    }

    if (existingEmail) {
      setIsLoading(false);
      setMessage("That username is already taken.");
      return;
    }

    const authEmail = email.trim().toLowerCase();
    const startingRole = cleanUsername === "the chronicler" ? "chronicler" : "trailblazer";

    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password,
      options: {
        data: {
          username: cleanUsername,
          display_name: cleanUsername,
          role: startingRole,
        },
      },
    });

    if (error) {
      setIsLoading(false);
      setMessage(error.message);
      return;
    }

    if (!data.user || !data.session) {
      setIsLoading(false);
      setMessage(
        "Account created, but it still needs confirmation. For testing, run supabase/migrations/006_confirm_test_auth_users.sql in Supabase SQL Editor.",
      );
      return;
    }

    const profileResult = await supabase.from("profiles").upsert(
      {
        id: data.user.id,
        username: cleanUsername,
        display_name: cleanUsername,
        email: authEmail,
      },
      { onConflict: "id" },
    );

    if (profileResult.error) {
      setIsLoading(false);
      setMessage(profileResult.error.message);
      return;
    }

    setIsLoading(false);

    router.push(startingRole === "chronicler" ? "/welcome/chronicler" : "/welcome/trailblazer");
    router.refresh();
  }

  return (
    <main className="app-shell">
      <section className="login-view">
        <div className="login-panel">
          <div className="brand-lockup">
            <div className="brand-mark">
              <Icon name="aeon" />
            </div>
            <p className="eyebrow">Supabase auth</p>
            <h1>{mode === "sign-in" ? "Sign In" : "Create Account"}</h1>
            <p className="subcopy">
              Sign in with your unique username and password, or create a Trailblazer account for Nate&apos;s Master of Strings campaign.
            </p>
          </div>

          <div className="field-stack">
            <div className="role-toggle" aria-label="Choose auth mode">
              <button className={mode === "sign-in" ? "active" : ""} onClick={() => setMode("sign-in")}>
                Sign In
              </button>
              <button className={mode === "sign-up" ? "active" : ""} onClick={() => setMode("sign-up")}>
                Sign Up
              </button>
            </div>

            <label className="field">
              <span>Username</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} />
            </label>

            {mode === "sign-up" ? (
              <label className="field">
                <span>Email</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
            ) : null}

            <label className="field">
              <span>Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>

            {mode === "sign-up" ? (
              <label className="field">
                <span>Repeat Password</span>
                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </label>
            ) : null}

            <button className="primary-button" onClick={submitAuth} disabled={isLoading}>
              <Icon name="play" /> {isLoading ? "Working..." : mode === "sign-in" ? "Sign In" : "Create Account"}
            </button>

            {message ? <p className="form-message">{message}</p> : null}
          </div>
        </div>

        <div className="preview-panel">
          <div className="preview-content">
            <p className="eyebrow">What this unlocks</p>
            <h2>Trailblazers enter through their Licenses. The Chronicler enters through granted access.</h2>
            <p className="subcopy">
              New signups become Trailblazers. To make Nate the Chronicler, grant his user the `chronicler` role in Supabase.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
