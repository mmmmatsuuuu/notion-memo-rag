function normalize(value?: string | null) {
  return value?.trim().toLowerCase();
}

export function isAllowedEmail(email?: string | null) {
  const normalizedEmail = normalize(email);

  if (!normalizedEmail) {
    return false;
  }

  const allowed = [
    normalize(process.env.ALLOWED_EMAIL_OFFICE),
    normalize(process.env.ALLOWED_EMAIL_PRIVATE)
  ].filter((value): value is string => Boolean(value));

  if (allowed.length === 0) {
    return false;
  }

  return allowed.includes(normalizedEmail);
}
