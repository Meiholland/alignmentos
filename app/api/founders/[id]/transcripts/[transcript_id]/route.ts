import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; transcript_id: string }> | { id: string; transcript_id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const founderId = resolvedParams.id
    const transcriptId = resolvedParams.transcript_id

    if (!founderId || !transcriptId) {
      return NextResponse.json({ error: 'Founder ID and Transcript ID are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the transcript to get the file_url before deleting
    const adminSupabase = createAdminClient()
    const { data: transcript, error: fetchError } = await adminSupabase
      .from('interview_transcripts')
      .select('file_url, founder_id')
      .eq('id', transcriptId)
      .eq('founder_id', founderId)
      .single()

    if (fetchError || !transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 })
    }

    // Delete file from Supabase Storage if it exists
    if (transcript.file_url) {
      try {
        // Extract file path from URL
        // URL format: https://{project}.supabase.co/storage/v1/object/public/transcripts/interviews/{founderId}/{filename}
        const urlParts = transcript.file_url.split('/transcripts/')
        if (urlParts.length > 1) {
          // The path after /transcripts/ is already in the correct format: interviews/{founderId}/{filename}
          const filePath = urlParts[1]
          const { error: storageError } = await adminSupabase.storage
            .from('transcripts')
            .remove([filePath])

          if (storageError) {
            console.error('Error deleting file from storage:', storageError)
            // Continue with database deletion even if storage deletion fails
          }
        }
      } catch (storageErr) {
        console.error('Error processing file deletion:', storageErr)
        // Continue with database deletion
      }
    }

    // Delete transcript from database
    const { error: deleteError } = await adminSupabase
      .from('interview_transcripts')
      .delete()
      .eq('id', transcriptId)
      .eq('founder_id', founderId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('Delete transcript error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
