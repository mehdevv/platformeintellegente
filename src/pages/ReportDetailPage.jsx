import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import LockIcon from '@mui/icons-material/Lock'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ReportFirstPagePdfPreview from '../components/report/ReportFirstPagePdfPreview'
import { useAuth } from '../context/AuthContext'
import { activeEntitlementsOrFilter } from '../lib/accountActions'
import { formatPriceFromCents } from '../lib/moneyFormat'
import { isUuid } from '../lib/reportPath'
import { REPORT_PDFS_BUCKET } from '../lib/reportPdfStorage'
import { REPORT_PDF_SIGNED_URL_TTL_SEC } from '../lib/reportPdfAccess'

export default function ReportDetailPage() {
    const { id } = useParams()
    const { supabase, user, isStaff } = useAuth()
    const [report, setReport] = useState(null)
    const [entitled, setEntitled] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null)
    const [previewPdfLoading, setPreviewPdfLoading] = useState(false)
    const [reportImages, setReportImages] = useState([])
    const [bannerIndex, setBannerIndex] = useState(0)

    const bannerImageUrls = useMemo(() => {
        const gallery = (reportImages || []).map(i => i.image_url).filter(Boolean)
        if (gallery.length) return gallery
        if (report?.thumbnail_image_url) return [report.thumbnail_image_url]
        return []
    }, [reportImages, report?.thumbnail_image_url])

    useEffect(() => {
        setBannerIndex(0)
    }, [report?.id, bannerImageUrls.join('|')])

    useEffect(() => {
        if (bannerImageUrls.length <= 1) return undefined
        const n = bannerImageUrls.length
        const id = window.setInterval(() => {
            setBannerIndex(i => (i + 1) % n)
        }, 5000)
        return () => window.clearInterval(id)
    }, [bannerImageUrls])

    const refreshEntitlement = useCallback(
        async rep => {
            if (!supabase || !rep) return
            if (isStaff) {
                setEntitled(true)
                return
            }
            if (!user) {
                setEntitled(false)
                return
            }
            const targetFilter = rep.sector_id
                ? `report_id.eq.${rep.id},sector_id.eq.${rep.sector_id}`
                : `report_id.eq.${rep.id}`
            const { data: ent } = await supabase
                .from('user_report_entitlements')
                .select('id, sector_id, report_id, expires_at')
                .eq('user_id', user.id)
                .or(targetFilter)
                .or(activeEntitlementsOrFilter())
                .limit(1)
            setEntitled(Array.isArray(ent) && ent.length > 0)
        },
        [supabase, user, isStaff],
    )

    const loadReportAndAccess = useCallback(async () => {
        if (!supabase || !id) {
            setLoading(false)
            return
        }
        setLoading(true)
        setError('')
        const col = isUuid(id) ? 'id' : 'slug'
        const { data: rep, error: e1 } = await supabase.from('reports').select('*, sectors(id, name, slug, icon_image_url)').eq(col, id).maybeSingle()
        if (e1 || !rep) {
            setError(e1?.message || 'Report not found')
            setReport(null)
            setEntitled(false)
            setLoading(false)
            return
        }
        setReport(rep)
        await refreshEntitlement(rep)
        setLoading(false)
    }, [supabase, id, refreshEntitlement])

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            await loadReportAndAccess()
            if (cancelled) return
        })()
        return () => {
            cancelled = true
        }
    }, [loadReportAndAccess])

    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible' && report) refreshEntitlement(report)
        }
        document.addEventListener('visibilitychange', onVisible)
        window.addEventListener('focus', onVisible)
        return () => {
            document.removeEventListener('visibilitychange', onVisible)
            window.removeEventListener('focus', onVisible)
        }
    }, [report, refreshEntitlement])

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            if (!supabase || !report?.id) {
                setReportImages([])
                return
            }
            const { data } = await supabase
                .from('report_images')
                .select('id, image_url, sort_order')
                .eq('report_id', report.id)
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: true })
            if (!cancelled) setReportImages(data || [])
        })()
        return () => {
            cancelled = true
        }
    }, [supabase, report?.id])

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            if (!supabase || !report?.id) {
                setPreviewPdfUrl(null)
                return
            }
            setPreviewPdfLoading(true)
            setPreviewPdfUrl(null)
            const { data: ra } = await supabase
                .from('report_assets')
                .select('storage_path')
                .eq('report_id', report.id)
                .eq('asset_type', 'preview_pdf')
                .maybeSingle()
            if (cancelled) return
            if (!ra?.storage_path) {
                setPreviewPdfLoading(false)
                return
            }
            const { data, error: signErr } = await supabase.storage
                .from(REPORT_PDFS_BUCKET)
                .createSignedUrl(ra.storage_path, REPORT_PDF_SIGNED_URL_TTL_SEC)
            if (!cancelled) {
                setPreviewPdfUrl(!signErr && data?.signedUrl ? data.signedUrl : null)
                setPreviewPdfLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [supabase, report?.id])

    const priceLabel =
        report && report.price_cents > 0 ? formatPriceFromCents(report.price_cents, report.currency) : 'Contact us'

    return (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
            <Header />
            <Container maxWidth="lg" sx={{ py: 4, pt: 12 }}>
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress color="secondary" />
                    </Box>
                )}
                {!loading && error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                {!loading && report && (
                    <>
                        <Breadcrumbs sx={{ mb: 3, fontSize: '0.875rem' }}>
                            <Box component={Link} to="/" sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                                Home
                            </Box>
                            <Box component={Link} to="/reports" sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                                Reports
                            </Box>
                            {report.sectors?.slug && (
                                <Box component={Link} to={`/sectors/${report.sectors.slug}`} sx={{ color: 'text.secondary', textDecoration: 'none' }}>
                                    {report.sectors.name}
                                </Box>
                            )}
                            <Typography variant="body2" color="text.primary" fontWeight={600}>
                                {report.title}
                            </Typography>
                        </Breadcrumbs>

                        {bannerImageUrls.length > 0 && (
                            <Box
                                sx={{
                                    mb: 4,
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    position: 'relative',
                                    height: { xs: 220, sm: 280, md: 340 },
                                    bgcolor: 'action.hover',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                }}
                            >
                                <Box
                                    component="img"
                                    key={bannerIndex}
                                    src={bannerImageUrls[bannerIndex]}
                                    alt=""
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        display: 'block',
                                        animation: 'reportBannerFadeIn 0.45s ease-out',
                                        '@keyframes reportBannerFadeIn': {
                                            from: { opacity: 0.35 },
                                            to: { opacity: 1 },
                                        },
                                    }}
                                />
                                {bannerImageUrls.length > 1 && (
                                    <Stack
                                        direction="row"
                                        spacing={0.75}
                                        justifyContent="center"
                                        sx={{
                                            position: 'absolute',
                                            bottom: 12,
                                            left: 0,
                                            right: 0,
                                            zIndex: 1,
                                        }}
                                    >
                                        {bannerImageUrls.map((_, i) => (
                                            <Box
                                                key={i}
                                                component="button"
                                                type="button"
                                                onClick={() => setBannerIndex(i)}
                                                aria-label={`Show image ${i + 1}`}
                                                sx={{
                                                    width: 8,
                                                    height: 8,
                                                    p: 0,
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    cursor: 'pointer',
                                                    bgcolor: i === bannerIndex ? 'common.white' : 'rgba(255,255,255,0.45)',
                                                    boxShadow: '0 0 0 1px rgba(0,0,0,0.12)',
                                                    transition: 'transform 0.15s ease, background-color 0.15s ease',
                                                    '&:hover': { transform: 'scale(1.15)', bgcolor: 'common.white' },
                                                }}
                                            />
                                        ))}
                                    </Stack>
                                )}
                            </Box>
                        )}

                        <Grid container spacing={6}>
                            <Grid size={{ xs: 12, lg: 7 }}>
                                <Stack spacing={3}>
                                    <Box>
                                        <Stack direction="row" gap={1} sx={{ mb: 2 }} flexWrap="wrap">
                                            {report.sectors?.name && (
                                                <Chip
                                                    avatar={
                                                        report.sectors.icon_image_url ? (
                                                            <Avatar alt="" src={report.sectors.icon_image_url} sx={{ width: 24, height: 24 }} />
                                                        ) : undefined
                                                    }
                                                    label={report.sectors.name}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            )}
                                            {entitled && <Chip label="In your library" size="small" color="success" variant="outlined" />}
                                        </Stack>
                                        <Typography variant="h3" sx={{ mb: 2, fontSize: { xs: '1.75rem', sm: '2.25rem' }, lineHeight: 1.2 }}>
                                            {report.title}
                                        </Typography>
                                        {report.summary && (
                                            <Typography variant="h6" color="text.secondary" fontWeight={400} sx={{ lineHeight: 1.6 }}>
                                                {report.summary}
                                            </Typography>
                                        )}
                                    </Box>
                                    {previewPdfLoading && (
                                        <Box sx={{ py: 2 }}>
                                            <CircularProgress size={28} color="secondary" />
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                                Loading preview…
                                            </Typography>
                                        </Box>
                                    )}
                                    {!entitled && previewPdfUrl && (
                                        <ReportFirstPagePdfPreview signedUrl={previewPdfUrl} title="Preview — page 1" />
                                    )}
                                    <Divider />
                                    {!entitled && report.status === 'published' && (
                                        <Card variant="outlined" sx={{ p: 3, borderStyle: 'dashed' }}>
                                            <Stack direction="row" gap={2} alignItems="flex-start">
                                                <LockIcon color="action" />
                                                <Box>
                                                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                                                        Full report
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                        Unlock the complete PDF and any bundled datasets. Entitlements are enforced server-side in production.
                                                    </Typography>
                                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                        <Button
                                                            component={Link}
                                                            to={user ? `/checkout?reportId=${report.id}` : '/login'}
                                                            state={user ? undefined : { redirectTo: `/checkout?reportId=${report.id}` }}
                                                            variant="contained"
                                                            color="secondary"
                                                            size="small"
                                                            disableElevation
                                                        >
                                                            {user ? 'Buy this report' : 'Sign in to purchase'}
                                                        </Button>
                                                        {report.sectors?.id && (
                                                            <Button
                                                                component={Link}
                                                                to={user ? `/checkout?sectorId=${report.sectors.id}` : '/login'}
                                                                state={user ? undefined : { redirectTo: `/checkout?sectorId=${report.sectors.id}` }}
                                                                variant="outlined"
                                                                color="secondary"
                                                                size="small"
                                                            >
                                                                Subscribe to sector
                                                            </Button>
                                                        )}
                                                    </Stack>
                                                </Box>
                                            </Stack>
                                        </Card>
                                    )}
                                </Stack>
                            </Grid>
                            <Grid size={{ xs: 12, lg: 5 }}>
                                <Box sx={{ position: 'sticky', top: '5rem' }}>
                                    <Card sx={{ overflow: 'hidden' }}>
                                        <Box sx={{ bgcolor: 'rgba(25,127,148,0.06)', p: 3, borderBottom: '1px solid #f1f5f9' }}>
                                            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, color: 'text.secondary' }}>
                                                Price
                                            </Typography>
                                            <Typography variant="h3" sx={{ mt: 0.5 }}>
                                                {priceLabel}
                                            </Typography>
                                        </Box>
                                        <CardContent sx={{ p: 3 }}>
                                            <Stack spacing={2}>
                                                {entitled && user ? (
                                                    <>
                                                        <Alert severity="success" sx={{ py: 0.5 }}>
                                                            You have access. Read the full report in the secure viewer — download is disabled.
                                                        </Alert>
                                                        <Button
                                                            fullWidth
                                                            variant="contained"
                                                            color="secondary"
                                                            size="large"
                                                            component={Link}
                                                            to={`/reports/${report.slug || report.id}/read`}
                                                            sx={{ py: 1.5 }}
                                                        >
                                                            Read full report
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            fullWidth
                                                            variant="contained"
                                                            color="secondary"
                                                            size="large"
                                                            disableElevation
                                                            component={Link}
                                                            to={user ? `/checkout?reportId=${report.id}` : '/login'}
                                                            state={user ? undefined : { redirectTo: `/checkout?reportId=${report.id}` }}
                                                            sx={{ py: 1.5 }}
                                                        >
                                                            Buy this report
                                                        </Button>
                                                        {report.sectors?.id && (
                                                            <Button
                                                                fullWidth
                                                                variant="outlined"
                                                                size="large"
                                                                component={Link}
                                                                to={user ? `/checkout?sectorId=${report.sectors.id}` : '/login'}
                                                                state={
                                                                    user ? undefined : { redirectTo: `/checkout?sectorId=${report.sectors.id}` }
                                                                }
                                                                sx={{ py: 1.5 }}
                                                            >
                                                                Subscribe to {report.sectors.name} sector
                                                            </Button>
                                                        )}
                                                        <Button fullWidth variant="outlined" color="secondary" component={Link} to="/pricing">
                                                            Compare sector subscriptions
                                                        </Button>
                                                        <Divider />
                                                        <Stack direction="row" gap={1} alignItems="center">
                                                            <PictureAsPdfIcon color="primary" fontSize="small" />
                                                            <Typography variant="body2" color="text.secondary">
                                                                Full PDF in secure viewer after your receipt is approved
                                                            </Typography>
                                                        </Stack>
                                                    </>
                                                )}
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Box>
                            </Grid>
                        </Grid>
                    </>
                )}
            </Container>
            <Footer />
        </Box>
    )
}
