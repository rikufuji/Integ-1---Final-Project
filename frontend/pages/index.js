import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import styles from "../styles/landing.module.css";

function useCounter(target, duration, start) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || !target) return;
    let t0 = null;
    let raf;
    const tick = (ts) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target]);
  return count;
}

export default function Landing() {
  const [form, setForm]       = useState({ name: "", email: "", phone: "", message: "" });
  const [sent, setSent]       = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroScrolled, setHeroScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [roomStats, setRoomStats] = useState({ total: 20, available: 5, minRent: 1200 });

  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000") + "/api/rooms/stats")
      .then((r) => r.json())
      .then((data) => setRoomStats(data))
      .catch(() => {});
  }, []);

  // visibility states
  const [heroVis,    setHeroVis]    = useState(false);
  const [aboutVis,   setAboutVis]   = useState(false);
  const [statsVis,   setStatsVis]   = useState(false);
  const [contactVis, setContactVis] = useState(false);

  // refs
  const heroRef    = useRef(null);
  const aboutRef   = useRef(null);
  const statsRef   = useRef(null);
  const contactRef = useRef(null);

  // counters
  const units        = useCounter(roomStats.total,     1600, statsVis);
  const remaining    = useCounter(roomStats.available,  1200, statsVis);
  const satisfaction = useCounter(98, 2000, statsVis);

  useEffect(() => {
    const observe = (ref, setter) => {
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) { setter(true); obs.disconnect(); } },
        { threshold: 0.15 }
      );
      if (ref.current) obs.observe(ref.current);
      return obs;
    };
    const o1 = observe(heroRef,    setHeroVis);
    const o2 = observe(aboutRef,   setAboutVis);
    const o3 = observe(statsRef,   setStatsVis);
    const o4 = observe(contactRef, setContactVis);
    return () => { o1.disconnect(); o2.disconnect(); o3.disconnect(); o4.disconnect(); };
  }, []);

  useEffect(() => {
    const fn = () => {
      setScrolled(window.scrollY > 60);
      setHeroScrolled(window.scrollY > window.innerHeight * 0.4);
    };
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  function handleSend(e) {
    e.preventDefault();
    setSent(true);
    setForm({ name: "", email: "", phone: "", message: "" });
    setTimeout(() => setSent(false), 3000);
  }

  return (
    <div className={styles.page}>

      {/* NAV */}
      <nav className={scrolled ? `${styles.nav} ${styles.navScrolled}` : styles.nav}>
        <div className={styles.navBrand}>
          <img src="/logo.png" alt="BoardEase" className={styles.navLogo}
            onError={(e) => { e.target.style.display = "none"; }} />
          <span>BoardEase</span>
        </div>
        <div className={`${styles.navLinks}${menuOpen ? " " + styles.navLinksOpen : ""}`}>
          <a href="#about"   className={styles.navLink} onClick={() => setMenuOpen(false)}>About</a>
          <a href="#contact" className={styles.navLink} onClick={() => setMenuOpen(false)}>Contact</a>
          <Link href="/login" className={styles.navSignIn} onClick={() => setMenuOpen(false)}>Sign In</Link>
        </div>
        <button className={styles.navHamburger} onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu">
          {menuOpen
            ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          }
        </button>
      </nav>

      {/* HERO */}
      <section className={styles.hero} ref={heroRef}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />

        <div className={heroVis ? `${styles.heroBody} ${styles.fadeUp}` : `${styles.heroBody} ${styles.hidden}`}>

          <div className={styles.heroImgWrap}>
            <img src="/land1.png" alt="Boarding House" className={styles.heroImg} />
          </div>

          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>
              Find Your <span className={styles.heroAccent}>Ideal</span><br />
              Boarding House
            </h1>
            <p className={styles.heroSub}>
              Find safe, clean, and budget-friendly boarding houses that fit
              your everyday needs without compromising comfort
            </p>

            <div className={styles.heroFeatures}>
              <div className={styles.heroFeatureItem}>
                <span>Safe &amp; Secure Premises</span>
              </div>
              <div className={styles.heroFeatureItem}>
                <span>Clean &amp; Well-Maintained Rooms</span>
              </div>
              <div className={styles.heroFeatureItem}>
                <span>Affordable Monthly Rates</span>
              </div>
            </div>

            <div className={styles.heroBtns}>
              <a href="#contact" className={styles.heroBtn}>Send us an email!</a>
              <a href="#about"   className={styles.heroBtnGhost}>Learn More ↓</a>
            </div>

            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <span className={styles.heroStatNum}>{roomStats.total}</span>
                <span className={styles.heroStatLabel}>Total Units</span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatNum}>{roomStats.available}</span>
                <span className={styles.heroStatLabel}>Available</span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatNum}>98%</span>
                <span className={styles.heroStatLabel}>Satisfaction</span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatNum}>₱{(roomStats.minRent / 1000).toFixed(1)}K</span>
                <span className={styles.heroStatLabel}>Starting Rate</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.scrollIndicator} style={{ opacity: heroScrolled ? 0 : 1, transition: "opacity 0.4s ease" }}>
          <div className={styles.scrollMouse}><div className={styles.scrollWheel} /></div>
          <span>Scroll down</span>
        </div>
      </section>

      {/* ABOUT */}
      <section className={styles.about} id="about" ref={aboutRef}>
        <div className={aboutVis ? `${styles.aboutImgWrap} ${styles.slideRight}` : `${styles.aboutImgWrap} ${styles.hidden}`}>
          <img src="/land2.png" alt="Boarding House" className={styles.aboutImg} />
        </div>

        <div className={aboutVis ? `${styles.aboutText} ${styles.slideLeft}` : `${styles.aboutText} ${styles.hidden}`}>
          <span className={styles.eyebrow}>Why Choose Us</span>
          <h2 className={styles.aboutTitle}>
            We Help You Find a Place<br />That Feels Like Home
          </h2>
          <p className={styles.aboutSub}>
            Whether you&apos;re a student or working professional, we&apos;ll help you
            discover safe, clean, and affordable boarding houses that fit your needs
          </p>

          <div className={styles.pills}>
            <div className={styles.pill}><span>Safe &amp; Secure</span></div>
            <div className={styles.pill}><span>Clean Rooms</span></div>
            <div className={styles.pill}><span>Affordable</span></div>
            <div className={styles.pill}><span>WiFi Included</span></div>
          </div>

          <div className={styles.statsBox} ref={statsRef}>
            <div className={styles.stat}>
              <span className={styles.statNum}>{units}</span>
              <span className={styles.statLabel}>Total Units</span>
            </div>
            <div className={styles.statLine} />
            <div className={styles.stat}>
              <span className={styles.statNum}>{remaining}</span>
              <span className={styles.statLabel}>Remaining Units</span>
            </div>
            <div className={styles.statLine} />
            <div className={styles.stat}>
              <span className={styles.statNum}>{satisfaction}%</span>
              <span className={styles.statLabel}>Satisfaction Rate</span>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className={styles.contactSection} id="contact" ref={contactRef}>
        <div className={styles.orb4} />
        <div className={styles.orb5} />

        <div className={contactVis ? `${styles.contactCard} ${styles.fadeUp}` : `${styles.contactCard} ${styles.hidden}`}>

          <div className={styles.cBrand}>
            <div className={styles.cBrandRow}>
              <img src="/logo.png" alt="BoardEase" className={styles.navLogo}
                onError={(e) => { e.target.style.display = "none"; }} />
              <span className={styles.cBrandName}>BoardEase</span>
            </div>
            <p className={styles.cBrandSub}>We help you find the right boarding house</p>
            <div className={styles.cDots}>
              <span className={styles.cDot} style={{ background: "#3b82f6" }} />
              <span className={styles.cDot} style={{ background: "#22c55e" }} />
              <span className={styles.cDot} style={{ background: "#3b4fa8" }} />
            </div>
          </div>

          <div className={styles.cFormCol}>
            <h3 className={styles.cFormTitle}>Contact Information</h3>
            <form onSubmit={handleSend} className={styles.cForm}>
              <input className={styles.cInput} placeholder="Name"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input className={styles.cInput} placeholder="Email" type="email"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <input className={styles.cInput} placeholder="Phone"
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <textarea className={styles.cTextarea} placeholder="Message" rows={5}
                value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
              <div className={styles.cSendRow}>
                <button type="submit" className={sent ? `${styles.sendBtn} ${styles.sendBtnSent}` : styles.sendBtn}>
                  {sent ? "✓ Sent!" : "Send"}
                </button>
              </div>
            </form>
          </div>

          <div className={styles.cInfoCol}>
            <div className={styles.cItem}>
              <div className={styles.cIcon} style={{ background: "#3b82f6" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
              </div>
              <span>Phase 6, Martinez Subd, Mati City</span>
            </div>
            <div className={styles.cItem}>
              <div className={styles.cIcon} style={{ background: "#22c55e" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </div>
              <span>09123456789</span>
            </div>
            <div className={styles.cItem}>
              <div className={styles.cIcon} style={{ background: "#3b4fa8" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
              </div>
              <span>boardease@gmail.com</span>
            </div>
            <div className={styles.mapWrap}>
              <img src="/map.png" alt="Map" className={styles.mapImg} />
              <div className={styles.mapOverlay}>📍 Mati City, Davao Oriental</div>
            </div>
          </div>

        </div>

        <div className={styles.footerBar}>
          <span className={styles.footerCopy}>© {new Date().getFullYear()} BoardEase. All rights reserved.</span>
          <div className={styles.footerLinks}>
            <Link href="/login">Sign In</Link>
            <Link href="/register">Register</Link>
          </div>
        </div>
      </section>

    </div>
  );
}
