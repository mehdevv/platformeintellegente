import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ImageIcon from '@mui/icons-material/Image'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import { useAuth } from '../../context/AuthContext'
import { triggerReportIngest } from '../../lib/aiApi'
import { logAdminAction } from '../../lib/adminAudit'
import { majorAmountToCents } from '../../lib/moneyFormat'
import { uploadImageFileToImgbb } from '../../lib/imgbbUpload'

const MAX_GALLERY_IMAGES = 16

export default function AdminReportEditPage() {
    const { reportId } = useParams()
    const navigate = useNavigate()
    const { supabase, session } = useAuth()
    const [loading, setLoading] = useState(true)
    const [title, setTitle] = useState('')
    const [slug, setSlug] = useState('')
    const [summary, setSummary] = useState('')
    const [priceMajor, setPriceMajor] = useState('0.00')
    const [sectorId, setSectorId] = useState('')
    const [sectors, setSectors] = useState([])
    const [publishedAt, setPublishedAt] = useState(null)
    const [err, setErr] = useState('')
    const [saving, setSaving] = useState(false)
    const [reportImages, setReportImages] = useState([])
    const [thumbnailUrl, setThumbnailUrl] = useState('')
    const [galleryBusy, setGalleryBusy] = useState(false)
    const [hasPdf, setHasPdf] = useState(false)
    const [chunkCount, setChunkCount] = useState(0)
    const [indexBusy, setIndexBusy] = useState(false)
    const [indexMsg, setIndexMsg] = useState('')
    const galleryInputRef = useRef(null)

    const getAccessToken = async () => session?.access_token ?? null

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            if (!supabase || !reportId) {
                setLoading(false)
                return
            }
            const [{ data: sec }, { data: rep, error }, { data: imgs }, { count: chunks }, { data: asset }] = await Promise.all([
                supabase.from('sectors').select('id, name').order('name'),
                supabase.from('reports').select('*').eq('id', reportId).single(),
                supabase
                    .from('report_images')
                    .select('id, image_url, sort_order')
                    .eq('report_id', reportId)
                    .order('sort_order', { ascending: true })
                    .order('created_at', { ascending: true }),
                supabase.from('report_chunks').select('id', { count: 'exact', head: true }).eq('report_id', reportId),
                supabase.from('report_assets').select('asset_type').eq('report_id', reportId).eq('asset_type', 'full_pdf').maybeSingle(),
            ])
            if (cancelled) return
            setSectors(sec || [])
            if (error || !rep) {
                setErr(error?.message || 'Not found')
                setReportImages([])
                setLoading(false)
                return
            }
            setTitle(rep.title || '')
            setSlug(rep.slug || '')
            setSummary(rep.summary || '')
            setPriceMajor(((rep.price_cents ?? 0) / 100).toFixed(2))
            setSectorId(rep.sector_id || '')
            setPublishedAt(rep.published_at || null)
            setThumbnailUrl(rep.thumbnail_image_url || '')
            setReportImages(imgs || [])
            setChunkCount(chunks ?? 0)
            setHasPdf(!!asset)
            setLoading(false)
        })()
        return () => {
            cancelled = true
        }
    }, [supabase, reportId])

    const addGalleryImages = async e => {
        const files = Array.from(e.target.files || [])
        e.target.value = ''
        if (!files.length || !supabase || !reportId) return
        setGalleryBusy(true)
        setErr('')
        try {
            const remaining = MAX_GALLERY_IMAGES - reportImages.length
            const slice = files.slice(0, Math.max(0, remaining))
            if (!slice.length) {
                setErr(`Maximum ${MAX_GALLERY_IMAGES} gallery images.`)
                return
            }
            let nextOrder = reportImages.length ? Math.max(...reportImages.map(r => r.sort_order ?? 0)) + 1 : 0
            const newRows = []
            for (const file of slice) {
                const { displayUrl } = await uploadImageFileToImgbb(file)
                const { data, error: insErr } = await supabase
                    .from('report_images')
                    .insert({ report_id: reportId, image_url: displayUrl, sort_order: nextOrder })
                    .select('id, image_url, sort_order')
                    .single()
                if (insErr) throw new Error(insErr.message)
                newRows.push(data)
                nextOrder += 1
            }
            setReportImages(prev => [...prev, ...newRows])
        } catch (ex) {
            setErr(ex?.message || 'Image upload failed')
        } finally {
            setGalleryBusy(false)
        }
    }

    const persistThumbnail = async nextUrl => {
        if (!supabase || !reportId) return
        const v = nextUrl || null
        const { error } = await supabase.from('reports').update({ thumbnail_image_url: v }).eq('id', reportId)
        if (error) setErr(error.message)
        else setThumbnailUrl(v || '')
    }

    const removeGalleryImage = async id => {
        if (!supabase) return
        setErr('')
        const removed = reportImages.find(r => r.id === id)
        const { error } = await supabase.from('report_images').delete().eq('id', id)
        if (error) setErr(error.message)
        else {
            setReportImages(prev => prev.filter(r => r.id !== id))
            if (removed?.image_url && thumbnailUrl === removed.image_url) {
                await persistThumbnail('')
            }
        }
    }

    const runAiIndex = async () => {
        setIndexBusy(true)
        setIndexMsg('')
        setErr('')
        try {
            const result = await triggerReportIngest(reportId, getAccessToken)
            setIndexMsg(result.detail || `Indexed ${result.chunks_written} chunks.`)
            setChunkCount(result.chunks_written ?? 0)
        } catch (ex) {
            setErr(ex?.message || 'AI indexing failed')
        } finally {
            setIndexBusy(false)
        }
    }

    const save = async () => {
        if (!supabase || !reportId) return
        setSaving(true)
        setErr('')
        const nextPublished = publishedAt || new Date().toISOString()
        const { error } = await supabase
            .from('reports')
            .update({
                title: title.trim(),
                slug: slug.trim(),
                summary: summary.trim() || null,
                status: 'published',
                price_cents: Math.max(0, majorAmountToCents(priceMajor)),
                sector_id: sectorId || null,
                published_at: nextPublished,
                thumbnail_image_url: thumbnailUrl.trim() || null,
            })
            .eq('id', reportId)
        if (!error) setPublishedAt(nextPublished)
        setSaving(false)
        if (error) setErr(error.message)
        else {
            await logAdminAction(supabase, { action: 'update', entityType: 'report', entityId: reportId, diff: { title } })
            navigate('/admin/reports', { replace: true })
        }
    }

    if (loading) {
        return (
            <Stack alignItems="center" py={6}>
                <CircularProgress />
            </Stack>
        )
    }

    return (
        <Stack spacing={3}>
            <Typography variant="h5" fontWeight={800}>
                Edit report
            </Typography>
            <Typography variant="body2" color="text.secondary">
                ID: <Typography component="span" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{reportId}</Typography>
            </Typography>
            {err && <Alert severity="error">{err}</Alert>}
            <Card variant="outlined" sx={{ p: 3, maxWidth: 900, borderRadius: 2 }}>
                <Stack spacing={2}>
                    <TextField label="Title" fullWidth size="small" value={title} onChange={e => setTitle(e.target.value)} />
                    <TextField label="Slug" fullWidth size="small" value={slug} onChange={e => setSlug(e.target.value)} />
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
                        type="number"
                        fullWidth
                        size="small"
                        value={priceMajor}
                        onChange={e => setPriceMajor(e.target.value)}
                        inputProps={{ min: 0, step: '0.01' }}
                        helperText="Amount in normal units (e.g. 49.99). Stored as cents in the database."
                    />

                    <Box sx={{ pt: 1, pb: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                            AI search index
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            Extracts text from the report PDF and stores embeddings in Supabase for the AI assistant. Requires a{' '}
                            <strong>full_pdf</strong> upload (create flow) and a running FastAPI backend.
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                            <Chip size="small" label={hasPdf ? 'PDF attached' : 'No PDF'} color={hasPdf ? 'success' : 'warning'} variant="outlined" />
                            <Chip size="small" label={`${chunkCount} chunks indexed`} variant="outlined" />
                        </Stack>
                        {indexMsg && <Alert severity="success" sx={{ mb: 1 }}>{indexMsg}</Alert>}
                        <Button variant="outlined" color="secondary" size="small" disabled={!hasPdf || indexBusy} onClick={runAiIndex}>
                            {indexBusy ? 'Indexing…' : 'Index for AI'}
                        </Button>
                    </Box>

                    <Box sx={{ pt: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                            Gallery images (imgBB)
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Up to {MAX_GALLERY_IMAGES} images; shown on the public report page. Star one image to use it as the <strong>catalogue thumbnail</strong> (reports listing). Requires{' '}
                            <code>VITE_IMGBB_API_KEY</code> in <code>.env</code>.
                        </Typography>
                        {thumbnailUrl && (
                            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                                <Chip size="small" icon={<StarIcon sx={{ fontSize: '16px !important' }} />} label="Thumbnail set" color="secondary" variant="outlined" />
                                <Button size="small" onClick={() => persistThumbnail('')}>
                                    Clear thumbnail
                                </Button>
                            </Stack>
                        )}
                        <input ref={galleryInputRef} type="file" accept="image/*" multiple hidden onChange={addGalleryImages} />
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ImageIcon />}
                            disabled={galleryBusy || reportImages.length >= MAX_GALLERY_IMAGES}
                            onClick={() => galleryInputRef.current?.click()}
                        >
                            {galleryBusy ? 'Uploading…' : 'Add images'}
                        </Button>
                        <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ mt: 2 }}>
                            {reportImages.map(img => {
                                const isThumb = thumbnailUrl && img.image_url === thumbnailUrl
                                return (
                                    <Box
                                        key={img.id}
                                        sx={{
                                            position: 'relative',
                                            width: 120,
                                            borderRadius: 1,
                                            overflow: 'hidden',
                                            border: '2px solid',
                                            borderColor: isThumb ? 'secondary.main' : 'divider',
                                        }}
                                    >
                                        <Box component="img" src={img.image_url} alt="" sx={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
                                        <Stack direction="row" sx={{ bgcolor: 'rgba(0,0,0,0.55)', justifyContent: 'space-between', alignItems: 'center', px: 0.25 }}>
                                            <IconButton
                                                size="small"
                                                onClick={() => persistThumbnail(isThumb ? '' : img.image_url)}
                                                sx={{ color: isThumb ? 'warning.light' : '#fff' }}
                                                aria-label={isThumb ? 'Remove as thumbnail' : 'Use as thumbnail'}
                                                title={isThumb ? 'Remove as thumbnail' : 'Use as catalogue thumbnail'}
                                            >
                                                {isThumb ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => removeGalleryImage(img.id)}
                                                sx={{ color: '#fff' }}
                                                aria-label="Remove image"
                                            >
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    </Box>
                                )
                            })}
                        </Stack>
                    </Box>

                    <Stack direction="row" spacing={1}>
                        <Button variant="contained" color="secondary" disableElevation disabled={saving} onClick={save}>
                            Save
                        </Button>
                        <Button component={Link} to="/admin/reports" variant="outlined">
                            Back to list
                        </Button>
                    </Stack>
                </Stack>
            </Card>
        </Stack>
    )
}
