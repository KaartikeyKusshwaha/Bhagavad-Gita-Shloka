# 014: Signed-in reading and maroon appearance

The owner's latest instruction requires Explore, Read and Study to open only for
registered, signed-in users. This supersedes the previous guest welcome card and
Continue as guest option. The three main destinations and their direct links are
checked by the website server against the persistent session. Unauthenticated
requests redirect to `/account/required`, which opens an accessible native dialog
with Sign up and Sign in actions. The reader page is not served behind the dialog.
Reader API requests also require a session in website mode and use no-store headers.
Public account, source attribution, privacy/about and operational health routes
remain accessible. Standalone API test instances do not enable website access policy.

The palette now defaults to deep maroon backgrounds, burgundy surfaces, rose accents
and warm white text. Activity cells use red shades. The appearance setting retains
a light rose alternative. Existing text-size/font choices survive the one-time
appearance migration. Bookmark marker colours remain meaningful reader choices.

Previously downloaded public editions are local copies, not DRM-controlled material;
website authentication cannot revoke an existing offline copy. New online downloads
require sign-in. No paid identity service or extra destination is introduced.
