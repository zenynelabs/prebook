"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { ArrowRight, ArrowUpRight, Mail, MapPin, Menu, Phone, Plus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";

const navigation = [
  ["The community", "#community"],
  ["Why Prebook", "#why-prebooking"],
  ["How to connect", "#how-it-works"],
  ["FAQs", "#questions"],
];

const communityLinks = [
  ["Who it’s for", "#who-its-for"],
  ["Shared learning", "#shared-learning"],
  ["Our approach", "#community-values"],
];

const audience = [
  ["Business owners", "You know your business inside out. Meet people who can bring a different perspective to the decisions, challenges and opportunities ahead."],
  ["Independent professionals", "Your expertise has a place in the conversation. Help others understand your work, the problems you solve and when an introduction would be useful."],
  ["People starting something new", "An early idea can benefit from an experienced ear. Ask questions, listen to different experiences and put your next decision into perspective."],
  ["Established teams", "Look beyond your usual circle. Get to know people in other industries and explore where your experience and theirs might complement each other."],
];

const communityValues = [
  ["Be curious", "Ask a better question. Learn what someone is building, who they help and what a useful connection looks like for them."],
  ["Be thoughtful", "Make introductions with context and permission. Respect people’s time, follow through on what you offer and leave room for them to decide."],
  ["Be generous", "Share something useful: an experience, a perspective or an introduction. Small contributions can make a conversation worth having."],
];

const benefits = [
  ["People, before pitches.", "Get to know the person behind a business. Understand what they do, who they help and what they’re working towards."],
  ["Introductions that mean something.", "A relevant referral can open a door. Build the understanding that helps you recognise a good opportunity for someone else."],
  ["A different perspective.", "Share ideas with people beyond your own industry. There’s always something to learn from another business owner’s experience."],
];

const steps = [
  ["Start a conversation", "Call the Prebook team. Tell us a little about yourself and what you’re looking for in a business community."],
  ["Introduce your business", "Share what you do, the people you serve and the kinds of connections that would be useful to you."],
  ["Explore the next step", "Speak with the team about participation and current opportunities to connect. Get the details before you decide."],
];

