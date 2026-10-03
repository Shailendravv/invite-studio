// Prints a scrypt hash for ADMIN_PASSWORD_HASH so the plain password can be removed from .env.
//   npm run hash-password -w @invite/web -- "my password"
import { hashPassword } from "@invite/shared/security";

const pw = process.argv[2];
if (!pw) {
  console.error('Usage: npm run hash-password -w @invite/web -- "your password"');
  process.exit(1);
}
console.log(`ADMIN_PASSWORD_HASH=${hashPassword(pw)}`);
