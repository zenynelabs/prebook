import gsap from "gsap";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  MapPin,
  Menu,
  Plus,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

/* Direction: BNI's photographic opening and alternating editorial sections,
   rebuilt for Prebooking in white, Inter and blue. The first viewport pairs a
   full-width celebration photograph with a left-aligned headline and a clear
   path to three sections. One GSAP opening; Motion handles selection feedback.
   No invented inventory, testimonials, partners or transactional features. */

const sections = [
  {
    id: "crackers",
    name: "Crackers",
    short: "For brighter celebrations.",
    alt: "Warm light from sparklers during a celebration",
  },
  {
    id: "clothing",
    name: "Clothing",
    short: "For your kind of everyday.",
    alt: "A woman choosing embroidered fabric in an Indian shop",
  },
  {
    id: "real-estate",
    name: "Real Estate",
    short: "For your next chapter.",
    alt: "A house with a balcony in Kerala",
  },
];

const shoppingSteps = [
  [
    "Find your favourites",
    "Choose Crackers or Clothing and explore the catalogue by category.",
  ],
  [
    "Place your order",
    "Add your choices to the cart and confirm your delivery address.",
  ],
  [
    "Pay on delivery",
    "Payment is collected offline. There is no online payment gateway.",
  ],
];
const propertySteps = [
  [
    "Explore properties",
    "Browse land, houses and apartments approved by the Prebooking team.",
  ],
  [
    "Request a site visit",
    "Choose a property and share your preferred time for a visit.",
  ],
  [
    "Meet your next chapter",
    "The team coordinates the visit. Seller contact details stay private.",
  ],
];

