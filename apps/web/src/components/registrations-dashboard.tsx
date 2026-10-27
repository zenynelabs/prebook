"use client";

import { LogOut, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { eventsApi } from "@/lib/site";
import { Button } from "./ui/button";

export type Registration = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  passengers: number;
  created_at: string;
};

const TOKEN_KEY = "prebook-admin-token";
const dateFormat = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

export function filterRegistrations(rows: Registration[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  const digits = /^[\d\s+-]+$/.test(needle) ? needle.replace(/\D/g, "") : "";
  return rows.filter(
    (row) =>
      `${row.name} ${row.email ?? ""} ${row.address}`
        .toLowerCase()
        .includes(needle) ||
      (digits.length > 0 && row.phone.includes(digits)),
  );
}

function storage(action: (store: Storage) => string | null | void) {
  try {
    return action(sessionStorage) ?? null;
  } catch {
    return null;
  }
}

export default function RegistrationsDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<Registration[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async (value: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${eventsApi}/registrations`, {
        headers: { Authorization: `Bearer ${value}` },
        cache: "no-store",
      });
      if (response.status === 401 || response.status === 400) {
        storage((store) => store.removeItem(TOKEN_KEY));
        setToken(null);
        setError("That access token isn’t valid.");
        return;
      }
      if (!response.ok) throw new Error();
      const body: { registrations: Registration[] } = await response.json();
      storage((store) => store.setItem(TOKEN_KEY, value));
      setToken(value);
      setRows(body.registrations);
    } catch {
      setError("Couldn’t load registrations. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = storage((store) => store.getItem(TOKEN_KEY));
    if (saved) load(saved);
  }, [load]);

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    load(String(new FormData(event.currentTarget).get("token")).trim());
  }

  function signOut() {
    storage((store) => store.removeItem(TOKEN_KEY));
    setToken(null);
    setRows([]);
    setQuery("");
  }

  if (!token)
    return (
      <main className="admin-gate">
        <form className="register-card admin-card" onSubmit={signIn}>
          <Link className="brand" href="/" aria-label="PreBooking home">
            <img
              src="/brand/navbar-logo-transparent.png"
              alt=""
              width="192"
              height="192"
            />
            <span className="brand-copy">
              <strong>PreBooking</strong>
              <span>Business Connect</span>
            </span>
          </Link>
          <h1>Registrations</h1>
          <div className="field">
            <label htmlFor="token">Access token</label>
            <input
              id="token"
              name="token"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <p className="form-error" role="alert">
            {error}
          </p>
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "Opening…" : "Open dashboard"}
          </Button>
        </form>
      </main>
    );

  const visible = filterRegistrations(rows, query);
  const passengers = rows.reduce((sum, row) => sum + row.passengers, 0);

  return (
    <main className="admin-page">
      <div className="container">
        <div className="admin-head">
          <div>
            <h1>Helicopter ride registrations</h1>
            <p>
              {rows.length} {rows.length === 1 ? "registration" : "registrations"}{" "}
              · {passengers} {passengers === 1 ? "passenger" : "passengers"}
            </p>
          </div>
          <div className="admin-actions">
            <Button
              variant="outline"
              onClick={() => load(token)}
              disabled={loading}
            >
              <RefreshCw aria-hidden="true" />
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
            <Button variant="ghost" onClick={signOut}>
              <LogOut aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </div>
        <div className="field admin-search">
          <label htmlFor="search" className="sr-only">
            Search registrations
          </label>
          <Search size={18} aria-hidden="true" />
          <input
            id="search"
            type="search"
            placeholder="Search name, mobile, email or address"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <p className="form-error" role="alert">
          {error}
        </p>
        <div
          className="admin-table"
          role="region"
          tabIndex={0}
          aria-label="Registrations table"
        >
          <table>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Name</th>
                <th scope="col">Mobile</th>
                <th scope="col">Email</th>
                <th scope="col">Address</th>
                <th scope="col">Seats</th>
                <th scope="col">Registered</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.name}</td>
                  <td>
                    <a href={`tel:${row.phone}`}>
                      {row.phone.slice(0, 5)} {row.phone.slice(5)}
                    </a>
                  </td>
                  <td>{row.email ?? "—"}</td>
                  <td className="admin-address">{row.address}</td>
                  <td>{row.passengers}</td>
                  <td>{dateFormat.format(new Date(row.created_at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <p className="admin-empty">
              {rows.length === 0
                ? "No registrations yet."
                : `No registrations match “${query.trim()}”.`}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
