// Shared brand shell for every transactional email.
// Dark obsidian background, gold accents, italic Cormorant Garamond
// for the headline, mono-style sans for the labels. All styles
// inlined because email clients ignore <style> blocks.

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

const BG = "#0a0807";
const GOLD = "#c8a352";
const GOLD_DEEP = "#8a6f2c";
const INK = "#e8c989";
const INK_DIM = "rgba(232,201,137,.55)";

export function EmailShell({
  preview,
  headline,
  children,
}: {
  preview: string;
  headline: string; // HTML allowed for <em> gold italics
  children: ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: BG,
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: INK,
        }}
      >
        <Container
          style={{
            maxWidth: 600,
            margin: "0 auto",
            padding: "40px 32px",
            backgroundColor: BG,
          }}
        >
          {/* Header */}
          <Section style={{ textAlign: "center", marginBottom: 36 }}>
            <Text
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 24,
                letterSpacing: "0.32em",
                color: INK,
                fontWeight: 400,
                margin: 0,
              }}
            >
              <span style={{ color: GOLD }}>✦</span>{" "}
              <span style={{ textTransform: "uppercase" }}>Divinity</span>{" "}
              <span style={{ color: GOLD }}>✦</span>
            </Text>
            <Text
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 11,
                letterSpacing: "0.24em",
                color: GOLD,
                textTransform: "uppercase",
                margin: "8px 0 0",
              }}
            >
              Las Vegas
            </Text>
          </Section>

          {/* Hairline divider */}
          <Hr
            style={{
              border: 0,
              borderTop: `0.5px solid ${GOLD_DEEP}`,
              margin: "0 auto 36px",
              width: "30%",
            }}
          />

          {/* Headline — supports <em> for gold italic emphasis */}
          <Text
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: 36,
              lineHeight: 1.1,
              color: "#ffffff",
              textAlign: "center",
              margin: "0 0 36px",
            }}
            dangerouslySetInnerHTML={{
              __html: emWrap(headline),
            }}
          />

          {/* Body content */}
          <Section>{children}</Section>

          {/* Footer */}
          <Hr
            style={{
              border: 0,
              borderTop: `0.5px solid ${GOLD_DEEP}`,
              margin: "48px 0 24px",
            }}
          />
          <Text
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 10,
              letterSpacing: "0.22em",
              color: GOLD_DEEP,
              textTransform: "uppercase",
              textAlign: "center",
              margin: 0,
              lineHeight: 1.8,
            }}
          >
            — The House of Divinity
            <br />
            21+ · By application · Held in confidence
            <br />
            clubdivinity.com · curator@clubdivinity.com
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// EmailBodyText: paragraphs of body copy with consistent styling.
export function EmailBodyText({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontWeight: 300,
        fontSize: 16,
        lineHeight: 1.75,
        color: INK,
        margin: "0 0 20px",
        whiteSpace: "pre-wrap",
      }}
    >
      {children}
    </Text>
  );
}

// EmailButton: gold-on-black call-to-action.
export function EmailButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Section style={{ textAlign: "center", margin: "32px 0" }}>
      <a
        href={href}
        style={{
          display: "inline-block",
          backgroundColor: GOLD,
          color: BG,
          fontFamily: "Georgia, serif",
          fontSize: 12,
          letterSpacing: "0.20em",
          textTransform: "uppercase",
          fontWeight: 500,
          padding: "16px 32px",
          textDecoration: "none",
          border: `0.5px solid ${GOLD}`,
        }}
      >
        {children}
      </a>
    </Section>
  );
}

// EmailRef: a small gold reference chip
export function EmailRef({ value }: { value: string }) {
  return (
    <Text
      style={{
        fontFamily: "Georgia, serif",
        fontSize: 12,
        letterSpacing: "0.18em",
        color: GOLD,
        textAlign: "center",
        textTransform: "uppercase",
        padding: "12px 0",
        border: `0.5px solid ${GOLD_DEEP}`,
        margin: "32px auto 0",
        maxWidth: 240,
      }}
    >
      {value}
    </Text>
  );
}

// emWrap: turn <em>...</em> into a gold italic span. Email clients
// vary in <em> rendering so we be explicit.
function emWrap(html: string): string {
  return html.replace(
    /<em>([\s\S]*?)<\/em>/g,
    `<span style="color:${GOLD};font-style:italic">$1</span>`,
  );
}

// Re-export INK_DIM for use in body components that want a quieter color
export { INK_DIM };
