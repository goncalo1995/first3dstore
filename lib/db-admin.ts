import { init, id } from '@instantdb/admin';
import schema from '../instant.schema';

// ID for app: golfprint
const dbAdmin = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  schema,
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN,
  useDateObjects: true, // Ensure dates are returned as Date objects
});

export { dbAdmin };
