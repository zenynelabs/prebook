"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { ArrowDown, ArrowRight, ArrowUpRight, MapPin, Menu, Phone, Plus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";

const navigation = [
  ["The community", "#community"],
  ["Why Prebooking", "#why-prebooking"],
  ["How to connect", "#how-it-works"],
  ["FAQs", "#questions"],
];

const benefits = [
  ["People, before pitches.", "Get to know the person behind a business. Understand what they do, who they help and what they’re working towards."],
  ["Introductions that mean something.", "A relevant referral can open a door. Build the understanding that helps you recognise a good opportunity for someone else."],
  ["A different perspective.", "Share ideas with people beyond your own industry. There’s always something to learn from another business owner’s experience."],
];

const steps = [
  ["Start a conversation", "Call the Prebooking team. Tell us a little about yourself and what you’re looking for in a business community."],
  ["Introduce your business", "Share what you do, the people you serve and the kinds of connections that would be useful to you."],
  ["Explore the next step", "Speak with the team about participation and current opportunities to connect. Get the details before you decide."],
];

const questions = [
  ["What is Prebooking?", "Prebooking is a business community based in Tirunelveli, Tamil Nadu. Its focus is bringing business owners and professionals together around relationships, ideas and shared opportunities."],
  ["Who is the community for?", "Business owners, entrepreneurs and independent professionals who want to get to know other businesses. Speak with the team about your work and what you hope to find."],
  ["How do I get involved?", "Call the Prebooking team on 73971 67111. They can explain the community, discuss your business and help you understand the next steps."],
  ["Are there membership fees or regular meetings?", "Contact the team for current participation details, any applicable fees and meeting arrangements. You can discuss these before making a commitment."],
  ["Can I join online?", "This page introduces the community. Online membership applications and member accounts are not available here. Please contact the team to get started."],
];

export function navigateToSection(target: HTMLElement, scroll: Lenis | null, immediate = false) {
  const hash = `#${target.id}`;
  if (window.location.hash !== hash) window.history.pushState(null, "", hash);
  target.focus({ preventScroll: true });
  if (scroll) scroll.scrollTo(target, { immediate });
  else target.scrollIntoView({ behavior: immediate ? "instant" : "auto" });
}

