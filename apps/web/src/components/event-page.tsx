"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { ArrowLeft, ArrowRight, Helicopter, Phone, Plus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { eventsApi } from "@/lib/site";
import { Button } from "./ui/button";

const REF_KEY = "prebook-ref";

// ponytail: last affiliate link wins and never expires, add a timestamp if credit should lapse.
/** Remembers the affiliate from `?ref=` so a later visit without it still credits them. */
export function affiliateRef(search: string) {
  const ref = new URLSearchParams(search).get("ref")?.trim();
  try {
    if (ref) localStorage.setItem(REF_KEY, ref);
    return ref || localStorage.getItem(REF_KEY);
  } catch {
    return ref || null;
  }
}

const steps = [
  [
    "Pre-register",
    "Share your name, mobile number, address and how many people are flying. It takes under a minute.",
  ],
  [
    "Get a call from the team",
    "PreBooking will call you to confirm the date, time slot, fare and boarding point before anything is final.",
  ],
  [
    "Take off over Nellai",
    "Arrive at the boarding point on your confirmed day and see Tirunelveli from the sky.",
  ],
];

const questions = [
  [
    "Is pre-registering the same as a confirmed seat?",
    "No. Pre-registering reserves your interest. Your seat is confirmed only after the PreBooking team calls you with the date, time slot and fare.",
  ],
  [
    "Do I pay anything on this page?",
    "No payment is taken online. The team will explain the fare and how to pay when they call to confirm.",
  ],
  [
    "How many people can I register?",
    "Up to six passengers per mobile number. Each mobile number can be registered once for this ride.",
  ],
  [
    "Need to change your details?",
    "Call the PreBooking team on 73971 67111 or 73971 97111 and they will update your registration.",
  ],
];

export function BoardingPass() {
  return (
    <aside className="boarding-pass" aria-label="Event summary">
      <img
        className="pass-photo"
        src="/images/helicopter-ride.webp"
        alt="A helicopter in flight above a forested ridge"
        width="1200"
        height="675"
        loading="lazy"
        decoding="async"
      />
      <div className="pass-head">
        <Helicopter size={22} aria-hidden="true" />
        <span>Helicopter ride</span>
      </div>
      <dl className="pass-details">
        <div>
          <dt>City</dt>
          <dd>Tirunelveli</dd>
        </div>
        <div>
          <dt>State</dt>
          <dd>Tamil Nadu</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>To be announced</dd>
        </div>
        <div>
          <dt>Per registration</dt>
          <dd>Up to 6 seats</dd>
        </div>
      </dl>
      <p className="pass-stub">Pre-register now. Confirmed by phone.</p>
    </aside>
  );
}

