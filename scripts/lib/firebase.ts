/**
 * Target resolution + firebase-admin initialisation shared by the seed, verify and set-admin
 * scripts.
 *
 * Emulator mode: uses `FIRESTORE_EMULATOR_HOST` / `FIREBASE_AUTH_EMULATOR_HOST` when already set
 * (e.g. by `firebase emulators:exec`), otherwise the default ports from shared/constants.ts, and
 * the `demo-hotwheelsarena` project unless `--project` is given. No credentials are needed.
 *
 * Live mode: Application Default Credentials (`GOOGLE_APPLICATION_CREDENTIALS` → a service-account
 * JSON key, or `gcloud auth application-default login`). The project comes from `--project`,
 * `GOOGLE_CLOUD_PROJECT` / `GCLOUD_PROJECT`, or the key file's `project_id`. `demo-*` projects are
 * refused because they only exist inside the Emulator Suite.
 */
import { existsSync, readFileSync } from 'node:fs';
import { applicationDefault, deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { DEMO_PROJECT_ID, EMULATOR_PORTS } from '../../shared/constants.ts';

export type FirebaseService = 'firestore' | 'auth';

const EMULATOR_ENV: Readonly<Record<FirebaseService, string>> = {
  firestore: 'FIRESTORE_EMULATOR_HOST',
  auth: 'FIREBASE_AUTH_EMULATOR_HOST',
};

const DEFAULT_EMULATOR_HOST: Readonly<Record<FirebaseService, string>> = {
  firestore: `127.0.0.1:${EMULATOR_PORTS.firestore}`,
  auth: `127.0.0.1:${EMULATOR_PORTS.auth}`,
};

export interface TargetRequest {
  service: FirebaseService;
  /** `--emulator` was passed. */
  emulator: boolean;
  /** `--project <id>`. */
  project?: string;
}

export interface Target {
  service: FirebaseService;
  mode: 'emulator' | 'live';
  projectId: string;
  emulatorHost: string | null;
  /** e.g. `emulator 127.0.0.1:8080 · project demo-hotwheelsarena` */
  label: string;
  /** Informational notes worth printing (auto-detected emulator, project mismatch…). */
  notes: string[];
}

/** A configuration problem the user can fix (printed without a stack trace). */
export class TargetError extends Error {
  override name = 'TargetError';
}

function readServiceAccountProjectId(path: string | undefined): string | undefined {
  if (!path) return undefined;
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (typeof parsed === 'object' && parsed !== null && 'project_id' in parsed) {
      const value: unknown = parsed.project_id;
      return typeof value === 'string' && value.trim() ? value.trim() : undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

const nonEmpty = (value: string | undefined): string | undefined =>
  value && value.trim() ? value.trim() : undefined;

export function resolveTarget(request: TargetRequest): Target {
  const envName = EMULATOR_ENV[request.service];
  const envHost = nonEmpty(process.env[envName]);
  const notes: string[] = [];
  const explicitProject = nonEmpty(request.project);

  if (request.emulator || envHost) {
    if (!request.emulator) {
      notes.push(`${envName} is set (${envHost ?? ''}), so this run targets the emulator.`);
    }
    const host = envHost ?? DEFAULT_EMULATOR_HOST[request.service];
    // firebase-admin reads the emulator host from the environment.
    process.env[envName] = host;
    const projectId = explicitProject ?? DEMO_PROJECT_ID;
    const envProject = nonEmpty(process.env.GCLOUD_PROJECT);
    if (envProject && envProject !== projectId) {
      notes.push(
        `The emulator was started for project "${envProject}" but this run uses "${projectId}". Pass --project ${envProject} if the app cannot see the data.`,
      );
    }
    return {
      service: request.service,
      mode: 'emulator',
      projectId,
      emulatorHost: host,
      label: `emulator ${host} · project ${projectId}`,
      notes,
    };
  }

  const credentialsPath = nonEmpty(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  if (credentialsPath && !existsSync(credentialsPath)) {
    throw new TargetError(
      `GOOGLE_APPLICATION_CREDENTIALS points to a file that does not exist: ${credentialsPath}`,
    );
  }
  const projectId =
    explicitProject ??
    nonEmpty(process.env.GOOGLE_CLOUD_PROJECT) ??
    nonEmpty(process.env.GCLOUD_PROJECT) ??
    readServiceAccountProjectId(credentialsPath);
  if (!projectId) {
    throw new TargetError(
      'No Firebase project to target. Pass --project <id> (or set GOOGLE_CLOUD_PROJECT), or add --emulator for the local Emulator Suite.',
    );
  }
  if (projectId.startsWith('demo-')) {
    throw new TargetError(
      `"${projectId}" is a demo project that only exists inside the Emulator Suite. Add --emulator, or pass a real --project id.`,
    );
  }
  if (!credentialsPath) {
    notes.push(
      'GOOGLE_APPLICATION_CREDENTIALS is not set; falling back to gcloud Application Default Credentials.',
    );
  }
  return {
    service: request.service,
    mode: 'live',
    projectId,
    emulatorHost: null,
    label: `LIVE project ${projectId}`,
    notes,
  };
}

/** Initialises a named firebase-admin app for the target. */
export function initAdminApp(target: Target, name: string): App {
  return initializeApp(
    target.mode === 'live'
      ? { projectId: target.projectId, credential: applicationDefault() }
      : { projectId: target.projectId },
    name,
  );
}

/** Deletes the app so gRPC channels close and the process can exit promptly. */
export async function closeAdminApp(app: App): Promise<void> {
  await deleteApp(app);
}

/** Friendly hint for common connection / credential failures. */
export function describeFirebaseError(error: unknown, target: Target | null): string {
  const message = error instanceof Error ? error.message : String(error);
  if (target?.mode === 'emulator' && /ECONNREFUSED|UNAVAILABLE|No connection established/i.test(message)) {
    return `${message}\n  → Is the ${target.service} emulator running on ${target.emulatorHost ?? 'its default port'}? Start it with "npm run emulators" (or run this command through "firebase emulators:exec").`;
  }
  if (target?.mode === 'live' && /default credentials|invalid_grant|PERMISSION_DENIED|UNAUTHENTICATED/i.test(message)) {
    return `${message}\n  → Set GOOGLE_APPLICATION_CREDENTIALS to a service-account key with Firestore/Auth admin access for project "${target.projectId}".`;
  }
  return message;
}