export default function LandingPage() {
  const page = useRef<HTMLElement>(null);
  const scroll = useRef<Lenis | null>(null);
  const navigationFrame = useRef<number | null>(null);
  const navigationTarget = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const lenis = new Lenis({ autoRaf: false, syncTouch: false });
      scroll.current = lenis;
      const tick = (time: number) => lenis.raf(time * 1000);
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      if (document.querySelector("[data-slot='sheet-content']")) lenis.stop();

      gsap.from("[data-hero-copy]", {
        y: 18,
        opacity: 0,
        duration: 0.75,
        stagger: 0.09,
        ease: "expo.out",
        clearProps: "all",
      });
      gsap.from(".community-layout > *", {
        y: 24, opacity: 0, duration: 0.7, stagger: 0.12,
        ease: "expo.out", clearProps: "all",
        scrollTrigger: { trigger: ".community-layout", start: "top 85%", once: true },
      });
      gsap.from(".relationships-layout > *", {
        y: 24, opacity: 0, duration: 0.7, stagger: 0.12,
        ease: "expo.out", clearProps: "all",
        scrollTrigger: { trigger: ".relationships-layout", start: "top 85%", once: true },
      });
      gsap.from(".step", {
        y: 18, opacity: 0, duration: 0.6, stagger: 0.12,
        ease: "expo.out", clearProps: "all",
        scrollTrigger: { trigger: ".steps", start: "top 85%", once: true },
      });
      gsap.from(".closing-inner", {
        y: 18, opacity: 0, duration: 0.6,
        ease: "expo.out", clearProps: "all",
        scrollTrigger: { trigger: ".closing-inner", start: "top 90%", once: true },
      });
      return () => {
        gsap.ticker.remove(tick);
        lenis.off("scroll", ScrollTrigger.update);
        lenis.destroy();
        scroll.current = null;
      };
    }, page);

    function onAnchorClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href^='#']") : null;
      if (!anchor) return;
      const target = document.getElementById(anchor.getAttribute("href")!.slice(1));
      if (!target) return;
      const menuLink = anchor.closest("[data-slot='sheet-content']");
      if (!scroll.current && !menuLink) return;
      event.preventDefault();
      if (menuLink) navigationTarget.current = target;
      else navigateToSection(target, scroll.current, anchor.classList.contains("skip-link"));
    }
    function onDisclosureToggle(event: Event) {
      if (event.target instanceof HTMLDetailsElement) ScrollTrigger.refresh();
    }
    function onHistoryNavigation() {
      const lenis = scroll.current;
      if (lenis && !lenis.isStopped) {
        // Cancel inertia so browser history can restore its own scroll position.
        lenis.stop();
        lenis.start();
      }
    }
    document.addEventListener("click", onAnchorClick);
    document.addEventListener("toggle", onDisclosureToggle, true);
    window.addEventListener("popstate", onHistoryNavigation);
    window.addEventListener("hashchange", onHistoryNavigation);
    return () => {
      document.removeEventListener("click", onAnchorClick);
      document.removeEventListener("toggle", onDisclosureToggle, true);
      window.removeEventListener("popstate", onHistoryNavigation);
      window.removeEventListener("hashchange", onHistoryNavigation);
      if (navigationFrame.current !== null) cancelAnimationFrame(navigationFrame.current);
      media.revert();
    };
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="container header-inner">
          <a className="wordmark" href="#main" aria-label="Prebooking home">prebooking<span>.</span></a>
          <nav className="desktop-nav" aria-label="Main navigation">
            {navigation.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
          </nav>
          <Button asChild className="header-cta"><a href="tel:7397167111" aria-label="Call Prebooking on 7397167111">Let’s connect <ArrowUpRight aria-hidden="true" /></a></Button>
          <Sheet onOpenChange={(open) => { if (open) scroll.current?.stop(); }}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mobile-menu" aria-label="Open navigation"><Menu size={24} aria-hidden="true" /></Button>
            </SheetTrigger>
            <SheetContent className="navigation-sheet" data-lenis-prevent onCloseAutoFocus={(event) => {
              scroll.current?.start();
              if (navigationTarget.current) {
                event.preventDefault();
                const target = navigationTarget.current;
                navigationTarget.current = null;
                // Wait for Radix to release its body scroll lock before navigating.
                navigationFrame.current = requestAnimationFrame(() => navigateToSection(target, scroll.current));
              }
            }}>
              <SheetHeader>
                <SheetTitle className="wordmark">prebooking.</SheetTitle>
                <SheetDescription>A community for better business connections.</SheetDescription>
              </SheetHeader>
              <nav className="mobile-nav" aria-label="Mobile navigation">
                {[...navigation, ["Let’s connect", "#connect"]].map(([label, href]) => (
                  <SheetClose key={href} asChild><a href={href}>{label}<ArrowUpRight size={20} aria-hidden="true" /></a></SheetClose>
                ))}
              </nav>
              <a className="text-link mobile-contact" href="tel:7397167111"><Phone size={18} aria-hidden="true" />73971 67111</a>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main id="main" tabIndex={-1} ref={page}>
        <section className="hero" aria-labelledby="hero-title">
          <div className="container hero-layout">
            <div className="hero-copy">
              <h1 id="hero-title" data-hero-copy>Good people.<br /><span>Better business.</span></h1>
              <p data-hero-copy>A business community built around real conversations, lasting relationships and shared opportunity.</p>
              <div className="hero-actions" data-hero-copy>
                <Button asChild size="lg"><a href="#connect">Let’s connect <ArrowUpRight aria-hidden="true" /></a></Button>
                <a className="text-link" href="#community">Meet Prebooking <ArrowRight size={18} aria-hidden="true" /></a>
              </div>
              <a className="hero-discover" href="#why-prebooking" data-hero-copy><span className="down-arrow"><ArrowDown size={18} aria-hidden="true" /></span>Discover what brings us together</a>
            </div>
            <figure className="hero-figure">
              <div className="hero-photo"><img src="/images/community-hero.webp" alt="Business professionals getting to know one another over a handshake" width="1800" height="1200" fetchPriority="high" /></div>
              <figcaption><span>A conversation today.<br /><strong>A possibility tomorrow.</strong></span><ArrowUpRight size={32} aria-hidden="true" /></figcaption>
            </figure>
          </div>
        </section>

        <div className="community-principles">
          <div className="container principles-inner"><p>Great connections begin with something simple.</p><span>Show up.</span><span>Listen well.</span><span>Grow together.</span></div>
        </div>

        <section id="community" tabIndex={-1} className="community-section section-space" aria-labelledby="community-title">
          <div className="container community-layout">
            <h2 id="community-title">Behind every business,<br />there’s a person<br /><span>worth knowing.</span></h2>
            <div className="community-copy">
              <p>Running a business is personal. The ambition, the decisions, the small wins. It helps to have people around you who understand.</p>
              <p>Prebooking is a place to begin those connections. A community for business owners and professionals to exchange perspectives, find common ground and explore what they can do together.</p>
              <a className="text-link" href="#how-it-works">Find your place in the conversation <ArrowRight size={18} aria-hidden="true" /></a>
            </div>
          </div>
        </section>

        <section id="community-numbers" className="statistics-section section-space" aria-labelledby="statistics-title">
          <div className="container statistics-layout">
            <div className="statistics-copy">
              <h2 id="statistics-title">The community,<br />in numbers.</h2>
              <p>People, introductions and opportunities. A look at the connections that bring a business community to life.</p>
              <p id="statistics-note" className="statistics-note">Illustrative figures for this preview, not verified Prebooking results.</p>
            </div>
            <dl className="statistics-metrics" aria-describedby="statistics-note">
              {[["Members", "25"], ["Business groups", "2"], ["Locations", "1"], ["Referrals shared", "50"]].map(([label, value]) => (
                <div className="stat-tile" key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              <div className="stat-featured">
                <dt>Business generated</dt>
                <dd>₹1 lakh</dd>
              </div>
            </dl>
          </div>
        </section>

        <section id="why-prebooking" tabIndex={-1} className="relationships-section" aria-labelledby="relationships-title">
          <div className="container relationships-layout">
            <figure className="conversation-figure"><img src="/images/community-conversation.webp" alt="Professionals listening and sharing ideas around a meeting table" width="1400" height="933" loading="lazy" decoding="async" /><figcaption>Different experiences. A shared conversation.</figcaption></figure>
            <div className="relationships-copy">
              <h2 id="relationships-title">More than a contact.<br />A real connection.</h2>
              <div className="benefits-list">
                {benefits.map(([title, description]) => <article className="benefit" key={title}><h3>{title}</h3><p>{description}</p></article>)}
              </div>
            </div>
          </div>
        </section>

        <section className="referral-section" aria-labelledby="referral-title">
          <div className="container referral-layout">
            <h2 id="referral-title">Someone you know.<br />Someone they need.<br /><span>That’s a beginning.</span></h2>
            <div><p>A good referral connects a real need with the right person. It starts with listening, understanding another business and being willing to make an introduction.</p><a className="text-link" href="#connect">Be part of the conversation <ArrowUpRight size={20} aria-hidden="true" /></a></div>
          </div>
        </section>

        <section id="how-it-works" tabIndex={-1} className="how-section section-space" aria-labelledby="how-title">
          <div className="container">
            <div className="section-heading"><h2 id="how-title">Your first connection<br />starts right here.</h2><p>You don’t need a perfect pitch.<br />Just a little curiosity and a conversation.</p></div>
            <ol className="steps">
              {steps.map(([title, description], index) => <li className="step" key={title}><span className="step-number" aria-hidden="true">0{index + 1}<ArrowRight size={22} aria-hidden="true" /></span><h3>{title}</h3><p>{description}</p></li>)}
            </ol>
          </div>
        </section>

        <section id="questions" tabIndex={-1} className="faq-section section-space" aria-labelledby="faq-title">
          <div className="container faq-layout">
            <div><h2 id="faq-title">Before we<br />say hello.</h2><p>A few things you might want to know.</p><a className="text-link" href="#connect">Have another question? <ArrowUpRight size={18} aria-hidden="true" /></a></div>
            <div className="faq-list">{questions.map(([question, answer]) => <details className="faq-item" name="prebooking-faq" key={question}><summary>{question}<Plus size={20} aria-hidden="true" /></summary><p className="faq-content">{answer}</p></details>)}</div>
          </div>
        </section>

        <section id="connect" tabIndex={-1} className="closing-section" aria-labelledby="closing-title">
          <div className="container closing-inner">
            <div><h2 id="closing-title">You never know where<br />a hello might lead.</h2><p>Tell us about your business. Let’s see what’s possible together.</p></div>
            <motion.div whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { y: 1 }}>
              <Button asChild size="lg" className="closing-button"><a href="tel:7397167111" aria-label="Call Prebooking on 7397167111"><Phone size={20} aria-hidden="true" />Talk to Prebooking <ArrowUpRight size={18} aria-hidden="true" /></a></Button>
              <a className="closing-number" href="tel:7397167111">73971 67111</a>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand"><a className="wordmark" href="#main" aria-label="Prebooking home">prebooking<span>.</span></a><p>Good people. Better business.</p><span className="location"><MapPin size={15} aria-hidden="true" />Tirunelveli, Tamil Nadu</span></div>
            <nav aria-label="Community links"><h2>Explore Prebooking</h2>{navigation.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
            <div className="footer-contact"><h2>Start a conversation</h2><a className="text-link" href="tel:7397167111"><Phone size={17} aria-hidden="true" />73971 67111</a><p>We’d like to hear about your business.</p></div>
          </div>
          <div className="footer-bottom"><span>© {new Date().getFullYear()} Prebooking.</span><span>Photographs are illustrative.</span><a href="https://zenyne.com" target="_blank" rel="noopener noreferrer">Made with care by Zenyne Labs <ArrowUpRight size={13} aria-hidden="true" /></a></div>
        </div>
      </footer>
    </>
  );
}
