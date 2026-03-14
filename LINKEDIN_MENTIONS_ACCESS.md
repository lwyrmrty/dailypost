# LinkedIn Access Request For Personal `@mentions`

This note captures how to ask LinkedIn for the access needed to support inline `@mentions` for personal LinkedIn posts in DailyPost.

## Current app state

- The app currently authenticates with `openid profile email w_member_social` in `auth.ts`.
- Publishing already supports LinkedIn "little text" mention syntax in `lib/linkedin/client.ts`, so the missing piece is discovery of valid people to mention.
- The desired UX is an inline `@` dropdown in the dashboard editor that searches only the logged-in member's own first-degree connections.
- Advertising API has already been approved for this app.

## What LinkedIn docs say

- `w_member_social` is self-serve and already covers publishing posts and comments.
- The Connections API is restricted and requires `r_1st_connections`.
- `r_1st_connections_size` is not enough. It only gives the count of first-degree connections, not the actual connection list or person URNs needed for tagging.
- The Connections API is limited to the authenticated member's own first-degree connections and does not allow browsing second-degree connections.
- LinkedIn's documented People Typeahead API is primarily for organization follower mentions, not personal member connection search.
- Most non-open permissions require approval through the Developer Portal, Developer Support Portal, or a partner program application.

## Where to ask

Start with these channels, in this order:

1. LinkedIn Developer Portal
   - Advertising API is already approved, so the portal step is mostly to verify whether any newly visible permission or tier request became available after approval.
   - Do not stop at the Products tab if you only see `r_1st_connections_size`; that is not the permission needed for tagging.
2. LinkedIn Developer Support Portal
   - Use this when `r_1st_connections` or the Connections API is not visible as a self-serve product.
   - Ask whether your use case can be approved and which program, tier, or product path is required now that Advertising API approval is already in place.
3. LinkedIn partner / private API application
   - If support confirms the API is partner-gated, apply through the relevant LinkedIn partner program instead of waiting for a product toggle to appear.

## Exact request to make

Ask LinkedIn for:

- Access to the Connections API
- `r_1st_connections` permission
- Confirmation that Advertising API approval does not already cover this access, or instructions to enable it if it does
- Confirmation that this permission can be used to power personal-post mention search for the authenticated member's own first-degree connections

Make the scope of the request very narrow:

- Only the authenticated member's own network
- Only first-degree connections
- No global LinkedIn people search
- No second-degree access
- No scraping
- No bulk export of LinkedIn member data

## Ready-to-send support copy

Subject:

```text
Request for Connections API / r_1st_connections access for personal post @mentions
```

Body:

```text
Hi LinkedIn Developer Support,

We are building a member-authenticated writing tool that helps a signed-in LinkedIn member draft and publish personal posts through the LinkedIn API.

Our current integration already uses w_member_social for publishing, and our app has already been approved for the Advertising API. We would like to add an inline @mention picker in the post composer, but only for the authenticated member's own first-degree connections.

Our intended use case is narrow:
- search only the signed-in member's own 1st-degree connections
- let the member select a connection while composing a post
- publish the post using LinkedIn's supported mention syntax
- no global people search
- no 2nd-degree connection access
- no scraping
- no bulk export or resale of member data

Can you confirm:
1. whether this use case can be approved,
2. whether we need r_1st_connections / Connections API access,
3. whether our existing Advertising API approval should already entitle us to request or enable this access,
4. whether there is a supported path for resolving mentionable person URNs for personal member posts,
5. and whether this access is requested through our app's Products tab, Developer Support, or a partner program application?

If there is a preferred application path or additional review material you need, we can provide it.

Thank you.
```

## Fallback question to ask if they redirect you

If support responds with a generic product link, follow up with:

```text
We are specifically asking about member-authenticated personal-post mentions using only the viewer's own first-degree connections, not organization follower mentions, and not r_1st_connections_size. Can you confirm the exact approved API and permission path for r_1st_connections / Connections API access for that use case?
```

## Decision tree after LinkedIn responds

## Recommended default while waiting

Assume the fallback path until LinkedIn explicitly approves restricted first-degree connection access for this app. That avoids promising true LinkedIn-native personal mentions before the required API access exists.

### If approved

Build the native path:

1. Request and store the new permission in OAuth.
2. Sync the member's first-degree connections from the Connections API.
3. Cache mention candidates in the app with LinkedIn URNs and display names.
4. Add a Tiptap mention extension to the dashboard editor for inline `@` search.
5. Serialize selected mentions into LinkedIn little-text syntax before publish.

### If denied or unsupported

Do not promise LinkedIn-native personal mentions.

Use a fallback path instead:

1. Keep the editor `@` UX if desired.
2. Back it with an app-managed directory of known people rather than LinkedIn live data.
3. Treat those inserts as plain text unless you have a verified LinkedIn URN for the entity.
4. Position the feature as drafting assistance, not guaranteed LinkedIn-native tagging.

## Relevant references

- `auth.ts`
- `lib/linkedin/client.ts`
- [Getting Access to LinkedIn APIs](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access)
- [Connections API](https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/connections-api)
- [Increasing Access](https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access?view=li-lms-2026-02)
- [LinkedIn Partner Program Apply](https://developer.linkedin.com/content/developer/global/en_us/index/partner-programs/apply)
