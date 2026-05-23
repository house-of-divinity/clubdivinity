"use client";

// Twelve-clause Terms & Conditions modal. Same copy as the
// prototype, scrubbed to "Divine Entertainment" / "House of Divinity".
// Once we deploy, we'll also expose this at /terms as a real route
// so it's crawlable + linkable from emails.

import { useEffect } from "react";

type Clause = { title: string; body: React.ReactNode };

const CLAUSES: Clause[] = [
  {
    title: "Representation of Good Faith.",
    body:
      "We represent that we approach Divine Entertainment and its affiliated groups, members and attendees (“the beneficiaries”) in a sincere desire to learn about and possibly participate in the lifestyle it supports, intending no harm, interference or disruption to the organization or to the lives of any who adhere to its precepts. In consideration of being permitted to attend an event sponsored by Divine Entertainment, we agree as follows.",
  },
  {
    title: "Protection of Privacy.",
    body: (
      <>
        <p>
          We recognize that the philosophy of Divine Entertainment, while legal, is controversial,
          and that activities conducted in pursuance of it are also, and we represent that we are
          not offended by nudity or sexual interaction in our presence in private settings and we
          will respect the privacy of the beneficiaries, including but not limited to the following:
        </p>
        <p>
          (a) we will not divulge the identity or contact information of anyone as a member of
          Divine Entertainment to anyone else without their permission; (b) we will not discuss
          or disclose any of our experiences in Divine Entertainment with anyone outside Divine
          Entertainment, without the permission of Divine Entertainment, except that we may
          discuss our experiences in a way which does not permit the beneficiaries to be
          identified; (c) we will not disclose the location of any place where we have attended
          any activities of Divine Entertainment without the consent of Divine Entertainment;
          (d) we will not use cameras, tape recorders, cell phones, any recording device, or take
          photographs at any event sponsored by Divine Entertainment without the express written
          permission of Divine Entertainment.
        </p>
        <p>
          We understand that in addition to the consequences described below, if we violate any
          terms of this agreement, our membership in Divine Entertainment shall be immediately
          terminated and we shall be excluded from attendance at Divine Entertainment events.
        </p>
      </>
    ),
  },
  {
    title: "Provision as to Police Officers and Other Agents.",
    body: (
      <>
        <p>
          Divine Entertainment understands that police have a duty to enforce laws and investigate
          suspected violations of them, but that the U.S. Constitution limits officers&apos; rights
          to do certain things without consent. We warrant that, if we are police officers or
          government agents of any kind, we are present at any Divine Entertainment event only in
          our private, individual capacities. We warrant that, if the preceding statement should
          prove to be false, we are investigating any of the beneficiaries without disclosing our
          official capacity or purpose, and that our presence at any Divine Entertainment event,
          or those of its affiliates or members, is an entry into private premises without
          consent, in violation of the 4th Amendment to the U.S. Constitution; we further warrant
          that we are here at the direction of our employers and are acting within the scope of
          our employment.
        </p>
        <p>
          <strong>Damages:</strong> (a) We stipulate that an appropriate amount of liquidated
          damages for the illegal taking of evidence which results in legal process, civil or
          criminal, against any of the beneficiaries is five dollars times the number of
          residents in the county in which the violation occurred, which reflects a reasonable
          estimate of probable compensatory damages for loss of privacy, including humiliation,
          emotional distress, necessity to pay legal fees, loss of employment or advancement, and
          other injuries, the amount of which is uncertain. This amount shall be awarded to each
          beneficiary against whom civil or criminal process is brought, including execution of a
          search warrant. (b) If no process is executed but evidence is gathered, we stipulate
          that the amount of liquidated damages shall be two and one half dollars times the
          number of county residents, awardable to each beneficiary named or described by the
          evidence; we acknowledge that Divine Entertainment and all beneficiaries are affected
          to some degree by a violation of this subparagraph, consisting of a loss of privacy and
          a fear that unwarranted charges will someday be brought. A final award under this
          subparagraph shall not prevent a subsequent proceeding if charges are thereafter filed
          against a beneficiary, but the first award shall be an offset against the later award.
        </p>
      </>
    ),
  },
  {
    title: "Provision as to Members of the Press.",
    body:
      "We represent that, if we are members of the press (including television), we are present at any Divine Entertainment event only in our private, individual capacities. We warrant that, if the foregoing statement proves to be false, we are here at the direction of our employers and are acting within the scope of our employment; that we are violating the rights of the beneficiaries to privacy, under common law and the Nevada Constitution; and that an appropriate amount of liquidated damages for any published report made which portrays or describes the activities of any beneficiary is ten dollars times the number of readers or viewers of any medium which publishes the report, which reflects a reasonable estimate of probable compensatory damages for loss of privacy, including humiliation, emotional distress, necessity to pay legal fees, loss of employment or advancement, and other injuries, the amount of which is uncertain. This amount shall be awarded to each beneficiary named in the report or described in such a way as to permit identification of the beneficiary by application of the description to publicly available information.",
  },
  {
    title: "Indemnity (applies to all).",
    body:
      "We agree to indemnify and hold harmless the beneficiaries and Divine Entertainment for any harm resulting from our violation of this agreement. If we knowingly give information to a journalist or law enforcement officer, we are liable (a) under the terms of paragraphs 3 or 4, and the beneficiaries may elect liquidated damages under either of those paragraphs which applies, or (b) the indemnification provision of this paragraph, in order to establish the amount of awardable damages. The measure of damages for purposes of indemnification shall be the same as in an action sounding in tort for invasion of privacy, plus any lost wages resulting from loss of employment due to a violation of this agreement. The beneficiaries are entitled to reasonable attorney’s fees, both for the enforcement of this agreement and for the prosecution or defense by the beneficiaries of any other legal action initiated as a consequence of our breaching this agreement. The pursuit of any other remedy, including tort, is permitted in addition to the above provisions.",
  },
  {
    title: "Notice of Compelled or Requested Testimony.",
    body: (
      <>
        We agree to notify Divine Entertainment immediately upon receiving information that
        either of us will be required or requested to give evidence to any public official or
        court in any matter relating to Divine Entertainment. We agree to assert all available
        privileges, including this agreement, and not to give such evidence unless compelled by
        a court. (Remember, you can politely say <em>no</em> to a police officer requesting a
        statement. It is your right.)
      </>
    ),
  },
  {
    title: "Arbitration.",
    body:
      "In the event of a dispute under this agreement, binding arbitration shall enforce it. The arbitration shall take place in Nevada, under Nevada law, and under the International Rules of the American Arbitration Association, unless the parties agree on different rules.",
  },
  {
    title: "Rights Among Beneficiaries.",
    body:
      "Divine Entertainment is an indispensable party to any proceeding to redress a violation of this agreement. Because the interests of Divine Entertainment are invariably involved in any such violation, and because Divine Entertainment assists in the bringing of such proceedings, Divine Entertainment shall be entitled to 25% of the monetary award of any other beneficiary in any such proceeding.",
  },
  {
    title: "Duration and Limitations.",
    body:
      "This agreement shall continue in force and apply to all attended events and communications between beneficiaries. The period of limitations for any violation of this agreement, including representations and warranties, shall not commence as to a beneficiary until that beneficiary receives actual knowledge of the violation, and shall not be less than three years wherever an action under this agreement is brought.",
  },
  {
    title: "Exclusion & Release of Liability — Assumption of Risk.",
    body:
      "As a condition of your use of facilities at Divine Entertainment events including, but not limited to, hot tubs, pools, devices, fixtures, buildings or appurtenances, the undersigned assumes all risk of personal injury, death, disease or property loss resulting from any cause whatsoever including, but not limited to, contact with natural or man-made objects, patrons, guests, invitees, licensees, employees, agents or its owners due to intentional acts, negligence or breach of contract on the part of Divine Entertainment, its owners, employees, invitees, agents, licensees and the owner of the facilities.",
  },
  {
    title: "Waiver of Claims.",
    body:
      "We agree that Divine Entertainment, and its owners, employees, invitees, agents, licensees and the owner of the facilities, shall not be liable for any such personal injury, death, disease or property loss due to intentional acts, negligence or breach of contract and releases Divine Entertainment, and its owners, employees, invitees, agents, licensees and the owner of the facilities and waives any and all claims.",
  },
  {
    title: "Release of Liability.",
    body:
      "Divine Entertainment and its owners, employees, invitees, agents, licensees and the owner of the facilities are excluded by and released from all liability by the attendee.",
  },
];

export default function TermsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="terms-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-title"
      onClick={onClose}
    >
      <div className="terms-modal" onClick={(e) => e.stopPropagation()}>
        <button className="terms-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="terms-mark">Divinity</div>
        <h1 id="terms-title" className="terms-title">
          Terms &amp; <em>Conditions</em>
        </h1>
        <p className="terms-lede">
          By applying for membership, being a member, and/or attending an event you (if a couple,
          both of you) represent and warrant the following:
        </p>

        <ol className="terms-list">
          {CLAUSES.map((c) => (
            <li key={c.title}>
              <h3>{c.title}</h3>
              {typeof c.body === "string" ? <p>{c.body}</p> : c.body}
            </li>
          ))}
        </ol>

        <div className="terms-foot">
          — Divine Entertainment · House of Divinity · Las Vegas
        </div>

        <button className="btn-gold terms-cta" onClick={onClose}>
          Close <span className="arr">→</span>
        </button>
      </div>
    </div>
  );
}
