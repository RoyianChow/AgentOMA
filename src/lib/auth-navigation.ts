export const PORTAL_HOME = "/pharmacist";

type BrowserLocation = Pick<Location, "replace">;

/**
 * Authentication changes an httpOnly session cookie outside React. A full
 * navigation is deliberate here: it prevents Next's pre-auth client cache
 * from replaying a protected-route response that was produced before the new
 * cookie existed. The portal still performs its normal server-side session,
 * TOTP, role, and pharmacy checks on the resulting request.
 */
export function enterPortalAfterAuthentication(
  location: BrowserLocation = window.location,
): void {
  location.replace(PORTAL_HOME);
}
