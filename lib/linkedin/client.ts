/**
 * LinkedIn API client for OAuth 2.0 and publishing.
 *
 * Scopes used:
 *   openid, profile, email  – read basic profile info during OAuth
 *   w_member_social         – create posts, comments, reactions, reshares
 *
 * Token lifetime: 60 days (access), 365 days (refresh).
 */

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';
const LINKEDIN_REST_BASE = 'https://api.linkedin.com/rest';

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

export function getLinkedInAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/linkedin/callback`,
    state,
    scope: 'openid profile email w_member_social',
  });
  return `${LINKEDIN_AUTH_URL}?${params}`;
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/linkedin/callback`,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LinkedIn token exchange failed: ${text}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string) || null,
    expiresIn: data.expires_in as number, // seconds
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LinkedIn token refresh failed: ${text}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string) || refreshToken,
    expiresIn: data.expires_in as number,
  };
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function getLinkedInProfile(accessToken: string) {
  const res = await fetch(`${LINKEDIN_API_BASE}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch LinkedIn profile: ${res.status}`);
  }

  const data = await res.json();
  return {
    linkedinId: data.sub as string, // "urn:li:person:xxx" or plain ID
    name: data.name as string,
    profileUrl: (data.profile as string) || null,
  };
}

// ---------------------------------------------------------------------------
// Publishing – Posts API (versioned REST API)
// ---------------------------------------------------------------------------

function restHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202502',
  };
}

/**
 * Create a new LinkedIn post (text-only).
 * Returns the post URN.
 *
 * The `commentary` field supports inline @mentions using the syntax:
 *   @[Display Name](urn:li:organization:123)   – mention a company
 *   @[Display Name](urn:li:person:abc)          – mention a person
 * The display name must match the entity's actual LinkedIn name (case-sensitive
 * for organizations; partial match OK for people).
 */
export async function createPost(accessToken: string, authorUrn: string, text: string): Promise<string> {
  const body = {
    author: authorUrn,
    commentary: text,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  const res = await fetch(`${LINKEDIN_REST_BASE}/posts`, {
    method: 'POST',
    headers: restHeaders(accessToken),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LinkedIn create post failed (${res.status}): ${errText}`);
  }

  const postId = res.headers.get('x-restli-id') || '';
  return postId;
}

/**
 * Create a comment on a LinkedIn post.
 * postUrn: the URN of the post being commented on (e.g., "urn:li:share:12345" or "urn:li:ugcPost:12345").
 */
export async function createComment(
  accessToken: string,
  authorUrn: string,
  postUrn: string,
  text: string
): Promise<string> {
  const body = {
    actor: authorUrn,
    message: { text },
  };

  const res = await fetch(
    `${LINKEDIN_REST_BASE}/socialActions/${encodeURIComponent(postUrn)}/comments`,
    {
      method: 'POST',
      headers: restHeaders(accessToken),
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LinkedIn create comment failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.id || '';
}

/**
 * React (like) a LinkedIn post.
 */
export async function reactToPost(
  accessToken: string,
  authorUrn: string,
  postUrn: string,
  reactionType: 'LIKE' | 'CELEBRATE' | 'SUPPORT' | 'LOVE' | 'INSIGHTFUL' | 'FUNNY' = 'LIKE'
): Promise<void> {
  const body = {
    actor: authorUrn,
    reactionType,
  };

  const res = await fetch(
    `${LINKEDIN_REST_BASE}/socialActions/${encodeURIComponent(postUrn)}/reactions`,
    {
      method: 'POST',
      headers: restHeaders(accessToken),
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LinkedIn react failed (${res.status}): ${errText}`);
  }
}

/**
 * Reshare a LinkedIn post with optional commentary.
 * Commentary supports the same @mention syntax as createPost.
 */
export async function resharePost(
  accessToken: string,
  authorUrn: string,
  originalPostUrn: string,
  commentary: string
): Promise<string> {
  const body = {
    author: authorUrn,
    commentary,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
    reshareContext: {
      parent: originalPostUrn,
    },
  };

  const res = await fetch(`${LINKEDIN_REST_BASE}/posts`, {
    method: 'POST',
    headers: restHeaders(accessToken),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LinkedIn reshare failed (${res.status}): ${errText}`);
  }

  return res.headers.get('x-restli-id') || '';
}
