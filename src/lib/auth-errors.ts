/**
 * Translate raw Supabase auth error messages into user-friendly copy that
 * distinguishes between the four common cases (account not found, wrong
 * password, account already exists, email not confirmed) instead of bubbling
 * up the generic "Invalid login credentials".
 */
export function friendlyAuthMessage(
  raw: string,
  context: "login" | "signup" | "reset"
): string {
  const m = raw.toLowerCase();

  if (context === "login") {
    if (
      m.includes("invalid login credentials") ||
      m.includes("invalid grant") ||
      m.includes("invalid_credentials")
    ) {
      // Supabase intentionally returns one error for both wrong-email and
      // wrong-password to prevent enumeration. We surface the practical
      // implication for the user.
      return "Wrong email or password. If you don't have an account yet, sign up first.";
    }
    if (m.includes("email not confirmed") || m.includes("email_not_confirmed")) {
      return "You haven't confirmed your email yet — check your inbox for the confirmation link.";
    }
    if (m.includes("user not found")) {
      return "No account exists for that email. Sign up to create one.";
    }
    if (m.includes("rate limit") || m.includes("too many")) {
      return "Too many attempts. Please wait a minute and try again.";
    }
  }

  if (context === "signup") {
    if (
      m.includes("already registered") ||
      m.includes("already exists") ||
      m.includes("user already registered") ||
      m.includes("duplicate key")
    ) {
      return "An account with this email already exists. Sign in or use Forgot password.";
    }
    if (m.includes("password should be at least") || m.includes("weak_password")) {
      return "Password must be at least 4 characters.";
    }
    if (m.includes("invalid email")) {
      return "That email address looks invalid.";
    }
  }

  if (context === "reset") {
    if (m.includes("user not found") || m.includes("not found")) {
      return "No account exists for that email.";
    }
  }

  // Capitalise the raw message as a fallback so it doesn't look like a stack trace.
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
