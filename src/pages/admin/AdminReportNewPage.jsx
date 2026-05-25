import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import ImageIcon from '@mui/icons-material/Image'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import { useAuth } from '../../context/AuthContext'
import { slugify } from '../../lib/slugify'
import { logAdminAction } from '../../lib/adminAudit'
import { majorAmountToCents } from '../../lib/moneyFormat'
import { ensurePdfUnderMaxBytes, MAX_ADMIN_PDF_BYTES } from '../../lib/pdfCompress'
import { uploadImageFileToImgbb } from '../../lib/imgbbUpload'
import { indexReportForAi, uploadReportFullPdf } from '../../lib/adminReportPdf'
import { getFreshAccessToken } from '../../lib/supabaseSession'

const MAX_NEW_GALLERY = 16

export default function AdminReportNewPage() {
    const { supabase, user } = useAuth()
    const navigate = useNavigate()
    const fileInputRef = useRef(null)
    const galleryInputRef = useRef(null)
    const [sectors, setSectors] = useState([])
    const [title, setTitle] = useState('')
    const [slug, setSlug] = useState('')
    const [sectorId, setSectorId] = useState('')
    const [summary, setSummary] = useState('')
    const [priceMajor, setPriceMajor] = useState('0.00')
    const [pdfFile, setPdfFile] = useState(null)
    const [pdfCompressing, setPdfCompressing] = useState(false)
    const [pdfInfo, setPdfInfo] = useState('')
    const [err, setErr] = useState('')
    const [saving, setSaving] = useState(false)
    const [indexingAi, setIndexingAi] = useState(false)

    const getAccessToken = async () => getFreshAccessToken(supabase)
    const [galleryFiles, setGalleryFiles] = useState([])
    /** Index into `galleryFiles` (0-based) for catalogue thumbnail after publish; null = none */
    const [thumbnailPickIndex, setThumbnailPickIndex] = useState(null)

    useEffect(() => {
        ;(async () => {
            if (!supabase) return
            const { data } = await supabase.from('sectors').select('id, name').order('name')
            setSectors(data || [])
        })()
    }, [supabase])

    useEffect(() => {
        if (thumbnailPickIndex == null) return
        if (thumbnailPickIndex >= galleryFiles.length) setThumbnailPickIndex(null)
    }, [galleryFiles.length, thumbnailPickIndex])

    const onPickPdf = e => {
        const f = e.target.files?.[0]
        const input = e.target
        setErr('')
        setPdfInfo('')
        if (!f) {
            setPdfFile(null)
            return
        }
        if (f.type !== 'application/pdf') {
            setErr('Please choose a PDF file.')
            setPdfFile(null)
            input.value = ''
            return
        }
        setPdfCompressing(true)
        void (async () => {
            try {
                const { file, message } = await ensurePdfUnderMaxBytes(f, MAX_ADMIN_PDF_BYTES)
                setPdfFile(file)
                setPdfInfo(message || '')
            } catch (ex) {
                setPdfFile(null)
                setErr(ex?.message || 'Could not process this PDF.')
            } finally {
                setPdfCompressing(false)
                input.value = ''
            }
        })()
    }

    const onPickGallery = e => {
        const list = Array.from(e.target.files || [])
        e.target.value = ''
        if (!list.length) return
        setGalleryFiles(prev => [...prev, ...list].slice(0, MAX_NEW_GALLERY))
    }

    const save = async () => {
        if (!supabase || !user) return
        setErr('')
        setSaving(true)
        const finalSlug = (slug.trim() || slugify(title)).trim()
        const publishedAt = new Date().toISOString()
        const { data, error } = await supabase
            .from('reports')
            .insert({
                title: title.trim(),
                slug: finalSlug,
                sector_id: sectorId || null,
                summary: summary.trim() || null,
                status: 'published',
                published_at: publishedAt,
                price_cents: Math.max(0, majorAmountToCents(priceMajor)),
                created_by: user.id,
            })
            .select('id')
            .single()

        if (error) {
            setSaving(false)
            setErr(error.message)
            return
        }

        const reportId = data.id
        let aiIndexNotice = null

        if (pdfFile) {
            try {
                await uploadReportFullPdf(supabase, reportId, pdfFile)
            } catch (uploadEx) {
                setSaving(false)
                await logAdminAction(supabase, { action: 'create', entityType: 'report', entityId: reportId, diff: { title, upload: 'failed' } })
                navigate('/admin/reports', {
                    replace: true,
                    state: {
                        notice: {
                            severity: 'warning',
                            text: `Report was published, but PDF upload failed: ${uploadEx.message}. Edit the report to retry.`,
                        },
                    },
                })
                return
            }

            setIndexingAi(true)
            const idx = await indexReportForAi(reportId, getAccessToken)
            setIndexingAi(false)
            if (idx.ok) {
                aiIndexNotice = { severity: 'success', text: idx.detail }
            } else if (!idx.skipped) {
                aiIndexNotice = {
                    severity: 'warning',
                    text: `PDF saved, but AI indexing failed: ${idx.error}. Use “Index for AI” on the edit page to retry.`,
                }
            }
        }

        const galleryWarnings = []
        const slice = galleryFiles.slice(0, MAX_NEW_GALLERY)
        /** Same length as `slice`; URL only when that queued file uploaded and inserted */
        const urlAtQueuedIndex = slice.length ? new Array(slice.length).fill(null) : []
        if (slice.length) {
            let order = 0
            for (let i = 0; i < slice.length; i++) {
                const file = slice[i]
                try {
                    const { displayUrl } = await uploadImageFileToImgbb(file)
                    const { error: gErr } = await supabase.from('report_images').insert({
                        report_id: reportId,
                        image_url: displayUrl,
                        sort_order: order,
                    })
                    if (gErr) galleryWarnings.push(gErr.message)
                    else {
                        urlAtQueuedIndex[i] = displayUrl
                        order += 1
                    }
                } catch (ex) {
                    galleryWarnings.push(ex?.message || 'Gallery image failed')
                }
            }
        }
        const thumbFromPick = thumbnailPickIndex != null ? urlAtQueuedIndex[thumbnailPickIndex] : null
        if (thumbFromPick) {
            const { error: tErr } = await supabase.from('reports').update({ thumbnail_image_url: thumbFromPick }).eq('id', reportId)
            if (tErr) galleryWarnings.push(`Thumbnail: ${tErr.message}`)
        }

        setSaving(false)
        await logAdminAction(supabase, {
            action: 'create',
            entityType: 'report',
            entityId: reportId,
            diff: { title, pdf: !!pdfFile, ai_indexed: !!aiIndexNotice?.severity && aiIndexNotice.severity === 'success' },
        })
        const notices = [aiIndexNotice, galleryWarnings.length ? { severity: 'warning', text: `Report published. Some gallery images could not be saved: ${galleryWarnings.slice(0, 2).join('; ')}${galleryWarnings.length > 2 ? '…' : ''}` } : null].filter(Boolean)
        navigate('/admin/reports', {
            replace: true,
            ...(notices.length
                ? { state: { notice: notices[notices.length - 1], notices } }
                : {}),
        })
    }

    return (
        <Stack spacing={3}>
            <Typography variant="h5" fontWeight={800}>
                New report
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Publishes immediately to the live catalogue. If you attach a PDF, text is extracted and indexed for the AI assistant automatically (requires{' '}
                <code>VITE_AI_API_URL</code> and Railway backend). Max PDF size after processing:{' '}
                <strong>{MAX_ADMIN_PDF_BYTES / (1024 * 1024)} MB</strong>.
            </Typography>
            {pdfInfo && <Alert severity="success">{pdfInfo}</Alert>}
            {err && <Alert severity="error">{err}</Alert>}
            <Card variant="outlined" sx={{ p: 3, maxWidth: 640, borderRadius: 2 }}>
                <Stack spacing={2}>
                    <TextField label="Title" fullWidth required size="small" value={title} onChange={e => setTitle(e.target.value)} />
                    <TextField label="Slug" fullWidth size="small" helperText="URL segment" value={slug} onChange={e => setSlug(e.target.value)} />
                    <TextField label="Sector" select fullWidth size="small" value={sectorId} onChange={e => setSectorId(e.target.value)}>
                        <MenuItem value="">None</MenuItem>
                        {sectors.map(s => (
                            <MenuItem key={s.id} value={s.id}>
                                {s.name}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField label="Summary" fullWidth multiline minRows={3} size="small" value={summary} onChange={e => setSummary(e.target.value)} />
                    <TextField
                        label="Price"
                        fullWidth
                        size="small"
                        value={priceMajor}
                        onChange={e => setPriceMajor(e.target.value)}
                        type="number"
                        inputProps={{ min: 0, step: '0.01' }}
                        helperText="Amount in normal units (e.g. 49.99). Stored as cents in the database."
                    />
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            Gallery images (optional, up to {MAX_NEW_GALLERY}) — uploaded to imgBB after publish. Set <code>VITE_IMGBB_API_KEY</code> in <code>.env</code>.
                        </Typography>
                        <input ref={galleryInputRef} type="file" accept="image/*" multiple hidden onChange={onPickGallery} />
                        <Button size="small" variant="outlined" startIcon={<ImageIcon />} disabled={galleryFiles.length >= MAX_NEW_GALLERY} onClick={() => galleryInputRef.current?.click()}>
                            Add images
                        </Button>
                        {galleryFiles.length > 0 && (
                            <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1, alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary">
                                    {galleryFiles.length} file(s) queued
                                </Typography>
                                <IconButton
                                    size="small"
                                    aria-label="Clear gallery"
                                    onClick={() => {
                                        setGalleryFiles([])
                                        setThumbnailPickIndex(null)
                                    }}
                                >
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        )}
                        {galleryFiles.length > 0 && (
                            <TextField
                                label="Catalogue thumbnail"
                                select
                                fullWidth
                                size="small"
                                sx={{ mt: 1.5 }}
                                value={thumbnailPickIndex == null ? '' : String(thumbnailPickIndex)}
                                onChange={e => {
                                    const v = e.target.value
                                    setThumbnailPickIndex(v === '' ? null : Number(v))
                                }}
                                helperText="Optional: which queued image becomes the reports listing card image after publish."
                            >
                                <MenuItem value="">None</MenuItem>
                                {galleryFiles.slice(0, MAX_NEW_GALLERY).map((f, i) => (
                                    <MenuItem key={`${f.name}-${i}`} value={String(i)}>
                                        Image {i + 1} — {f.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}
                    </Box>
                    <Box>
                        <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" hidden onChange={onPickPdf} />
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Button variant="outlined" size="small" disabled={pdfCompressing} onClick={() => fileInputRef.current?.click()}>
                                {pdfCompressing ? 'Processing PDF…' : pdfFile ? 'Change PDF' : 'Attach PDF (optional)'}
                            </Button>
                            {pdfCompressing && <CircularProgress size={22} />}
                            {pdfFile && !pdfCompressing && (
                                <Typography variant="body2" color="text.secondary">
                                    {pdfFile.name} ({(pdfFile.size / (1024 * 1024)).toFixed(2)} MB)
                                </Typography>
                            )}
                        </Stack>
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="contained"
                            color="secondary"
                            disableElevation
                            disabled={saving || indexingAi || pdfCompressing || !title.trim()}
                            onClick={save}
                        >
                            {indexingAi ? 'Indexing for AI…' : saving ? 'Publishing…' : 'Publish report'}
                        </Button>
                        <Button component={Link} to="/admin/reports" variant="outlined">
                            Cancel
                        </Button>
                    </Stack>
                </Stack>
            </Card>
        </Stack>
    )
}
