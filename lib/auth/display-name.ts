export type AccountDisplaySource = {
  fullName?: string | null;
  username?: string | null;
  email?: string | null;
  fallback?: string;
};

export function getAccountDisplayName({ fullName, username, email, fallback = "tu cuenta" }: AccountDisplaySource) {
  const trimmedName = fullName?.trim();
  if (trimmedName) {
    return trimmedName.split(/\s+/).slice(0, 2).join(" ");
  }

  const trimmedUsername = username?.trim();
  if (trimmedUsername) {
    return trimmedUsername;
  }

  const trimmedEmail = email?.trim();
  if (trimmedEmail) {
    return trimmedEmail.split("@")[0] || trimmedEmail;
  }

  return fallback;
}
