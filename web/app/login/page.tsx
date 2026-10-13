"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setToken } from "@/lib/api";
import { User } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/signup";
      const body = mode === "login" ? { email, password } : { email, password, name };
      const result = await apiFetch<{ token: string; user: User }>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setToken(result.token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "something went wrong");
    }
  }

  return (
    <main>
      <h1>{mode === "login" ? "Log in" : "Sign up"}</h1>
      <form onSubmit={handleSubmit}>
        {mode === "signup" && (
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit">{mode === "login" ? "Log in" : "Sign up"}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <button onClick={() => setMode(mode === "login" ? "signup" : "login")}>
        {mode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
      </button>
    </main>
  );
}
