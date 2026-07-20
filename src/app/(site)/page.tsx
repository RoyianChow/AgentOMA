import Link from "next/link";

export default function Home() {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-content">
            <div className="hero-tag">
              <span className="pulse-glow-element" style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "var(--accent)",
                display: "inline-block"
              }}></span>
              Clinical Decision Support
            </div>
            <h1 className="hero-title">
              Empowering Pharmacists & patients via <span>AgentOMA</span>
            </h1>
            <p className="hero-description">
              AgentOMA is an intelligent minor ailments triaging platform.
              It enables patients to perform structured clinical assessments,
              applies clinical safety validation, and generates AI decision suggestions
              for pharmacists to streamline minor ailment consultations.
            </p>
            <div className="hero-actions">
              <Link href="/assessment" className="btn btn-accent btn-lg">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                Patient Assessment
              </Link>
              <Link href="/pharmacist" className="btn btn-secondary btn-lg">
                Pharmacist Dashboard
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-visual-bg"></div>
            <div className="hero-card">
              <div className="hero-card-header">
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    backgroundColor: "var(--danger)",
                    display: "inline-block"
                  }}></span>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Assessment #4192</span>
                </div>
                <div className="hero-card-ai-indicator">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  AgentOMA AI
                </div>
              </div>

              <div className="hero-card-item">
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Patient</div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Sarah Jenkins, 28 F</div>
              </div>

              <div className="hero-card-item">
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Suspected Ailment</div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--primary)" }}>Allergic Rhinitis (Allergies)</div>
              </div>

              <div style={{
                padding: "1rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--accent-light)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                fontSize: "0.85rem",
                lineHeight: "1.4",
                color: "var(--text-primary)"
              }}>
                <div style={{ fontWeight: 800, color: "var(--accent-hover)", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                  AI SUGGESTED TRIAGE: SELF-CARE
                </div>
                Symptoms compatible with seasonal pollen allergies. Recommend OTC Cetirizine (10mg daily) and Fluticasone nasal spray. No red flags detected.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="features">
        <div className="container">
          <div className="section-header">
            <h2>How AgentOMA Works</h2>
            <p>
              An intelligent, triaged clinical pathway bridging the gap between
              patient self-assessment and pharmacist-led care.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <line x1="10" y1="9" x2="8" y2="9" />
                </svg>
              </div>
              <h3>1. Smart Assessment</h3>
              <p>
                Patients complete a step-by-step questionnaire detailing their age, duration of symptoms,
                and specific indicators, designed with dynamic clinical validation.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h3>2. AI Clinical Triage</h3>
              <p>
                AgentOMA&apos;s AI analyzes assessments instantly, running safety checks
                for Red Flag indicators, calculating severity, and preparing treatment pathways.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <h3>3. Pharmacist Triage</h3>
              <p>
                Pharmacists review pre-analyzed files in a modern dashboard,
                validating recommended paths, prescribing OTC medications, or referring to GPs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-box">
            <h2>Ready to streamline minor ailment consultations?</h2>
            <p>
              Experience AgentOMA as a patient to see the clinical triaging in action,
              or login to the dashboard as a pharmacist to manage pending cases.
            </p>
            <div className="hero-actions" style={{ display: "inline-flex" }}>
              <Link href="/assessment" className="btn btn-primary btn-lg">
                Start Patient Assessment
              </Link>
              <Link href="/pharmacist" className="btn btn-secondary btn-lg">
                Enter Pharmacist Portal
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
