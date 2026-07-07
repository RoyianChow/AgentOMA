export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-info">
            <h3>AgentOMA</h3>
            <p>
              Next-generation minor ailment assessment and clinical support framework
              designed to bridge the gap between patient symptoms and pharmacist intervention.
            </p>
          </div>
          <div>
            <div className="footer-links-title">For Patients</div>
            <ul className="footer-links-list">
              <li>
                <a href="/assessment">Start New Assessment</a>
              </li>
              <li>
                <a href="#how-it-works">How Triage Works</a>
              </li>
              <li>
                <a href="#clinical-safety">Clinical Safety Guidelines</a>
              </li>
            </ul>
          </div>
          <div>
            <div className="footer-links-title">For Providers</div>
            <ul className="footer-links-list">
              <li>
                <a href="/pharmacist">Pharmacist Portal</a>
              </li>
              <li>
                <a href="#integration">API Integration</a>
              </li>
              <li>
                <a href="#regulatory">Regulatory Compliance</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-disclaimer">
          <p>
            <strong>Medical Disclaimer:</strong> AgentOMA is a clinical decision-support and patient screening aid.
            It does not provide final diagnoses or replace professional medical advice. If you are experiencing
            severe symptoms—including chest pain, shortness of breath, severe bleeding, or sudden numbness—please
            contact emergency services immediately (999, 911, or 112).
          </p>
          <p style={{ marginTop: "1rem" }}>
            © {new Date().getFullYear()} AgentOMA. Built for Minor Ailments Triaging. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
