import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { useTestClient } from '../../testUtils/mcpTestHarness.js';
import { name } from './index.js';

const geographicResult = (type: string) => ({
  type,
  name: 'Example',
  country: 'US',
  coordinates: [37.77, -122.42],
  thumbnail: { src: 'https://example.com/thumbnail.jpg' },
});

const responses = {
  minimal: { type: 'locations' },
  geographic: {
    type: 'locations',
    countries: [geographicResult('country')],
    regions: [geographicResult('region')],
    neighborhoods: [geographicResult('neighborhood')],
    mixed: [
      { type: 'countries', index: 0, all: false },
      { type: 'regions', index: null, all: true },
      { type: 'neighborhoods' },
    ],
  },
  nullable: {
    type: 'locations',
    countries: null,
    regions: null,
    neighborhoods: null,
    mixed: [],
  },
  future: { type: 'locations', future_results: [{ name: 'Example' }] },
};

describe(name, () => {
  const getClient = useTestClient((url) => {
    if (url.pathname === '/res/v1/local/place_search') {
      return responses[url.searchParams.get('q') as keyof typeof responses] ?? responses.minimal;
    }
  });

  it('returns a locations response for a simple location query', async () => {
    const result = await getClient().callTool({
      name,
      arguments: { location: 'san francisco ca united states' },
    });

    assert.equal(result.isError ?? false, false, JSON.stringify(result.content));
    assert.deepEqual(result.structuredContent, { type: 'locations' });
  });

  for (const query of ['geographic', 'nullable', 'future'] as const) {
    it(`preserves ${query} response fields through MCP output validation`, async () => {
      // Listing tools loads the advertised output schema into the SDK client.
      await getClient().listTools();
      const result = await getClient().callTool({ name, arguments: { query } });

      assert.equal(result.isError ?? false, false, JSON.stringify(result.content));
      assert.deepEqual(result.structuredContent, responses[query]);
      assert.deepEqual(result.content, [{ type: 'text', text: JSON.stringify(responses[query]) }]);
    });
  }

  it('advertises and validates the new fields while allowing unknown fields', async () => {
    const { tools } = await getClient().listTools();
    const schema = tools.find((tool) => tool.name === name)?.outputSchema;
    assert.ok(schema);
    for (const field of ['countries', 'regions', 'neighborhoods', 'mixed']) {
      assert.ok(schema.properties?.[field], `${field} is missing from the output schema`);
    }

    const validate = new Ajv2020({ strict: false, validateFormats: false }).compile(schema);
    for (const response of Object.values(responses)) {
      assert.equal(validate(response), true, JSON.stringify(validate.errors));
    }
    for (const invalid of [
      { type: 'wrong' },
      { countries: [geographicResult('city')] },
      { regions: 'invalid' },
      { neighborhoods: [{ type: 'neighborhood' }] },
      { mixed: [{ type: 'countries', index: 0.5 }] },
      { mixed: [{ type: 'countries', all: 'yes' }] },
    ]) {
      assert.equal(validate({ type: 'locations', ...invalid }), false, JSON.stringify(invalid));
    }
  });
});
