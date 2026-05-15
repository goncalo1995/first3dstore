'use server'

import { dbAdmin } from '@/lib/db-admin'
import { isAdminEmail } from '@/lib/server-auth'

export async function sendAdminMagicCode(email: string) {
  // Validate that the email is an admin email
  if (!isAdminEmail(email)) {
    throw new Error('Unauthorized: This email is not authorized for admin access')
  }

  // Send the magic code using the admin SDK
  try {
    await dbAdmin.auth.sendMagicCode(email)
    return { success: true }
  } catch (error) {
    throw new Error('Failed to send magic code')
  }
}