export default function LandingPage() {
  const hero = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const [journey, setJourney] = useState<"shopping" | "property">("shopping");

  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap.from("[data-hero-copy]", {
          y: 20,
          opacity: 0,
          duration: 0.7,
          stagger: 0.1,
          ease: "power2.out",
          clearProps: "all",
        });
      }, hero);
      return () => context.revert();
    });
    return () => media.revert();
  }, []);

  const steps = journey === "shopping" ? shoppingSteps : propertySteps;

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="utility-bar">
        <div className="container utility-inner">
          <span>Good things, closer to home.</span>
          <span className="location">
            <MapPin size={13} aria-hidden="true" /> Tirunelveli, Tamil Nadu
          </span>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <a className="wordmark" href="#" aria-label="Prebooking home">
            prebooking<span className="wordmark-dot">.</span>
          </a>
          <nav className="desktop-nav" aria-label="Main navigation">
            <a href="#explore">Our sections</a>
            <a href="#about">About Prebooking</a>
            <a href="#how-it-works">How it works</a>
            <a href="#questions">FAQs</a>
          </nav>
          <Button asChild className="header-cta">
            <a href="#explore">
              Explore Prebooking <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="mobile-menu"
                aria-label="Open navigation"
              >
                <Menu size={23} aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent className="navigation-sheet">
              <SheetHeader>
                <SheetTitle className="wordmark">prebooking.</SheetTitle>
                <SheetDescription>
                  Crackers, clothing and real estate. One place to begin.
                </SheetDescription>
              </SheetHeader>
              <nav className="mobile-nav" aria-label="Mobile navigation">
                {[
                  ["Our sections", "#explore"],
                  ["About Prebooking", "#about"],
                  ["How it works", "#how-it-works"],
                  ["FAQs", "#questions"],
                  ...sections.map((s) => [s.name, `#${s.id}`]),
                ].map(([label, href]) => (
                  <SheetClose key={href} asChild>
                    <a href={href}>
                      {label}
                      <ArrowUpRight size={18} aria-hidden="true" />
                    </a>
                  </SheetClose>
                ))}
              </nav>
              <p className="mobile-location">
                <MapPin size={16} aria-hidden="true" /> Tirunelveli, Tamil Nadu
              </p>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main id="main">
        <section className="hero" ref={hero} aria-labelledby="hero-title">
          <picture className="hero-media">
            <source
              media="(max-width: 639px)"
              srcSet="/images/hero-mobile.webp"
            />
            <img
              src="/images/hero.webp"
              alt="Friends sharing a celebration with sparklers"
              width="1920"
              height="1280"
              fetchPriority="high"
            />
          </picture>
          <div className="hero-shade" />
          <div className="container hero-inner">
            <h1 id="hero-title" data-hero-copy>
              Good things start
              <br />
              with a little
              <br />
              <span>planning.</span>
            </h1>
            <p data-hero-copy>
              Your celebrations. Your everyday. Your next address.
              <br className="desktop-break" /> Discover crackers, clothing and
              real estate, together on Prebooking.
            </p>
            <div className="hero-actions" data-hero-copy>
              <Button asChild size="lg" className="hero-primary">
                <a href="#explore">
                  Find your next good thing{" "}
                  <ArrowUpRight size={19} aria-hidden="true" />
                </a>
              </Button>
              <a className="hero-secondary" href="#how-it-works">
                How it works <ArrowRight size={17} aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="container hero-bottom">
            <span>One place. More possibilities.</span>
            <a href="#explore" aria-label="Scroll to our sections">
              <ArrowDown size={22} aria-hidden="true" />
            </a>
          </div>
        </section>

        <section
          id="explore"
          className="section-switchboard"
          aria-labelledby="explore-title"
        >
          <div className="container">
            <div className="switchboard-heading">
              <h2 id="explore-title">What are you planning?</h2>
              <p>Our catalogues are on their way. Discover each section below.</p>
            </div>
            <div className="section-links">
              {sections.map((section) => (
                <motion.a
                  key={section.id}
                  href={`#${section.id}`}
                  className="section-link"
                  whileHover={reduceMotion ? undefined : { y: -2 }}
                  whileTap={reduceMotion ? undefined : { y: 1 }}
                >
                  <div>
                    <h3>{section.name}</h3>
                    <p>{section.short}</p>
                  </div>
                  <ArrowUpRight aria-hidden="true" size={27} />
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        <section
          id="about"
          className="about-section section-space"
          aria-labelledby="about-title"
        >
          <div className="container about-layout">
            <h2 id="about-title">
              Life has more than
              <br />
              one kind of plan.
              <br />
              <span>So do we.</span>
            </h2>
            <div className="about-copy">
              <p>
                A celebration to make special. An outfit that feels like you. A
                place to call your own.
              </p>
              <p>
                Prebooking brings Crackers, Clothing and Real Estate into one
                website, with a shared customer account. A simpler starting
                point for the things you’re looking forward to.
              </p>
              <a className="text-link" href="#crackers">
                Discover the possibilities{" "}
                <ArrowRight size={18} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <section
          className="business-sections"
          aria-label="Discover our business sections"
        >
          <article id="crackers" className="business-row">
            <div className="business-image">
              <img
                src="/images/crackers.webp"
                alt={sections[0].alt}
                width="1000"
                height="1100"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="business-copy">
              <a className="section-name" href="#explore">
                Crackers <ArrowUpRight size={17} aria-hidden="true" />
              </a>
              <h2>
                A little spark.
                <br />A lot of together.
              </h2>
              <p>
                Make room for the moments that light up your year. Explore
                sparklers, flower pots, rockets and gift boxes for your next
                celebration.
              </p>
              <ul className="feature-list">
                <li>
                  <Check size={17} aria-hidden="true" /> Festival packs and
                  curated bundles
                </li>
                <li>
                  <Check size={17} aria-hidden="true" /> Product safety
                  information
                </li>
                <li>
                  <Check size={17} aria-hidden="true" /> Offline payment on
                  delivery
                </li>
              </ul>
              <Button asChild variant="outline" size="lg">
                <a href="#how-it-works" onClick={() => setJourney("shopping")}>
                  See how ordering works{" "}
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
              </Button>
            </div>
          </article>
          <article id="clothing" className="business-row reverse">
            <div className="business-image">
              <img
                src="/images/clothing.webp"
                alt={sections[1].alt}
                width="1000"
                height="1100"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="business-copy">
              <a className="section-name" href="#explore">
                Clothing <ArrowUpRight size={17} aria-hidden="true" />
              </a>
              <h2>
                Wear a little
                <br />
                more you.
              </h2>
              <p>
                For ordinary days and extraordinary occasions. Explore clothing
                for men, women and kids, with the details that help you choose.
              </p>
              <ul className="feature-list">
                <li>
                  <Check size={17} aria-hidden="true" /> Sizes, colours and
                  variants
                </li>
                <li>
                  <Check size={17} aria-hidden="true" /> A size chart to guide
                  your choice
                </li>
                <li>
                  <Check size={17} aria-hidden="true" /> One account for your
                  orders
                </li>
              </ul>
              <Button asChild variant="outline" size="lg">
                <a href="#how-it-works" onClick={() => setJourney("shopping")}>
                  See how ordering works{" "}
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
              </Button>
            </div>
          </article>
          <article id="real-estate" className="business-row">
            <div className="business-image">
              <img
                src="/images/property.webp"
                alt={sections[2].alt}
                width="1000"
                height="1100"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="business-copy">
              <a className="section-name" href="#explore">
                Real Estate <ArrowUpRight size={17} aria-hidden="true" />
              </a>
              <h2>
                Your next chapter
                <br />
                needs a place.
              </h2>
              <p>
                Whether it’s land for a future plan or a home for right now,
                explore property listings and request a visit through
                Prebooking.
              </p>
              <ul className="feature-list">
                <li>
                  <Check size={17} aria-hidden="true" /> Listings reviewed
                  before publication
                </li>
                <li>
                  <Check size={17} aria-hidden="true" /> Coordinated site visits
                </li>
                <li>
                  <Check size={17} aria-hidden="true" /> Seller contact details
                  kept private
                </li>
              </ul>
              <Button asChild variant="outline" size="lg">
                <a href="#how-it-works" onClick={() => setJourney("property")}>
                  See how site visits work{" "}
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
              </Button>
            </div>
          </article>
        </section>

        <section
          id="how-it-works"
          className="how-section section-space"
          aria-labelledby="how-title"
        >
          <div className="container">
            <div className="section-heading">
              <div>
                <h2 id="how-title">
                  A simpler way
                  <br />
                  to get started.
                </h2>
                <p>A few clear steps, from finding to planning.</p>
              </div>
              <div
                className="journey-selector"
                role="group"
                aria-label="Choose how Prebooking works"
              >
                <button
                  type="button"
                  aria-pressed={journey === "shopping"}
                  onClick={() => setJourney("shopping")}
                >
                  Shop products
                </button>
                <button
                  type="button"
                  aria-pressed={journey === "property"}
                  onClick={() => setJourney("property")}
                >
                  Find property
                </button>
              </div>
            </div>
            <motion.div
              className="steps"
              key={journey}
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18 }}
              aria-live="polite"
              aria-atomic="true"
            >
              {steps.map(([title, description], index) => (
                <div className="step" key={title}>
                  <div className="step-number">
                    0{index + 1}
                    <ArrowRight size={24} aria-hidden="true" />
                  </div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              ))}
            </motion.div>
            <p className="launch-note">
              We’re bringing these sections to life. Ordering and site-visit
              requests will be available when the catalogues launch.
            </p>
          </div>
        </section>

        <section className="future-section" aria-labelledby="future-title">
          <div className="container future-layout">
            <div>
              <h2 id="future-title">
                More of life.
                <br />
                Coming together.
              </h2>
              <p>A little look at what’s on the horizon.</p>
            </div>
            <div className="future-list">
              {["Hotels", "Restaurants", "Gym & Fitness"].map((name) => (
                <div className="future-item" key={name} aria-disabled="true">
                  <h3>{name}</h3>
                  <span>Coming soon</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="questions"
          className="faq-section section-space"
          aria-labelledby="faq-title"
        >
          <div className="container faq-layout">
            <div>
              <h2 id="faq-title">
                A few things
                <br />
                you might ask.
              </h2>
              <p>Good plans start with clear answers.</p>
            </div>
            <div className="faq-list">
              <details className="faq-item" name="prebooking-faq">
                <summary>What is Prebooking?<Plus size={20} aria-hidden="true" /></summary>
                <p className="faq-content">
                  Prebooking is a website for Crackers, Clothing and Real
                  Estate, based in Tirunelveli, Tamil Nadu. The platform brings
                  shopping and property enquiries together with one customer
                  account.
                </p>
              </details>
              <details className="faq-item" name="prebooking-faq">
                <summary>Do I need to pay online?<Plus size={20} aria-hidden="true" /></summary>
                <p className="faq-content">
                  No. Crackers and clothing orders use Cash on Delivery or
                  offline payment. Prebooking does not process online payments.
                </p>
              </details>
              <details className="faq-item" name="prebooking-faq">
                <summary>
                  How will property visits work?
                <Plus size={20} aria-hidden="true" /></summary>
                <p className="faq-content">
                  Once property listings launch, you can request a site visit
                  with a preferred time. The Prebooking team will coordinate the
                  visit. Seller phone numbers are never displayed to buyers.
                </p>
              </details>
              <details className="faq-item" name="prebooking-faq">
                <summary>Can I place an order yet?<Plus size={20} aria-hidden="true" /></summary>
                <p className="faq-content">
                  The catalogues are being prepared. This page introduces the
                  three sections; checkout and property visit requests are not
                  available yet.
                </p>
              </details>
              <details className="faq-item" name="prebooking-faq">
                <summary>
                  Are hotels and restaurants available?
                <Plus size={20} aria-hidden="true" /></summary>
                <p className="faq-content">
                  Hotels, Restaurants and Gym & Fitness are coming soon. They
                  are not available for browsing or booking yet.
                </p>
              </details>
            </div>
          </div>
        </section>

        <section className="closing-section" aria-labelledby="closing-title">
          <div className="container closing-inner">
            <div>
              <h2 id="closing-title">
                What’s your
                <br />
                next good thing?
              </h2>
              <p>Whatever you’re looking forward to, start here.</p>
            </div>
            <Button asChild size="lg" className="closing-button">
              <a href="#explore">
                Explore Prebooking <ArrowUpRight size={20} aria-hidden="true" />
              </a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <a href="#" className="wordmark" aria-label="Prebooking home">
                prebooking.
              </a>
              <p>
                For your celebrations, your everyday
                <br />
                and your next chapter.
              </p>
              <span className="location">
                <MapPin size={14} aria-hidden="true" /> Tirunelveli, Tamil Nadu
              </span>
            </div>
            <nav aria-label="Sections">
              <h2>Explore</h2>
              {sections.map((s) => (
                <a href={`#${s.id}`} key={s.id}>
                  {s.name}
                  <ChevronRight size={13} aria-hidden="true" />
                </a>
              ))}
            </nav>
            <nav aria-label="About and help">
              <h2>Prebooking</h2>
              <a href="#about">About us</a>
              <a href="#how-it-works">How it works</a>
              <a href="#questions">FAQs</a>
            </nav>
            <div className="footer-soon">
              <h2>On the horizon</h2>
              <span>
                Hotels <small>Coming soon</small>
              </span>
              <span>
                Restaurants <small>Coming soon</small>
              </span>
              <span>
                Gym & Fitness <small>Coming soon</small>
              </span>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} Prebooking. All rights reserved.
            </span>
            <a
              href="https://zenyne.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Made with care by Zenyne Labs{" "}
              <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
