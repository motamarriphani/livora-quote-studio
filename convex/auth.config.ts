import type { AuthConfig } from 'convex/server';

// Clerk is the auth provider: Convex verifies Clerk's JWTs against the
// Frontend API URL (set via `npx convex env set CLERK_FRONTEND_API_URL`).
// applicationID 'convex' matches the audience mapped by Clerk's
// "Convex integration" (Sessions → Claims → aud).
export default {
  providers: [
    {
      domain: process.env.CLERK_FRONTEND_API_URL!,
      applicationID: 'convex',
    },
  ],
} satisfies AuthConfig;
