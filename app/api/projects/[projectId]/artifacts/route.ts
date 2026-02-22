import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/auth/errors'
import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE, getFileExtension } from '@/lib/artifacts/file-types'
import { extractText } from '@/lib/artifacts/extraction'

/**
 * GET /api/projects/[projectId]/artifacts
 * List artifacts for a project, optionally filtered by folder.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const supabase = createServiceClient()

    // Verify membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    const folderId = request.nextUrl.searchParams.get('folderId')

    let query = supabase
      .from('artifacts')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (folderId) {
      query = query.eq('folder_id', folderId)
    } else {
      query = query.is('folder_id', null)
    }

    const { data: artifacts, error } = await query

    if (error) {
      console.error('Error fetching artifacts:', error)
      return Response.json({ error: 'Failed to fetch artifacts' }, { status: 500 })
    }

    return Response.json({ artifacts: artifacts || [] })
  } catch (err) {
    return handleAuthError(err)
  }
}

/**
 * POST /api/projects/[projectId]/artifacts
 * Upload a file artifact. Expects multipart/form-data.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth()
    const { projectId } = await params
    const supabase = createServiceClient()

    // Verify membership
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folderId = formData.get('folder_id') as string | null
    const customName = formData.get('name') as string | null

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const ext = getFileExtension(file.name)
    if (!ACCEPTED_EXTENSIONS[ext]) {
      return Response.json(
        { error: `File type .${ext} is not supported` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: 'File exceeds 50MB limit' },
        { status: 413 }
      )
    }

    if (file.size === 0) {
      return Response.json({ error: 'File is empty' }, { status: 400 })
    }

    // Generate storage path: projects/{projectId}/artifacts/{timestamp}_{filename}
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `projects/${projectId}/artifacts/${timestamp}_${sanitizedName}`

    // Upload to Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from('artifacts')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return Response.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      )
    }

    // Create artifact record with extracting status
    const artifactName = customName?.trim() || file.name
    const { data: artifact, error: insertError } = await supabase
      .from('artifacts')
      .insert({
        project_id: projectId,
        folder_id: folderId || null,
        name: artifactName,
        file_type: ext,
        file_size: file.size,
        storage_path: storagePath,
        uploaded_by: user.id,
        processing_status: 'extracting_text',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Artifact insert error:', insertError)
      // Clean up uploaded file
      await supabase.storage.from('artifacts').remove([storagePath])
      return Response.json(
        { error: 'Failed to save artifact metadata' },
        { status: 500 }
      )
    }

    // Extract text content (inline, non-blocking for response)
    try {
      const contentText = await extractText(fileBuffer, ext)
      await supabase
        .from('artifacts')
        .update({
          content_text: contentText,
          processing_status: 'complete',
        })
        .eq('id', artifact.id)
      artifact.content_text = contentText
      artifact.processing_status = 'complete'
    } catch (extractionError) {
      console.error('Text extraction error:', extractionError)
      await supabase
        .from('artifacts')
        .update({ processing_status: 'failed' })
        .eq('id', artifact.id)
      artifact.processing_status = 'failed'
    }

    return Response.json({ artifact }, { status: 201 })
  } catch (err) {
    return handleAuthError(err)
  }
}
