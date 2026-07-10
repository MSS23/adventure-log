# Illegal Content Risk Assessment — Online Safety Act 2023

**Service:** Adventure Log (adventure-log-azure.vercel.app)
**Service type:** User-to-user service (Part 3, OSA 2023)
**Assessment date:** July 2026
**Next review due:** July 2027, or sooner on any significant change to functionality, user base, or risk profile
**Assessed by:** Service operator

> This is a working self-assessment prepared under Ofcom's Illegal Content
> Risk Assessment guidance for smaller services. It is not legal advice.

---

## 1. Service description

Adventure Log is a social travel-logging platform. Users create photo albums
tied to locations, which render on a personal 3D globe. Social features:
following other users, likes, comments on albums, shared trips, a wishlist,
and public discovery surfaces (explore feed, public globe pins, public
profiles where the user has chosen a public privacy level).

**Characteristics relevant to risk:**

- Small service: low user count, single-operator, no advertising, no
  recommender system optimised for engagement (feeds are follow-based and
  recency-based).
- Adults-only (18+) by Terms of Service, enforced by an age gate (see §5).
- No private messaging / DMs. No livestreaming. No ephemeral content UI.
  The primary user-generated content is travel photos, album text, and
  comments.
- Users choose a privacy level (public / friends / private); private content
  is enforced with database row-level security.

## 2. User base

Early-stage service with a small user base, primarily UK. No functionality
is targeted at or attractive primarily to children (see the separate
Children's Access Assessment).

## 3. Risk assessment by kind of illegal harm

Assessment of the priority offence categories in Schedules 5–7 OSA and the
Ofcom register of risks. Ratings reflect a small, adults-only, photo-and-
comment travel service with no DMs, no livestreaming, and no anonymity-first
design (accounts require email or Google sign-in).

| Harm category | Risk | Reasoning and relevant functionality |
|---|---|---|
| CSEA / CSAM | **Low, high-severity** | Image upload exists, so the vector exists in principle. Mitigations: 18+ gate; no DMs (no grooming channel); no child-focused features; image moderation pipeline (see §4); user reporting; account blocking. |
| Grooming | **Low** | No private messaging; interaction is limited to public/followers-only comments on travel albums. 18+ service. |
| Terrorism content | **Low** | No virality mechanics, tiny reach, content is travel-photo-centric. Reporting + takedown available. |
| Hate offences | **Low–medium** | Possible in comments/album text. Mitigations: report categories include harassment/inappropriate; text sanitisation; blocking; operator takedown. |
| Harassment, stalking, threats, abuse | **Low–medium** | Most plausible harm on a social service. Mitigations: reporting with `harassment` category, two-way auto-unfollow on block, comment deletion, account restriction by operator. Location data is a specific consideration: EXIF GPS is stripped on upload, album locations are user-declared, and privacy levels let users hide their map entirely. |
| Intimate image abuse / NCII | **Low, high-severity** | Photo upload exists. Mitigations: reporting (`inappropriate`), image moderation pipeline, rapid operator takedown, 18+ user base. |
| Extreme / illegal pornography | **Low** | Not a pornography service; ToS prohibits; image moderation + reports. |
| Drugs / weapons offences | **Low** | No marketplace or selling features; no DMs. |
| Fraud / financial services offences | **Low** | No payments between users, no marketplace, no ads. `spam`/`misinformation` report categories cover scam content in comments. |
| Foreign interference / false communications | **Low** | Minimal reach; no amplification mechanics. |
| Suicide / self-harm encouragement | **Low** | Not a plausible content pattern for the service; report + takedown available. |
| Human trafficking / illegal immigration | **Low** | No relevant functionality (no marketplace, DMs, or recruitment surfaces). |
| Proceeds of crime / other priority offences | **Low** | No relevant functionality. |

**Overall:** the service is low-risk for most kinds of illegal harm, with
image-based harms (CSAM, NCII) the highest-severity residual vectors due to
photo upload, and harassment the most plausible day-to-day harm. Mitigations
are proportionate to a small service and are listed in §4.

## 4. Safety measures in place (record of measures)

**Prevention**

- 18+ age gate at signup: DOB collected and enforced client-side and by a
  database trigger that rejects under-18 signups; OAuth accounts without a
  DOB are blocked by an in-app age gate until a DOB is confirmed.
- Upload restrictions: image files only (JPEG/PNG/WebP/GIF), 10 MB cap,
  MIME/extension/magic-byte validation, filename validation.
- Server-side image moderation hook (SafeSearch-class classifier) on the
  upload path, enabled via configuration.
- EXIF metadata (including GPS) stripped from photos at upload, reducing
  doxxing/stalking risk from shared images.
- Rate limiting on all API surfaces (distributed, Redis-backed), with
  stricter limits on auth and upload.
- Input sanitisation on all user text (comments, album text, reports).

**Detection & reporting**

- In-app reporting on users, albums, photos, and comments with categories:
  spam, harassment, inappropriate, copyright, misinformation, other.
  Reports are stored durably with `pending` status and duplicate-guarding.
- Every new report triggers an immediate operator notification (Discord
  webhook) for prompt review.
- Content reports contact route and DMCA notice-and-takedown procedure
  published on the site.

**Response**

- Operator can remove content, restrict or delete accounts (soft-delete with
  storage purge), and action reports out-of-band.
- User-level controls: block (with two-way auto-unfollow), privacy levels
  (public/friends/private) enforced by row-level security.
- CSAM protocol: if CSAM is ever identified, it will be reported to the
  Internet Watch Foundation / NCMEC and preserved for law enforcement per
  their guidance, not merely deleted.

**Governance**

- Single operator reviews reports on notification; target initial review
  within 72 hours.
- Terms of Service prohibit illegal content and reserve enforcement rights;
  complaints/appeals contactable via the published support email.
- This assessment reviewed annually and on significant change (new
  functionality such as DMs or livestreaming would trigger reassessment).

## 5. Age assurance

Self-declared date of birth, collected at signup (email/password) or on
first entry to the app (OAuth), with an 18-or-over hard block in both paths
and a server-side database backstop. This is proportionate to a small,
low-risk service; it is not "highly effective age assurance" in Ofcom's
sense, which is reflected in the Children's Access Assessment.

## 6. Conclusions

- The service is **low risk** overall for illegal content, with
  proportionate mitigations in place for the higher-severity image-based
  vectors.
- Priority follow-ups: keep the image moderation classifier enabled in
  production; maintain the report-notification channel; reassess immediately
  if DMs, livestreaming, or recommender feeds are introduced.

**Record kept:** this document (version-controlled). Material changes to the
service or this assessment are recorded in the repository history.
