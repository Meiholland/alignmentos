import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const founderId = formData.get('founder_id') as string

    if (!file || !founderId) {
      return NextResponse.json(
        { error: 'File and founder_id are required' },
        { status: 400 }
      )
    }

    // Extract text based on file type
    let rawText = ''
    const fileName = file.name.toLowerCase()

    if (file.type === 'text/plain' || fileName.endsWith('.txt')) {
      rawText = await file.text()
    } else if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      // Dynamic import for CommonJS module
      const pdf = (await import('pdf-parse')).default
      const pdfData = await pdf(buffer)
      rawText = pdfData.text
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      // Handle .docx files
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      rawText = result.value
    } else if (
      file.type === 'application/msword' ||
      fileName.endsWith('.doc')
    ) {
      // Handle .doc files (older Word format)
      // Note: .doc parsing is limited - we'll try to extract what we can
      return NextResponse.json(
        {
          error:
            '.doc files (older Word format) are not fully supported. Please convert to .docx, .pdf, or .txt format.',
        },
        { status: 400 }
      )
    } else {
      return NextResponse.json(
        {
          error:
            'Unsupported file type. Supported formats: .txt, .pdf, .docx',
        },
        { status: 400 }
      )
    }

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not extract text from file' },
        { status: 400 }
      )
    }

    // Upload to Supabase storage (optional, for file retention)
    const adminSupabase = createAdminClient()
    const fileExt = fileName.split('.').pop()
    const filePath = `interviews/${founderId}/${Date.now()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('transcripts')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    let fileUrl = null
    if (!uploadError && uploadData) {
      const {
        data: { publicUrl },
      } = adminSupabase.storage.from('transcripts').getPublicUrl(filePath)
      fileUrl = publicUrl
    }

    // Save transcript to database
    const { data, error } = await adminSupabase
      .from('interview_transcripts')
      .insert({
        founder_id: founderId,
        raw_text: rawText,
        file_url: fileUrl,
        file_name: fileName,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Update founder interview status
    await adminSupabase
      .from('founders')
      .update({ interview_status: 'completed' })
      .eq('id', founderId)

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
