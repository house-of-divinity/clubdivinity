// Generate a public reference string like "DV-A3F9KX" for an
// application. 6 uppercase alphanumeric chars excluding O/0/I/1
// to avoid confusion when read out loud or copied.

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRef(): string {
  let out = "DV-";
  for (let i = 0; i < 6; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}
