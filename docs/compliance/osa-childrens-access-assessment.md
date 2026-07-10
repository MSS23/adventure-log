# Children's Access Assessment — Online Safety Act 2023

**Service:** Adventure Log (adventure-log-azure.vercel.app)
**Service type:** User-to-user service (Part 3, OSA 2023)
**Assessment date:** July 2026
**Next review due:** July 2027, or sooner on any significant change to
functionality, user demographics, or age-assurance approach

> Self-assessment following Ofcom's Children's Access Assessments guidance
> (two-stage test under s.37 OSA). Not legal advice.

---

## Stage 1 — Is it possible for children to access the service?

**Question:** Does the service use highly effective age assurance (HEAA)
such that children cannot normally access it?

**Answer: No HEAA is in place, so child access is *possible*.**

The service is adults-only (18+) by Terms of Service and enforces this with:

- a mandatory date-of-birth field at email/password signup, hard-blocking
  under-18s in the client and again in a database trigger that rejects the
  signup server-side;
- an in-app age gate for OAuth accounts (which arrive without a DOB) that
  blocks all app access until a DOB is confirmed, and signs out under-18s;
- an auditable DOB record retained on the user row.

This is **self-declared age verification**. Ofcom's guidance is clear that
self-declaration is not highly effective age assurance, because a child
could enter a false date of birth. Stage 1 therefore concludes that it is
possible for children to access the service, and the assessment proceeds to
Stage 2.

## Stage 2 — The child user condition

**Question:** Is there a significant number of child users, OR is the
service of a kind likely to attract a significant number of child users?

### 2a. Are there a significant number of child users?

**Assessment: No evidence of any child users.**

- Every account has passed an 18+ declaration (both signup paths).
- The service is early-stage with a small user base, known to skew adult
  (travel logging of trips the user has personally taken).
- No user research, support contact, report, or content signal to date has
  indicated an under-18 user.

### 2b. Is the service likely to attract a significant number of children?

**Assessment: No.**

Factors considered (per Ofcom guidance):

- **Content type:** personal travel journaling — albums of trips, an
  interactive globe of places visited. The core proposition presumes
  independent adult travel.
- **Design and features:** no gaming mechanics, no DMs, no livestreaming,
  no short-video feed, no celebrity/influencer ecosystem, no rewards
  economy. Achievement badges exist but relate to travel logging (countries
  visited), not engagement loops attractive to children.
- **Commercial profile:** no advertising to children (no advertising at
  all); no marketing directed at children; app-store style listing and all
  marketing describe an 18+ travel service.
- **Comparable services:** adult-oriented travel-logging tools, not
  child-popular social platforms.
- **Benefit to children:** the service offers no specific functionality of
  particular benefit or appeal to children relative to adults.

### Stage 2 conclusion

The child user condition is **not met**: there is no significant number of
child users and the service is not of a kind likely to attract a significant
number of child users.

## Overall conclusion

The service is **not likely to be accessed by children** within the meaning
of s.37 OSA. The children's safety duties (ss.11–13, Part 3) therefore do
not currently apply. The illegal-content duties continue to apply and are
addressed in the companion Illegal Content Risk Assessment.

## Commitments and triggers for reassessment

This conclusion depends on the current shape of the service. The assessment
will be redone before the next annual review if any of the following occur:

1. Any evidence of under-18 users (reports, support contact, content
   signals, or age-gate analytics).
2. New functionality with recognised child appeal: direct messaging,
   short-form video feeds, gamified engagement loops, or similar.
3. Marketing or distribution changes that could reach child audiences.
4. Material growth in the user base (which would justify commissioning
   actual user-demographic evidence rather than relying on inference).
5. Relevant changes to Ofcom guidance on HEAA or children's access.

**Interim safeguards retained regardless of this conclusion:** the 18+ age
gate in both signup paths, the database-level under-18 rejection, EXIF GPS
stripping on photos, image moderation on upload, and in-app reporting with
operator alerting.

**Record kept:** this document (version-controlled). Completed: July 2026.
