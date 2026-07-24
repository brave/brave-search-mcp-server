import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Endpoints } from './BraveAPI/types.js';
import tools from './tools/index.js';
import {
  describeAccessFailure,
  describePlanRequirement,
  ENDPOINT_PLANS,
  isAccessFailure,
  PLANS,
  PLAN_DASHBOARD_URL,
} from './plans.js';

describe('plan registry', () => {
  it('assigns every endpoint a plan that exists', () => {
    for (const [endpoint, planId] of Object.entries(ENDPOINT_PLANS)) {
      assert.ok(PLANS[planId], `${endpoint} maps to unknown plan '${planId}'`);
    }
  });

  it('covers every endpoint the API client can reach', () => {
    // Mirrors the keys of Endpoints; a new endpoint without a plan is a bug.
    const endpoints: (keyof Endpoints)[] = [
      'images',
      'localPois',
      'localDescriptions',
      'news',
      'videos',
      'web',
      'summarizer',
      'llmContext',
      'placeSearch',
    ];

    for (const endpoint of endpoints) {
      assert.ok(ENDPOINT_PLANS[endpoint], `${endpoint} has no plan assigned`);
    }
  });

  it('separates search endpoints from the summarizer', () => {
    assert.notEqual(ENDPOINT_PLANS.web, ENDPOINT_PLANS.summarizer);
  });
});

describe('access failure classification', () => {
  it('treats entitlement failures as access failures', () => {
    assert.equal(isAccessFailure(401), true);
    assert.equal(isAccessFailure(403), true);
    assert.equal(isAccessFailure(422), true);
  });

  it('leaves throttling and upstream failures alone', () => {
    assert.equal(isAccessFailure(429), false);
    assert.equal(isAccessFailure(500), false);
    assert.equal(isAccessFailure(200), false);
  });
});

describe('plan guidance text', () => {
  it('names the plan the endpoint needs', () => {
    assert.match(describePlanRequirement('summarizer'), /Answers/);
    assert.match(describePlanRequirement('web'), /Search/);
  });

  it('tells the caller retrying will not help, and where to go', () => {
    const message = describeAccessFailure('summarizer');

    assert.match(message, /Answers/);
    assert.match(message, /retrying will not help/);
    assert.ok(message.includes(PLAN_DASHBOARD_URL));
  });
});

describe('tool descriptions', () => {
  it('state a plan requirement on every registered tool', () => {
    for (const tool of Object.values(tools)) {
      assert.match(
        tool.description,
        /Requires the Brave Search '.+' plan\./,
        `${tool.name} does not state its plan requirement`
      );
    }
  });
});
