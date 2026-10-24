# Three destinations and private learning history

The maintainer requested a professional, seamless website with few panels, Apple
design principles, a GitHub/LeetCode-style activity grid and ChatGPT-style Explore
history. References reviewed: [Apple's HIG](https://developer.apple.com/design/human-interface-guidelines)
and [GitHub contributions](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference).
Use these interaction principles without copying branding or claiming affiliation.

## Navigation and interaction

- Explore: one composer with Search, Verify and Ask modes. One response column.
- Read: source/work selection and a focused reader; contextual tools open on demand.
- Study: activity calendar or saved passages, one selected view at a time.
- Three-item header navigation on desktop; three-item bottom navigation on phones.
- A single optional history drawer, keyboard focus containment, Escape to close and
  focus restoration. Large-text settings and reduced-motion support remain.

## History

The user explicitly requested search/text history. Store it in this browser, not
in the application database. Persist successful Explore requests and their cited
responses as conversations; support reopening, searching, renaming, deleting,
clearing and pausing. Raw claims still do not enter server verification logs.
Safety-routed requests are not persisted in history or counted as activity.
Paused requests remain only in the current in-memory conversation.

Bound history to 90 days, 100 conversations, 40 exchanges each and approximately
750k serialized characters. Old entries can be evicted earlier at the storage
limit. A storage failure must leave the response visible and report that it was
not saved. No cloud synchronization or account is implied.

## Activity

Record submitted ordinary searches/verification/questions and explicit read marks.
Do not create activity on page loads, hover, reload, or automatic previews.
Deduplicate a passage read within the same local calendar day. Keep up to 370 days
of activity and show 53 calendar weeks. Streaks include an active yesterday when
the reader has not studied today. The grid is informative, never a leaderboard.
Show real empty states and no sample/fabricated activity in user storage.

Activity has keyboard date navigation and text counts so color is not the only
signal. It can be exported/cleared. Deleting Explore conversations does not erase
the independent activity totals. Bookmarks and read IDs are stored separately.
