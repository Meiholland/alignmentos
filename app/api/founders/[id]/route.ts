import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { founderSchema } from '@/lib/schemas/founder'

// Handle dynamic params (Next.js 15+ compatibility)
async function getParams(params: Promise<{ id: string }> | { id: string }) {
  return await Promise.resolve(params)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await getParams(params)
    const founderId = resolvedParams.id

    const { error } = await supabase.from('founders').delete().eq('id', founderId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await getParams(params)
    const founderId = resolvedParams.id

    const body = await request.json()
    
    // Create update schema (same as founderSchema but without startup_id requirement)
    const updateSchema = founderSchema.omit({ startup_id: true }).partial()
    const validated = updateSchema.parse(body)

    const { data, error } = await supabase
      .from('founders')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', founderId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
