import { Redirect } from "expo-router";

/**
 * Clerk's Google OAuth redirects here (see redirectUrl in (auth)/sign-in.tsx) once the browser
 * flow completes and the session is already active — this route only needs to exist so Expo
 * Router doesn't 404 the deep link; app/index.tsx handles the actual signed-in redirect.
 */
export default function OAuthNativeCallback() {
  return <Redirect href="/" />;
}
