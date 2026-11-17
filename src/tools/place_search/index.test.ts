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

  // Covers populated results, null thumbnail fields, and mixed ordering nullability.
  geographic: {
    type: 'locations',
    countries: [geographicResult('country')],
    regions: [geographicResult('region')],
    neighborhoods: [
      geographicResult('neighborhood'),
      {
        ...geographicResult('neighborhood'),
        type: null,
        thumbnail: {
          src: 'https://example.com/thumbnail.jpg',
          alt: null,
          height: null,
          width: null,
          bg_color: null,
          original: null,
          logo: null,
          duplicated: null,
          theme: null,
        },
      },
    ],
    mixed: [
      { type: 'countries', index: 0, all: false },
      { type: 'regions', index: null, all: true },
      { type: 'neighborhoods', index: 1, all: null },
      { type: 'neighborhoods' },
    ],
  },

  nullable: {
    type: 'locations',
    countries: null,
    regions: null,
    neighborhoods: null,
    mixed: null,
  },

  // "future" is an arbitrary name for a payload with a field the schema doesn't declare (future_results).
  // Regression guard: if the schema is tightened to reject unknown properties, validation fails.
  future: { type: 'locations', future_results: [{ name: 'Example' }] },
};

describe(name, () => {
  // 'q' selects a fixture by name; requests without a matching query return responses.minimal.
  const getClient = useTestClient((url) => {
    if (url.pathname === '/res/v1/local/place_search') {
      return responses[url.searchParams.get('q') as keyof typeof responses] ?? responses.minimal;
    }
  });

  it('returns a locations response for a simple location query', async () => {
    // Listing tools loads the advertised output schema into the SDK client.
    await getClient().listTools();
    const result = await getClient().callTool({
      name,
      arguments: { location: 'san francisco ca united states' },
    });

    assert.equal(result.isError ?? false, false, JSON.stringify(result.content));
    assert.deepEqual(result.structuredContent, responses.minimal);
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

    // The output schema stays open to unknown fields: the Brave API may add fields before this
    // server's schema is updated, and rejecting them would fail client validation.
    for (const response of Object.values(responses)) {
      assert.equal(validate(response), true, JSON.stringify(validate.errors));
    }

    const invalidFields = [
      { type: 'wrong' },
      { countries: [geographicResult('city')] },
      { regions: 'invalid' },
      { neighborhoods: [{ type: 'neighborhood' }] },
      { mixed: [{ type: 'countries', index: 0.5 }] },
      { mixed: [{ type: 'countries', all: 'yes' }] },
    ];

    for (const invalid of invalidFields) {
      assert.equal(validate({ type: 'locations', ...invalid }), false, JSON.stringify(invalid));
    }
  });
});