function RegistrationForm() {
  const reduceMotion = useReducedMotion();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ name: string; phone: string } | null>(
    null,
  );
  const confirmation = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    affiliateRef(window.location.search);
  }, []);

  useEffect(() => {
    if (done) confirmation.current?.focus();
  }, [done]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setSending(true);
    setError("");
    try {
      const response = await fetch(`${eventsApi}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fields,
          ref: affiliateRef(window.location.search),
        }),
      });
      if (response.ok)
        return setDone({
          name: String(fields.name).trim().split(/\s+/)[0],
          phone: String(fields.phone),
        });
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong. Please try again.");
    } catch {
      setError(
        "We couldn’t reach the server. Check your connection and try again.",
      );
    } finally {
      setSending(false);
    }
  }

  if (done)
    return (
      <motion.div
        className="register-card register-done"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <Helicopter size={36} aria-hidden="true" />
        <h3 ref={confirmation} tabIndex={-1}>
          You’re on the list, {done.name}.
        </h3>
        <p>
          The PreBooking team will call {done.phone} to confirm the date, time
          slot and fare.
        </p>
        <Link className="text-link" href="/">
          Back to PreBooking <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </motion.div>
    );

  return (
    <form className="register-card" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="name">Full name</label>
        <input
          id="name"
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
        />
      </div>
      <div className="field">
        <label htmlFor="phone">Mobile number</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="98765 43210"
          required
          pattern="[0-9 +\-]{10,16}"
          title="A 10-digit Indian mobile number"
        />
      </div>
      <div className="field">
        <label htmlFor="email">
          Email <span>(optional)</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={120}
        />
      </div>
      <div className="field">
        <label htmlFor="address">Address</label>
        <textarea
          id="address"
          name="address"
          autoComplete="street-address"
          rows={3}
          required
          minLength={10}
          maxLength={300}
          placeholder="House, street, area and pincode"
        />
      </div>
      <div className="field">
        <label htmlFor="passengers">Passengers</label>
        <select id="passengers" name="passengers" defaultValue="1">
          {[1, 2, 3, 4, 5, 6].map((count) => (
            <option key={count} value={count}>
              {count} {count === 1 ? "person" : "people"}
            </option>
          ))}
        </select>
      </div>
      <p className="form-error" role="alert">
        {error}
      </p>
      <Button type="submit" size="lg" className="register-submit" disabled={sending}>
        {sending ? "Sending…" : "Pre-register"}
        {!sending && <ArrowRight aria-hidden="true" />}
      </Button>
      <p className="form-note">
        We use these details only to contact you about this ride.
      </p>
    </form>
  );
}

export default function EventPage() {
  const header = useRef<HTMLElement>(null);
  const page = useRef<HTMLElement>(null);

  useEffect(() => {
    function updateHeader() {
      header.current?.classList.toggle("is-scrolled", window.scrollY > 8);
    }
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const lenis = new Lenis({
          autoRaf: false,
          syncTouch: false,
          anchors: { offset: -96 },
        });
        const tick = (time: number) => lenis.raf(time * 1000);
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(tick);

        const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
        intro
          .from(".flight-path path", {
            strokeDashoffset: 1,
            duration: 2.2,
            ease: "power2.inOut",
          })
          .from(
            "[data-hero-copy]",
            { y: 22, opacity: 0, duration: 0.8, stagger: 0.09, clearProps: "all" },
            0.1,
          )
          .from(
            ".event-hero .boarding-pass",
            {
              x: 40,
              rotate: 3,
              opacity: 0,
              duration: 1,
              clearProps: "all",
            },
            0.35,
          );
        gsap.to(".event-hero .pass-head svg", {
          y: -4,
          duration: 1.6,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
        for (const [targets, trigger] of [
          [".step", ".steps"],
          [".register-layout > *", ".register-layout"],
          [".faq-layout > *", ".faq-layout"],
        ])
          gsap.from(targets, {
            y: 22,
            opacity: 0,
            duration: 0.7,
            stagger: 0.12,
            ease: "expo.out",
            clearProps: "all",
            scrollTrigger: { trigger, start: "top 85%", once: true },
          });
        return () => {
          gsap.ticker.remove(tick);
          lenis.off("scroll", ScrollTrigger.update);
          lenis.destroy();
        };
      },
      page,
    );
    return () => {
      window.removeEventListener("scroll", updateHeader);
      media.revert();
    };
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header" ref={header}>
        <div className="container header-inner">
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
          <Button asChild className="header-cta event-header-cta">
            <a href="#register">Pre-register</a>
          </Button>
        </div>
      </header>

      <main id="main" tabIndex={-1} ref={page}>
        <section className="event-hero" aria-labelledby="event-title">
          <svg
            className="flight-path"
            viewBox="0 0 1200 600"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <path
              d="M-40 520 C 220 470, 360 260, 620 300 S 1000 120, 1240 60"
              pathLength={1}
            />
          </svg>
          <div className="container event-hero-layout">
            <div className="event-hero-copy">
              <Link className="event-back" href="/#events" data-hero-copy>
                <ArrowLeft size={16} aria-hidden="true" /> PreBooking events
              </Link>
              <h1 id="event-title" data-hero-copy>
                See Tirunelveli
                <br />
                <span>from the sky.</span>
              </h1>
              <p data-hero-copy>
                Pre-book a helicopter ride over Nellai with PreBooking. Register
                your interest today and the team will call to confirm your seat,
                date and fare.
              </p>
              <div className="hero-actions" data-hero-copy>
                <Button asChild size="lg">
                  <a href="#register">
                    Pre-register now <ArrowRight aria-hidden="true" />
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="hero-call"
                >
                  <a href="tel:7397167111">Call 73971 67111</a>
                </Button>
              </div>
            </div>
            <BoardingPass />
          </div>
        </section>

        <section
          className="how-section section-space"
          aria-labelledby="event-how-title"
        >
          <div className="container">
            <div className="section-heading">
              <h2 id="event-how-title">
                Three steps
                <br />
                to take off.
              </h2>
              <p>
                Pre-registration comes first.
                <br />
                Everything else is confirmed by phone.
              </p>
            </div>
            <ol className="steps">
              {steps.map(([title, description], index) => (
                <li className="step" key={title}>
                  <span className="step-number" aria-hidden="true">
                    0{index + 1}
                    <ArrowRight size={22} aria-hidden="true" />
                  </span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="register"
          tabIndex={-1}
          className="register-section section-space"
          aria-labelledby="register-title"
        >
          <div className="container register-layout">
            <div className="register-copy">
              <h2 id="register-title">
                Reserve your
                <br />
                <span>place in the sky.</span>
              </h2>
              <p>
                Tell us who is flying and how to reach you. The PreBooking team
                will call you before anything is final.
              </p>
              <a className="text-link" href="tel:7397197111">
                <Phone size={18} aria-hidden="true" />
                Prefer to talk? 73971 97111
              </a>
            </div>
            <RegistrationForm />
          </div>
        </section>

        <section
          className="faq-section section-space"
          aria-labelledby="event-faq-title"
        >
          <div className="container faq-layout">
            <div>
              <h2 id="event-faq-title">
                Before you
                <br />
                take off.
              </h2>
              <p>A few things worth knowing.</p>
            </div>
            <div className="faq-list">
              {questions.map(([question, answer]) => (
                <details className="faq-item" name="event-faq" key={question}>
                  <summary>
                    {question}
                    <Plus size={20} aria-hidden="true" />
                  </summary>
                  <p className="faq-content">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer event-footer">
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} PreBooking.</span>
          <Link href="/">
            Back to PreBooking <ArrowRight size={13} aria-hidden="true" />
          </Link>
          <a href="https://zenyne.com" target="_blank" rel="noopener noreferrer">
            Made with care by Zenyne Labs
          </a>
        </div>
      </footer>
    </>
  );
}
