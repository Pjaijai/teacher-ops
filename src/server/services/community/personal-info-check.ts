export type PersonalInfoKind = "phone" | "email" | "hkid" | "school";

const GENERIC_PREFIX = /^(我們|我们|本|貴|贵|各|這|这|那|該|该|學|学|中|小|大|母|每|整個|整个|一所|某|別的|别的|自己|同|新)$/;

/**
 * Looks for phone numbers (HK 8-digit, +852), emails, HKID-like patterns and school names.
 * Returns the kinds found; publishing is blocked while any are present.
 */
export function checkPersonalInfo(text: string): { kind: PersonalInfoKind; match: string }[] {
  const found: { kind: PersonalInfoKind; match: string }[] = [];
  const add = (kind: PersonalInfoKind, re: RegExp, accept: (m: RegExpMatchArray) => boolean = () => true) => {
    for (const m of text.matchAll(re)) if (accept(m)) found.push({ kind, match: m[0] });
  };

  add("email", /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g);
  add("phone", /(?:\+?852[\s-]?)?(?<![\d.])[2-9]\d{3}[\s-]?\d{4}(?![\d.])/g);
  add("hkid", /(?<![A-Za-z])[A-Z]{1,2}\d{6}\s?\(?[0-9A]\)?/g);
  add("school", /([一-鿿]{2,}?)(學校|学校|中學|中学|書院|书院|小學|小学)/g, (m) => !GENERIC_PREFIX.test(m[1]));
  add("school", /\b(?:[A-Z][\w'.&-]*\s+){1,5}(?:School|College|Secondary School|Academy)\b/g, (m) => !/^(The|This|That|My|Our|Your|A|An)\s+(School|College)$/.test(m[0]));
  return found;
}

export function describePersonalInfo(found: { kind: PersonalInfoKind; match: string }[]): string {
  const names: Record<PersonalInfoKind, string> = { phone: "phone number", email: "email address", hkid: "HKID-like number", school: "school name" };
  return [...new Set(found.map((f) => names[f.kind]))].join(", ");
}
