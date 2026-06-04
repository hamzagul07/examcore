# Show “MarkScheme” on Google sign-in (not `*.supabase.co`)

Google shows **`mcnqxokprggjadtlloyr.supabase.co`** because OAuth redirects through Supabase’s host. That is normal until you complete **branding + (recommended) a custom auth domain**.

## What users should eventually see

- **Sign in to MarkScheme** (with your logo)
- Not “Sign in to `….supabase.co`”

---

## Step 1 — Google Cloud OAuth consent screen (required)

1. [Google Cloud Console](https://console.cloud.google.com/) → your project → **Google Auth Platform** → **Branding** (or **APIs & Services → OAuth consent screen**).
2. Set:

   | Field | Value |
   |--------|--------|
   | **App name** | `MarkScheme` |
   | **User support email** | your email |
   | **App logo** | square logo (120×120 min) |
   | **Application home page** | `https://markscheme.app` |
   | **Privacy policy** | `https://markscheme.app/privacy` |
   | **Terms of service** | `https://markscheme.app/terms` |

3. **Authorized domains** → add `markscheme.app` (verify ownership in [Google Search Console](https://search.google.com/search-console) if Google asks).

4. **Publishing status** → move to **In production** when ready (External users).

5. **Submit for verification** (Branding page → verify app).  
   Until Google approves, the consent screen may still show only the **domain** (`supabase.co`), not your app name.

---

## Step 2 — Supabase custom auth domain (strongly recommended)

This replaces `….supabase.co` on the consent screen with your own subdomain.

1. Supabase Dashboard → **Project Settings** → **Custom Domains** (or **Authentication** → custom domain, depending on UI).
2. Add something like **`auth.markscheme.app`** (Supabase docs suggest `auth.yourdomain.com`).
3. At your domain registrar, add the **CNAME** record Supabase gives you.
4. Wait until Supabase shows the domain as **Active**.

5. **Google Cloud Console** → OAuth client → **Authorized redirect URIs** — **replace** the old URI with:

   ```
   https://auth.markscheme.app/auth/v1/callback
   ```

   (Use the exact host Supabase shows after setup.)

6. Keep the old `https://mcnqxokprggjadtlloyr.supabase.co/auth/v1/callback` until the new one works, then remove it.

7. Supabase **URL configuration** is unchanged for the app:

   - `https://markscheme.app/auth/callback`
   - `http://localhost:3000/auth/callback`

Your app still uses `/auth/callback` on `markscheme.app`; only the **Google ↔ Supabase** hop uses `auth.markscheme.app`.

---

## Step 3 — Re-test

1. Incognito window → `https://markscheme.app/auth/signin`
2. **Continue with Google**
3. Consent screen should say **MarkScheme** (after verification) and/or **auth.markscheme.app** instead of the project ref.

---

## Timeline expectations

| Action | Effect |
|--------|--------|
| Consent screen fields only | May still show `supabase.co` until verified |
| Brand verification | **MarkScheme** name + logo on consent screen |
| Custom auth domain | Domain on screen matches your brand (`auth.markscheme.app`) |

Brand verification often takes **a few business days**.

---

## References

- [Supabase: Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google) (branding + custom domain)
- [Google: OAuth branding](https://support.google.com/cloud/answer/10311615)
- [Google: Brand verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification)
