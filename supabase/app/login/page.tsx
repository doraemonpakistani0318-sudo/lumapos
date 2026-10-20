"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Boxes, LockKeyhole } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/");
    });
  }, [router]);

  const handleAuth = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    if (!supabase) {
      setMessage("Cloud login is not configured yet. Add your Supabase URL and public anon key to .env.local, then restart the website.");
      return;
    }
    setBusy(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { username: email.trim().split("@")[0] } },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage("Account created. Check your email to confirm your account, then sign in.");
          setIsSignUp(false);
        } else {
          router.replace("/");
        }
      } else {
        const identifier = email.trim();
        const loginEmail = identifier.toLowerCase() === "doraemon" ? "doraemonpakistani0318@gmail.com" : identifier;
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) throw error;
        router.replace("/");
      }
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-logo"><Boxes size={27} /></div>
        <p className="eyebrow">LUMAPOS SECURE WORKSPACE</p>
        <h1>{isSignUp ? "Create your shop account" : "Welcome back"}</h1>
        <p className="auth-subtitle">Sign in to access your products, sales, inventory and shop settings across devices.</p>
        <form onSubmit={handleAuth} className="auth-form">
          <label>{isSignUp ? "Email address" : "Username or email"}
            <input type={isSignUp ? "email" : "text"} autoComplete={isSignUp ? "email" : "username"} required value={email} onChange={e => setEmail(e.target.value)} placeholder={isSignUp ? "you@example.com" : "Doraemon or doraemonpakistani0318@gmail.com"} />
          </label>
          <label>Password
            <input type="password" autoComplete={isSignUp ? "new-password" : "current-password"} minLength={6} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </label>
          <button className="primary-button" type="submit" disabled={busy}>{busy ? "Please wait…" : isSignUp ? "Create account" : "Sign in securely"}</button>
          <button className="text-button auth-switch" type="button" onClick={() => { setIsSignUp(v => !v); setMessage(""); }}>
            {isSignUp ? "Already have an account? Sign in" : "New shop? Create an account"}
          </button>
          {message && <p className="notice auth-notice" role="status">{message}</p>}
        </form>
        <p className="auth-foot"><LockKeyhole size={14} style={{ display: "inline", verticalAlign: "-2px" }} /> Your records are protected by account-based database policies.</p>
        <button className="text-button" type="button" onClick={() => router.push("/")}><ArrowLeft size={15} style={{ display: "inline", verticalAlign: "-2px" }} /> Back to LumaPOS</button>
      </section>
    </main>
  );
}
