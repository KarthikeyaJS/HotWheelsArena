/**
 * HotWheelsArena — grant / revoke the `admin` custom claim.
 *
 * Privileged writes (products, categories, series, settings, order status) are allowed by the
 * Firestore rules only when `request.auth.token.admin == true`. This script sets that claim on an
 * existing Firebase Auth user, looked up by email. Other custom claims are preserved.
 *
 *   npx tsx scripts/set-admin.ts --email you@example.com --emulator
 *   npx tsx scripts/set-admin.ts --email you@example.com --project my-project
 *   npx tsx scripts/set-admin.ts --email you@example.com --project my-project --revoke
 *   npx tsx scripts/set-admin.ts --email you@example.com --emulator --check
 *
 * The user must sign in once first (the account has to exist). The new claim reaches the
 * browser when the ID token refreshes — sign out and back in to apply it immediately.
 */
import { parseArgs } from 'node:util';
import { getAuth } from 'firebase-admin/auth';
import {
  closeAdminApp,
  describeFirebaseError,
  initAdminApp,
  resolveTarget,
  TargetError,
  type Target,
} from './lib/firebase.ts';

const USAGE = `
HotWheelsArena admin claim — grant or revoke { admin: true } on a Firebase Auth user.

Usage
  npx tsx scripts/set-admin.ts --email <email> [flags]

Flags
  --email <email>    Account to update (it must already exist — sign in once first).
  --revoke           Remove the admin claim instead of granting it.
  --check            Only print the account's current custom claims.
  --emulator         Target the Auth emulator: FIREBASE_AUTH_EMULATOR_HOST if set,
                     else 127.0.0.1:9099. Project "demo-hotwheelsarena" unless --project.
  --project <id>     Firebase project id. Live mode authenticates with Application
                     Default Credentials (GOOGLE_APPLICATION_CREDENTIALS).
  --help, -h         Show this help.
`;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CliOptions {
  email: string;
  revoke: boolean;
  check: boolean;
  emulator: boolean;
  project: string | undefined;
}

type ParsedCli = { help: true } | { help: false; options: CliOptions };

function parseCli(argv: readonly string[]): ParsedCli {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      email: { type: 'string' },
      revoke: { type: 'boolean', default: false },
      check: { type: 'boolean', default: false },
      emulator: { type: 'boolean', default: false },
      project: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  if (values.help) return { help: true };
  const email = values.email?.trim().toLowerCase() ?? '';
  if (!email) throw new Error('--email is required');
  if (!EMAIL.test(email)) throw new Error(`"${email}" is not a valid email address`);
  if (values.revoke && values.check) throw new Error('--revoke and --check cannot be combined');
  if (values.project !== undefined && !values.project.trim())
    throw new Error('--project needs a project id');
  return {
    help: false,
    options: {
      email,
      revoke: values.revoke,
      check: values.check,
      emulator: values.emulator,
      project: values.project?.trim(),
    },
  };
}

const formatClaims = (claims: Record<string, unknown> | undefined): string =>
  claims && Object.keys(claims).length > 0 ? JSON.stringify(claims) : '(none)';

function errorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code: unknown = error.code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

async function main(): Promise<number> {
  let parsed: ParsedCli;
  try {
    parsed = parseCli(process.argv.slice(2));
  } catch (error) {
    console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
    console.error(USAGE);
    return 2;
  }
  if (parsed.help) {
    console.log(USAGE);
    return 0;
  }
  const { options } = parsed;

  let target: Target;
  try {
    target = resolveTarget({
      service: 'auth',
      emulator: options.emulator,
      project: options.project,
    });
  } catch (error) {
    if (error instanceof TargetError) {
      console.error(`✖ ${error.message}`);
      return 1;
    }
    throw error;
  }
  for (const note of target.notes) console.log(`  i ${note}`);
  console.log(`→ Target: ${target.label}`);

  const app = initAdminApp(target, `set-admin-${Date.now()}`);
  try {
    const auth = getAuth(app);
    let user;
    try {
      user = await auth.getUserByEmail(options.email);
    } catch (error) {
      if (errorCode(error) === 'auth/user-not-found') {
        console.error(
          `✖ No account with email ${options.email} in ${target.label}. Sign in to the app once with that Google account, then re-run.`,
        );
        return 1;
      }
      throw error;
    }

    const before: Record<string, unknown> = { ...(user.customClaims ?? {}) };
    console.log(`  User     ${user.email ?? options.email} (uid ${user.uid})`);
    console.log(`  Claims   ${formatClaims(before)}`);
    if (options.check) {
      console.log(
        before.admin === true ? '✔ This account is an admin.' : '• This account is not an admin.',
      );
      return 0;
    }

    const isAdmin = before.admin === true;
    if (options.revoke ? !isAdmin : isAdmin) {
      console.log(`✔ Nothing to do — admin is already ${isAdmin ? 'granted' : 'absent'}.`);
      return 0;
    }

    const next: Record<string, unknown> = { ...before };
    if (options.revoke) delete next.admin;
    else next.admin = true;
    await auth.setCustomUserClaims(user.uid, Object.keys(next).length > 0 ? next : null);

    const updated = await auth.getUser(user.uid);
    console.log(`  Now      ${formatClaims(updated.customClaims)}`);
    console.log(
      `✔ Admin ${options.revoke ? 'revoked from' : 'granted to'} ${options.email}. ` +
        'Sign out and back in (or refresh the ID token) for the change to take effect.',
    );
    return 0;
  } catch (error) {
    console.error(`✖ ${describeFirebaseError(error, target)}`);
    return 1;
  } finally {
    await closeAdminApp(app);
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
