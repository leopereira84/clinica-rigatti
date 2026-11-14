import { z } from 'zod';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { newPasswordSchema } from '../shared/validation/credentials.js';
import { DEMO_COMPANIES } from './demoData.js';
import { describeTarget } from './describeTarget.js';
import { seedDemoData } from './seedDemo.js';

/**
 * Usage:
 *   npm run seed         -> dry run: shows the target and the plan, writes nothing
 *   npm run seed:apply   -> writes the demo data (same as passing --yes)
 */

function fail(message: string): never {
  console.error(`Seed aborted: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  if (env.NODE_ENV === 'production') {
    fail('refusing to run with NODE_ENV=production.');
  }

  const seedEnv = z.object({ SEED_PASSWORD: newPasswordSchema }).safeParse(process.env);
  if (!seedEnv.success) {
    fail('SEED_PASSWORD must be set in .env (at least 8 characters).');
  }

  console.log(`Target database: ${describeTarget(env.MONGODB_URI)}`);
  console.log('Plan: remove and recreate only these demo companies (and their users and products):');
  for (const company of DEMO_COMPANIES) {
    console.log(`  - ${company.name}: ${company.users.length} users, ${company.products.length} products`);
  }

  if (!process.argv.includes('--yes')) {
    console.log('\nDry run: nothing was written. Run "npm run seed:apply" to apply.');
    return;
  }

  await connectDatabase(env.MONGODB_URI);
  try {
    const summary = await seedDemoData(seedEnv.data.SEED_PASSWORD);
    console.log(`\nDone. Previous demo companies removed: ${summary.removedCompanies}`);
    for (const company of summary.companies) {
      const users = company.users.map((user) => `${user.email} (${user.role})`).join(', ');
      console.log(`  - ${company.name}: ${company.products} products; users: ${users}`);
    }
    console.log('All demo users share the password defined in SEED_PASSWORD.');
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