const questions = [
  ["What is Prebook?", "Prebook is a business community based in Tirunelveli, Tamil Nadu. Its focus is bringing business owners and professionals together around relationships, ideas and shared opportunities."],
  ["Who is the community for?", "Business owners, entrepreneurs and independent professionals who want to get to know other businesses. Speak with the team about your work and what you hope to find."],
  ["How do I get involved?", "Call the Prebook team on 73971 67111. They can explain the community, discuss your business and help you understand the next steps."],
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
  const header = useRef<HTMLElement>(null);
  const scroll = useRef<Lenis | null>(null);
  const navigationFrame = useRef<number | null>(null);
  const navigationTarget = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    function updateHeader() {
      header.current?.classList.toggle("is-scrolled", window.scrollY > 8);
    }
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const lenis = new Lenis({ autoRaf: false, syncTouch: false });
      scroll.current = lenis;
      const tick = (time: number) => lenis.raf(time * 1000);
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      if (document.querySelector("[data-slot='sheet-content']")) lenis.stop();

      gsap.from(".hero-background", {
        scale: 1.055,
        duration: 1.6,
        ease: "power2.out",
        clearProps: "transform",
      });
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
      gsap.from(".referral-path li", {
        y: 18, opacity: 0, duration: 0.6, stagger: 0.1,
        ease: "expo.out", clearProps: "all",
        scrollTrigger: { trigger: ".referral-path", start: "top 85%", once: true },
      });
      gsap.from(".learning-question", {
        y: 18, opacity: 0, duration: 0.7,
        ease: "expo.out", clearProps: "all",
        scrollTrigger: { trigger: ".learning-prompt", start: "top 85%", once: true },
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
      window.removeEventListener("scroll", updateHeader);
      media.revert();
    };
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header" ref={header}>
        <div className="container header-inner">
          <a className="brand" href="#main" aria-label="Prebook home">
            <img src="/brand/navbar-logo-transparent.png" alt="" width="192" height="192" />
            <span className="brand-copy"><strong>Prebook</strong><span>Business Connect</span></span>
          </a>
          <nav className="desktop-nav" aria-label="Main navigation">
            {navigation.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
          </nav>
          <Button asChild className="header-cta"><a href="tel:7397167111" aria-label="Call Prebook on 7397167111">Let’s connect <ArrowUpRight aria-hidden="true" /></a></Button>
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
                <SheetTitle className="brand sheet-brand"><img src="/brand/emblem.webp?v=transparent-1" alt="" width="256" height="256" /><span className="brand-copy"><strong>Prebook</strong><span>Business Connect</span></span></SheetTitle>
                <SheetDescription>A community for better business connections.</SheetDescription>
              </SheetHeader>
              <nav className="mobile-nav" aria-label="Mobile navigation">
                {[...navigation, ...communityLinks, ["Let’s connect", "#connect"]].map(([label, href]) => (
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
          <img className="hero-background" src="/images/community-hero.webp" alt="" aria-hidden="true" width="1800" height="1200" fetchPriority="high" />
          <div className="container hero-layout">
            <div className="hero-copy">
              <h1 id="hero-title" data-hero-copy>Business networking<br /><span>in Tirunelveli.</span></h1>
              <p data-hero-copy>Prebook brings business owners and professionals together to share ideas, build relationships and explore thoughtful referrals.</p>
              <div className="hero-actions" data-hero-copy>
                <Button asChild size="lg"><a href="#connect">Let’s connect <ArrowUpRight aria-hidden="true" /></a></Button>
                <a className="text-link" href="#community">Meet Prebook <ArrowRight size={18} aria-hidden="true" /></a>
              </div>
            </div>
          </div>
          <div className="container hero-bottom" data-hero-copy>
            <p className="hero-caption">A conversation today.<br /><strong>A possibility tomorrow.</strong></p>
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
              <p>Prebook is a business community in Tirunelveli, Tamil Nadu. Meet people beyond your usual circle, learn from their experience and understand where a thoughtful referral could help. Begin with a conversation and explore what you can do together.</p>
              <a className="text-link" href="#how-it-works">Find your place in the conversation <ArrowRight size={18} aria-hidden="true" /></a>
            </div>
            <figure className="community-photo">
              <img src="/images/community-introduction.webp" alt="Two professionals taking time to talk and get to know one another" width="1400" height="933" loading="lazy" decoding="async" />
              <figcaption>A little time to get to know one another.</figcaption>
            </figure>
          </div>
        </section>

        <section id="community-numbers" className="statistics-section section-space" aria-labelledby="statistics-title">
          <div className="container statistics-layout" data-nosnippet="">
            <div className="statistics-copy">
              <h2 id="statistics-title">The community,<br />in numbers.</h2>
              <p>People, introductions and opportunities. A look at the connections that bring a business community to life.</p>
              <p id="statistics-note" className="statistics-note">Illustrative figures for this preview, not verified Prebook results.</p>
            </div>
            <dl className="statistics-metrics" aria-describedby="statistics-note">
              {[["Global chapters", "79,111+"], ["Global Members", "1499k+"], ["Countries", "95"], ["Referrals shared", "14.9 M"]].map(([label, value]) => (
                <div className="stat-tile" key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              <div className="stat-featured">
                <dt>Revenue</dt>
                <dd>$40.9 B</dd>
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

        <section id="who-its-for" tabIndex={-1} className="audience-section section-space" aria-labelledby="audience-title">
          <div className="container">
            <div className="section-heading">
              <h2 id="audience-title">Different businesses.<br />Common ground.</h2>
              <p>You don’t need to do the same work<br />to have something useful to share.</p>
            </div>
            <dl className="audience-list">
              {audience.map(([title, description]) => <div className="audience-row" key={title}><dt>{title}</dt><dd>{description}</dd></div>)}
            </dl>
            <a className="text-link" href="#how-it-works">Find out how to get involved <ArrowRight size={18} aria-hidden="true" /></a>
          </div>
        </section>

        <section id="referrals" tabIndex={-1} className="referral-section" aria-labelledby="referral-title">
          <div className="container referral-layout">
            <h2 id="referral-title">Someone you know.<br />Someone they need.<br /><span>That’s a beginning.</span></h2>
            <div><p>A good referral connects a real need with the right person. It starts with listening, understanding another business and being willing to make an introduction.</p><a className="text-link" href="#connect">Be part of the conversation <ArrowUpRight size={20} aria-hidden="true" /></a></div>
          </div>
          <div className="container referral-example">
            <h3>A referral starts with understanding.</h3>
            <ol className="referral-path">
              <li><span className="referral-stage">The need</span><h4>A shop is ready for its first website.</h4><p>The owner wants customers to understand what they sell and how to reach them.</p></li>
              <li><span className="referral-stage">The connection</span><h4>You know someone who builds websites.</h4><p>You understand their work and ask both people whether an introduction would be welcome.</p></li>
              <li><span className="referral-stage">The introduction</span><h4>You bring the right context.</h4><p>Share why you thought of them. Let the two businesses decide what comes next.</p></li>
            </ol>
          </div>
        </section>

        <section id="shared-learning" tabIndex={-1} className="learning-section section-space" aria-labelledby="learning-title">
          <div className="container learning-layout">
            <div className="learning-copy">
              <h2 id="learning-title">A fresh perspective<br />can change your<br />next decision.</h2>
              <p>Some of the most useful business lessons begin with a simple question. How did you handle that? What worked? What would you try next?</p>
              <p>Bring a challenge you’re thinking through. Share a lesson you learned the hard way. Another person’s experience can help you see an option you hadn’t considered.</p>
              <a className="text-link" href="#connect">Bring your questions <ArrowUpRight size={18} aria-hidden="true" /></a>
            </div>
            <div className="learning-visual">
              <img className="learning-photo" src="/images/community-learning.webp" alt="Professionals sharing ideas over printed plans at a table" width="1200" height="800" loading="lazy" decoding="async" />
              <aside className="learning-prompt" aria-labelledby="learning-prompt-title">
                <h3 id="learning-prompt-title">A question to start with</h3>
                <p className="learning-question">What would you do differently if you started your business again?</p>
                <p>You don’t need all the answers to add something to the conversation.</p>
              </aside>
            </div>
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

        <section id="community-values" tabIndex={-1} className="values-section section-space" aria-labelledby="values-title">
          <div className="container">
            <div className="section-heading">
              <h2 id="values-title">The way we show up<br />matters.</h2>
              <p>Good connections take more than an introduction.<br />These are the habits we encourage.</p>
            </div>
            <div className="values-list">
              {communityValues.map(([title, description]) => <article className="community-value" key={title}><h3>{title}</h3><p>{description}</p></article>)}
            </div>
          </div>
        </section>

        <section id="questions" tabIndex={-1} className="faq-section section-space" aria-labelledby="faq-title">
          <div className="container faq-layout">
            <div><h2 id="faq-title">Before we<br />say hello.</h2><p>A few things you might want to know.</p><a className="text-link" href="#connect">Have another question? <ArrowUpRight size={18} aria-hidden="true" /></a></div>
            <div className="faq-list">{questions.map(([question, answer]) => <details className="faq-item" name="prebooking-faq" key={question}><summary>{question}<Plus size={20} aria-hidden="true" /></summary><p className="faq-content">{answer}</p></details>)}</div>
          </div>
        </section>

        <section id="connect" tabIndex={-1} className="closing-section" aria-labelledby="closing-title">
          <img className="closing-photo" src="/images/community-gathering.webp" alt="" aria-hidden="true" width="1400" height="933" loading="lazy" decoding="async" />
          <div className="container closing-inner">
            <div><h2 id="closing-title">You never know where<br />a hello might lead.</h2><p>Tell us about your business. Let’s see what’s possible together.</p></div>
            <motion.div whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { y: 1 }}>
              <Button asChild size="lg" className="closing-button"><a href="tel:7397167111" aria-label="Call Prebook on 7397167111"><Phone size={20} aria-hidden="true" />Talk to Prebook <ArrowUpRight size={18} aria-hidden="true" /></a></Button>
              <a className="closing-number" href="tel:7397167111">73971 67111</a>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand"><a className="brand footer-logo" href="#main" aria-label="Prebook home"><img src="/brand/emblem.webp?v=transparent-1" alt="" width="256" height="256" loading="lazy" /><span className="brand-copy"><strong>Prebook</strong><span>Business Connect</span></span></a><p>Good people. Better business.</p><span className="location"><MapPin size={15} aria-hidden="true" />Tirunelveli, Tamil Nadu</span></div>
            <nav aria-label="Explore Prebook"><h2>Explore Prebook</h2>{[...navigation, ["Let’s connect", "#connect"]].map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
            <nav aria-label="Community links"><h2>Our community</h2>{[...communityLinks, ["Thoughtful referrals", "#referrals"]].map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
            <div className="footer-contact"><h2>Start a conversation</h2><a className="text-link" href="tel:7397167111"><Phone size={17} aria-hidden="true" />73971 67111</a><a className="text-link contact-email" href="mailto:prebookingpbkworld1@gmail.com"><Mail size={17} aria-hidden="true" /><span>prebookingpbkworld1@gmail.com</span></a><p>We’d like to hear about your business.</p></div>
          </div>
          <div className="footer-bottom"><span>© {new Date().getFullYear()} Prebook.</span><span>Photographs are illustrative.</span><a href="#main">Back to top <ArrowUpRight size={13} aria-hidden="true" /></a><a href="https://zenyne.com" target="_blank" rel="noopener noreferrer">Made with care by Zenyne Labs <ArrowUpRight size={13} aria-hidden="true" /></a></div>
        </div>
      </footer>
    </>
  );
}
