import { beforeAll, describe, expect, it } from 'vitest';
import { CALLABLES, DEMO_PROJECT_ID, FUNCTIONS_REGION } from '../../shared/index.js';

/** The deployment manifest firebase-tools reads from every exported function. */
interface EndpointManifest {
  platform?: string;
  region?: unknown[];
  maxInstances?: unknown;
  timeoutSeconds?: unknown;
  callableTrigger?: unknown;
  eventTrigger?: {
    eventType?: string;
    eventFilterPathPatterns?: Record<string, string>;
  };
}

let exported: Record<string, unknown> = {};

beforeAll(async () => {
  process.env.GCLOUD_PROJECT = DEMO_PROJECT_ID;
  process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: DEMO_PROJECT_ID });
  exported = { ...(await import('./index.js')) };
  // Cold import of firebase-functions + firebase-admin: ~7 s normally, but it exceeded 30 s once
  // right after a fresh `npm ci` (cold disk cache / antivirus scan), so allow generous headroom.
}, 90_000);

function endpointOf(name: string): EndpointManifest {
  const fn = exported[name];
  if ((typeof fn !== 'function' && typeof fn !== 'object') || fn === null) {
    throw new Error(`${name} is not exported as a Cloud Function`);
  }
  const endpoint = (fn as { __endpoint?: EndpointManifest }).__endpoint;
  if (!endpoint) throw new Error(`${name} has no deployment manifest`);
  return endpoint;
}

describe('functions/src/index.ts', () => {
  it('exports exactly the six deployable functions', () => {
    expect(Object.keys(exported).sort()).toEqual(
      [
        'ensureUserProfile',
        'onGarageWrite',
        'onUserCreate',
        'placeOrder',
        'submitReview',
        'subscribeNewsletter',
      ].sort(),
    );
  });

  it('exports every callable under the shared CALLABLES name as a 2nd-gen callable', () => {
    for (const name of Object.values(CALLABLES)) {
      const endpoint = endpointOf(name);
      expect(endpoint.platform).toBe('gcfv2');
      expect(endpoint.callableTrigger).toBeDefined();
      expect(endpoint.region).toEqual([FUNCTIONS_REGION]);
      expect(endpoint.maxInstances).toBe(10);
    }
    expect(endpointOf(CALLABLES.placeOrder).timeoutSeconds).toBe(30);
  });

  it('deploys the Auth onCreate trigger as a 1st-gen function in asia-south1', () => {
    const endpoint = endpointOf('onUserCreate');
    expect(endpoint.platform).toBe('gcfv1');
    expect(endpoint.region).toEqual([FUNCTIONS_REGION]);
    expect(endpoint.eventTrigger?.eventType).toBe('providers/firebase.auth/eventTypes/user.create');
  });

  it('deploys the garage trigger as a 2nd-gen Firestore write trigger in asia-south1', () => {
    const endpoint = endpointOf('onGarageWrite');
    expect(endpoint.platform).toBe('gcfv2');
    expect(endpoint.region).toEqual([FUNCTIONS_REGION]);
    expect(endpoint.eventTrigger?.eventType).toBe('google.cloud.firestore.document.v1.written');
    expect(endpoint.eventTrigger?.eventFilterPathPatterns).toEqual({
      document: 'users/{uid}/garage/{productId}',
    });
  });
});
