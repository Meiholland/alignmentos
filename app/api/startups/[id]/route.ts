import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle params as Promise (Next.js 15+) or object (older versions)
    const resolvedParams = await Promise.resolve(params)
    const startupId = resolvedParams.id

    if (!startupId) {
      return NextResponse.json({ error: 'Startup ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('startups')
      .select('*')
      .eq('id', startupId)
      .single()

    if (error) {
      console.error('Database error:', error)
      // If no rows returned, return 404
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Startup not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Startup not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('GET /api/startups/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const startupId = resolvedParams.id

    if (!startupId) {
      return NextResponse.json({ error: 'Startup ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // IMPORTANT: This only deletes from our database, NOT from Pipedrive
    // The Pipedrive deal remains untouched
    const { error } = await supabase
      .from('startups')
      .delete()
      .eq('id', startupId)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Startup deleted successfully' })
  } catch (error: any) {
    console.error('DELETE /api/startups/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
