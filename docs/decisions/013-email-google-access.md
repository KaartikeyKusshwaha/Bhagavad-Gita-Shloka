# 013: Email-first access and optional Google identity

The owner requested independent Sign in / Sign up controls, email login (Gmail and
other providers) and automatic signup routing for a new email. Username accounts
remain compatible and retain their saved dashboards.

## Email and interface

`/account/signin`, `/account/signup` and `/account/recover` are real routes with
visible navigation links. The header exposes both Sign in and Sign up. The signin
form checks an email/username before requesting the website password; an unknown
identifier opens signup without creating an account implicitly. A wrong password
never creates an account. Email matching is case-insensitive and unique. Emails are
login identifiers until separately verified; password signup does not claim mailbox
ownership, send email or collect the user's email-provider password. Recovery codes
continue to support password recovery. No SMTP subscription was added.

## Google integration

Google sign-in is enabled only when GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and
AUTH_PUBLIC_ORIGIN are configured. Until then, the interface explains that email
login works and Google setup is pending; it does not expose a dead provider button.

The server uses Google's authorization-code flow with PKCE (S256), random nonce,
state bound to an HttpOnly browser cookie and a ten-minute, single-use database
record. `jose` verifies RS256 signatures through Google's published JWKS, issuer,
audience, expiry, issue time, nonce and verified email before resolving an identity.
Only `openid email profile` scopes are requested. Tokens are not retained or used
for Gmail, contacts, Drive or user-reading data.

Google's stable subject, not an email-only match, selects existing Google accounts.
A matching password account is never silently linked. The user must first sign in
with the website password and explicitly choose Link Google; the verified Google
email must match. Google-only account deletion requires a fresh Google flow bound
to the current session and the same Google subject. Password accounts retain
password-confirmed deletion.

## Setup

In Google Cloud, accept the first-time terms as the owner, select/create a suitable
free project, configure an external OAuth consent screen and a Web application
client. Do not enable billing or a paid trial. Authorize the exact public callback:

`https://scripture.129-225-126-21.sslip.io/v1/account/google/callback`

Keep the client secret outside Git and chat, in `/etc/open-scripture/environment`
with the existing root-only operational workflow. Set AUTH_PUBLIC_ORIGIN to
`https://scripture.129-225-126-21.sslip.io`. Google app audience/publishing restrictions
must permit the intended users. Basic profile/email sign-in requires no scripture
API or email-delivery service. Actual Google login still requires owner testing
once the OAuth client has been configured; cryptographic/protocol tests are not a
claim that an unconfigured provider works.
