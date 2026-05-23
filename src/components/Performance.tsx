// "The Performance" section — two-column with the hosts photo
// (grayscale, eases into colour on hover) and copy on the right.

import { CornerFiligree } from "./Ornaments";

export default function Performance() {
  return (
    <section className="performance" id="performance" data-screen-label="Performance">
      <div className="performance-grid">
        <div className="performance-photo">
          <CornerFiligree variant="tl" />
          <CornerFiligree variant="tr" />
          <CornerFiligree variant="bl" />
          <CornerFiligree variant="br" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/hosts-together.jpeg" alt="Madison Wilde and Bree Sky" />
          <div className="performance-photo-tag">Madison &amp; Bree · in studio</div>
        </div>

        <div className="performance-body">
          <div className="section-eyebrow">
            <span className="num">I</span>
            <span className="line" />
            <span className="lbl">The Performance</span>
          </div>
          <h2 className="display performance-title">
            One night. One <em>performance</em>. Never again.
          </h2>
          <p className="performance-body-p">
            If you&apos;ve ever seen them on a screen, this will undo what you thought
            you knew. If you haven&apos;t, you&apos;re about to understand why the room
            holds its breath when the lights drop.
          </p>
          <div className="performance-meta">
            <div className="pm-row">
              <span className="pm-k">Featuring</span>
              <span className="pm-v">Madison Wilde &amp; Bree Sky</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
