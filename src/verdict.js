export function parseCheckVerdict(text) {
  const plain = text.replace(/\*/g, "");
  if (/\bverdict\s*:\s*refute\b/i.test(plain)) return "REFUTE";
  if (/\bverdict\s*:\s*confirm\b/i.test(plain)) return "CONFIRM";
  return null;
}
