import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/db-admin'
import { getAdminUserFromRequest } from '@/lib/server-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAdminUserFromRequest(request)
  if ('response' in auth) return auth.response

  const { id } = await params

  try {
    const result = await dbAdmin.query({
      printerSlots: {
        $: { where: { printerId: id } },
        spool: {
          color: {}
        },
        color: {}
      }
    })

    return NextResponse.json({ slots: result.printerSlots || [] })
  } catch (error: any) {
    console.error('Error fetching printer slots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch slots' },
      { status: 500 }
    )
  }
}
