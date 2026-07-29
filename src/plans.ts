import type { Endpoints } from './BraveAPI/types.js';

export const PLAN_DASHBOARD_URL =
  'https://api-dashboard.search.brave.com/app/subscriptions/subscribe';

export type PlanId = 'search' | 'searchPro' | 'answers';

/**
 * Brave sells access as plans, and a subscription token is scoped to the plan
 * it was issued under. A token that works for /web/search is not guaranteed to
 * work for /summarizer/search. Naming follows the plan banners in
 * brave/brave-search-skills.
 */
export const PLANS: Record<PlanId, { label: string; note?: string }> = {
  search: {
    label: 'Search',
  },
  searchPro: {
    label: 'Search (Pro tier)',
    note: 'Local and place endpoints are available only on the Pro tiers.',
  },
  answers: {
    label: 'Answers',
    note: "Referred to as 'Pro AI' elsewhere in the Brave docs.",
  },
};

/**
 * Which plan each endpoint is served under. This is the single place that
 * knowledge lives; tool descriptions and error messages both read from here so
 * they cannot drift apart.
 */
export const ENDPOINT_PLANS: Record<keyof Endpoints, PlanId> = {
  web: 'search',
  images: 'search',
  videos: 'search',
  news: 'search',
  llmContext: 'search',
  localPois: 'searchPro',
  localDescriptions: 'searchPro',
  placeSearch: 'searchPro',
  summarizer: 'answers',
};

/**
 * A one-line statement of what a given endpoint needs, suitable for appending
 * to an error or embedding in a tool description.
 */
export const describePlanRequirement = (endpoint: keyof Endpoints): string => {
  const plan = PLANS[ENDPOINT_PLANS[endpoint]];
  const note = plan.note ? ` ${plan.note}` : '';
  return `Requires the Brave Search '${plan.label}' plan.${note}`;
};

/**
 * Guidance appended to authentication and authorization failures.
 *
 * A 401/403/422 from Brave is most often a plan mismatch rather than a
 * malformed key: the token is valid, but it was issued under a plan that does
 * not include this endpoint. Saying so turns an opaque failure into one the
 * caller -- increasingly a model rather than a person -- can act on.
 */
export const describeAccessFailure = (endpoint: keyof Endpoints): string =>
  [
    describePlanRequirement(endpoint),
    'If your API key is subscribed to a different plan, this request will fail on every attempt; retrying will not help.',
    `Review or change your plan at ${PLAN_DASHBOARD_URL}`,
  ].join(' ');

/**
 * Statuses that indicate the key is valid JSON but not entitled to this
 * endpoint (or not valid at all). Distinct from 429 and 5xx, which are worth
 * retrying.
 */
export const isAccessFailure = (status: number): boolean =>
  status === 401 || status === 403 || status === 422;
