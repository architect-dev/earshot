/**
 * Script to verify email addresses for all seed users
 * 
 * Setup:
 * 1. Go to Firebase Console → Project Settings → Service Accounts
 * 2. Click "Generate new private key"
 * 3. Save the file as `serviceAccountKey.json` in the scripts folder
 * 4. Run: node scripts/verify-seed-users.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (err) {
  console.error('❌ Error: Could not load serviceAccountKey.json');
  console.error('');
  console.error('To fix this:');
  console.error('1. Go to Firebase Console → Project Settings → Service Accounts');
  console.error('2. Click "Generate new private key"');
  console.error('3. Save the file as: scripts/serviceAccountKey.json');
  console.error('');
  process.exit(1);
}

// Seed user emails (must match seedUsers.ts)
const SEED_EMAILS = [
  'alice@debug.earshot',
  'bob@debug.earshot',
  'charlie@debug.earshot',
  'diana@debug.earshot',
  'evan@debug.earshot',
  'fiona@debug.earshot',
  'george@debug.earshot',
  'hannah@debug.earshot',
  'ivan@debug.earshot',
  'julia@debug.earshot',
];

async function verifySeedUsers() {
  console.log('🔄 Verifying seed users...\n');

  let verified = 0;
  let skipped = 0;
  let errors = 0;

  for (const email of SEED_EMAILS) {
    try {
      const user = await admin.auth().getUserByEmail(email);
      
      if (user.emailVerified) {
        console.log(`⏭️  ${email} - already verified`);
        skipped++;
        continue;
      }

      await admin.auth().updateUser(user.uid, { emailVerified: true });
      console.log(`✅ ${email} - verified`);
      verified++;
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        console.log(`❓ ${email} - user not found (create them in the app first)`);
      } else {
        console.log(`❌ ${email} - ${err.message}`);
      }
      errors++;
    }
  }

  console.log('');
  console.log('📊 Summary:');
  console.log(`   Verified: ${verified}`);
  console.log(`   Skipped:  ${skipped}`);
  console.log(`   Errors:   ${errors}`);
}

verifySeedUsers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

