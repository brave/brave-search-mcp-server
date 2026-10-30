import { readFileSync } from 'node:fs';
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';

/**
 * Helpers for simulating Amazon Bedrock AgentCore Runtime, which hosts the
 * image we list on AWS Marketplace. The contract: a stateless streamable-HTTP
 * server on 0.0.0.0:8000/mcp that accepts a platform-generated Mcp-Session-Id
 * on every request, including the first.
 * https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-mcp-protocol-contract.html
 */

export const AGENTCORE_PORT = 8000;

const PLATFORM_SESSION_ID = 'agentcore-0123456789abcdef0123456789abcdef';

type MarketplaceChangeSet = {
  ChangeSet: {
    DetailsDocument: {
      DeliveryOptions: {
        Details: {
          EcrDeliveryOptionDetails: {
            CompatibleServices?: string[];
            EnvironmentVariables?: { Name: string; DefaultValue?: string }[];
          };
        };
      }[];
    };
  }[];
};

/**
 * The environment variable defaults the AWS Marketplace listing pre-fills for
 * AgentCore deployments, read from marketplace-revision-release.json.
 */
export function agentCoreEnvironment(): Record<string, string> {
  const changeSet: MarketplaceChangeSet = JSON.parse(
    readFileSync(new URL('../../marketplace-revision-release.json', import.meta.url), 'utf8')
  );

  const details = changeSet.ChangeSet.flatMap((change) => change.DetailsDocument.DeliveryOptions)
    .map((option) => option.Details.EcrDeliveryOptionDetails)
    .find((option) => option.CompatibleServices?.includes('Bedrock-AgentCore'));

  if (!details) {
    throw new Error('marketplace-revision-release.json has no Bedrock-AgentCore delivery option');
  }

  return Object.fromEntries(
    (details.EnvironmentVariables ?? []).flatMap(({ Name, DefaultValue }) =>
      DefaultValue === undefined ? [] : [[Name, DefaultValue]]
    )
  );
}

/**
 * Parses a Streamable HTTP response, which may be plain JSON or an SSE stream
 * whose last `data:` line carries the JSON-RPC message.
 */
export async function readJsonRpc(res: Response): Promise<any> {
  const text = await res.text();

  if (!res.headers.get('content-type')?.includes('text/event-stream')) {
    return JSON.parse(text);
  }

  const data = text.split('\n').filter((line) => line.startsWith('data:'));
  return JSON.parse(data.at(-1)!.slice('data:'.length));
}

/**
 * POSTs a JSON-RPC request to `${baseUrl}/mcp` the way AgentCore forwards it:
 * carrying a session id the server never issued, and with no assumption that
 * the server instance has seen an initialize request.
 */
export async function agentCoreRpc(
  baseUrl: string,
  id: number,
  method: string,
  params: object = {}
): Promise<{ status: number; sessionId: string | null; body: any }> {
  const res = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-session-id': PLATFORM_SESSION_ID,
      'mcp-protocol-version': LATEST_PROTOCOL_VERSION,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });

  return {
    status: res.status,
    sessionId: res.headers.get('mcp-session-id'),
    body: await readJsonRpc(res),
  };
}

export const initializeParams = {
  protocolVersion: LATEST_PROTOCOL_VERSION,
  capabilities: {},
  clientInfo: { name: 'agentcore-test', version: '0.0.0' },
};
