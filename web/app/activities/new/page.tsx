"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Activity } from "@/lib/types";

export default function NewActivityPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState(5);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await apiFetch<{ activity: Activity }>("/activities", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          location,
          startsAt: new Date(startsAt).toISOString(),
          capacity,
        }),
      });
      router.push(`/activities/${result.activity.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to create activity");
    }
  }

  return (
    <main>
      <h1>Host an activity</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label>
          Location
          <input value={location} onChange={(e) => setLocation(e.target.value)} required />
        </label>
        <label>
          Starts at
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </label>
        <label>
          Capacity
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            required
          />
        </label>
        <button type="submit">Create</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
