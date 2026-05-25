import { isAiApiConfigured, triggerReportIngest } from './aiApi'
import { REPORT_PDFS_BUCKET, fullPdfStoragePath } from './reportPdfStorage'

/**
 * Upload (or replace) full + preview PDF assets for a report.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function uploadReportFullPdf(supabase, reportId, pdfFile) {
    const storagePath = fullPdfStoragePath(reportId)
    const { error: uploadErr } = await supabase.storage.from(REPORT_PDFS_BUCKET).upload(storagePath, pdfFile, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'application/pdf',
    })
    if (uploadErr) throw new Error(uploadErr.message)

    const bytes = pdfFile.size
    const rows = [
        {
            report_id: reportId,
            asset_type: 'full_pdf',
            storage_path: storagePath,
            content_type: 'application/pdf',
            bytes,
        },
        {
            report_id: reportId,
            asset_type: 'preview_pdf',
            storage_path: storagePath,
            content_type: 'application/pdf',
            bytes,
        },
    ]
    const { error: assetErr } = await supabase.from('report_assets').upsert(rows, {
        onConflict: 'report_id,asset_type',
    })
    if (assetErr) {
        await supabase.storage.from(REPORT_PDFS_BUCKET).remove([storagePath])
        throw new Error(assetErr.message)
    }
    return storagePath
}

/**
 * Extract text, chunk, embed into report_chunks (Railway FastAPI).
 * @param {() => Promise<string | null | undefined>} getAccessToken
 */
export async function indexReportForAi(reportId, getAccessToken) {
    if (!isAiApiConfigured()) {
        return { ok: false, skipped: true, error: 'AI API URL is not configured (VITE_AI_API_URL).' }
    }
    try {
        const result = await triggerReportIngest(reportId, getAccessToken)
        return {
            ok: true,
            chunks_written: result.chunks_written,
            detail: result.detail || `Indexed ${result.chunks_written} chunks.`,
        }
    } catch (e) {
        const msg = e?.message || 'AI indexing failed'
        const hint =
            msg === 'Failed to fetch'
                ? ' (network/CORS — restart Vite dev server after pulling latest code, or update ALLOWED_ORIGINS on Railway)'
                : ''
        return { ok: false, error: msg + hint }
    }
}

/**
 * Upload PDF then run AI indexing in one step.
 */
export async function uploadReportPdfAndIndex(supabase, reportId, pdfFile, getAccessToken) {
    await uploadReportFullPdf(supabase, reportId, pdfFile)
    return indexReportForAi(reportId, getAccessToken)
}
