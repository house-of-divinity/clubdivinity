"use client";

export default function Footer({ onOpenTerms }: { onOpenTerms: () => void }) {
  return (
    <footer className="footer" data-screen-label="Footer">
      <div className="footer-row">
        <div className="footer-mark">Divinity</div>
        <div className="footer-tag">Invitation-only · Las Vegas</div>
        <div className="footer-links">
          <a href="#performance">The Performance</a>
          <a href="#event">Upcoming</a>
        </div>
      </div>
      <div className="footer-base">
        <span>© MMXXVI · House of Divinity</span>
        <span>
          21+ · By application · Held in confidence
          <button className="footer-base-link" onClick={onOpenTerms}>
            Terms &amp; Conditions
          </button>
        </span>
      </div>
    </footer>
  );
}
