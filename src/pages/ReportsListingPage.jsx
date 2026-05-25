import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import FilterListIcon from '@mui/icons-material/FilterList'
import CloseIcon from '@mui/icons-material/Close'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ReportCatalogCard from '../components/reports/ReportCatalogCard'
import ReportCatalogFilters from '../components/reports/ReportCatalogFilters'
import { MotionFadeInUp, MotionInView, MotionStagger, MotionStaggerItem } from '../components/motion/Motion'
import { useAuth } from '../context/AuthContext'
import { fetchUserOwnedReportAccess, isReportOwned } from '../lib/reportAccess'
import { reportPassesCatalogFilters } from '../lib/reportCatalogFilter'
import { usePriceRangeUnits } from '../hooks/usePriceRangeUnits'

const drawerWidth = 280

function FiltersPanel({
    sectors,
    selectedSectorSlugs,
    onToggleSector,
    onSelectAllSectors,
    onClearSectors,
    priceRangeUnits,
    onPriceRangeChange,
    maxPriceUnit,
    onClose,
    t,
}) {
    return (
        <Stack spacing={3}>
            {onClose && (
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight={800}>
                        {t('reportsListing.filtersTitle')}
                    </Typography>
                    <IconButton onClick={onClose} size="small" aria-label="Close filters">
                        <CloseIcon />
                    </IconButton>
                </Stack>
            )}
            <ReportCatalogFilters
                sectors={sectors}
                selectedSectorSlugs={selectedSectorSlugs}
                onToggleSector={onToggleSector}
                onSelectAllSectors={onSelectAllSectors}
                onClearSectors={onClearSectors}
                priceRangeUnits={priceRangeUnits}
                onPriceRangeChange={onPriceRangeChange}
                maxPriceUnit={maxPriceUnit}
            />
            <Button component={Link} to="/pricing" variant="outlined" color="secondary" size="small" fullWidth>
                {t('reportsListing.browsePricing')}
            </Button>
            <Button component={Link} to="/dashboard/library" variant="outlined" size="small" fullWidth>
                {t('nav.myReports')}
            </Button>
        </Stack>
    )
}

export default function ReportsListingPage() {
    const { t } = useTranslation()
    const location = useLocation()
    const { supabase, user } = useAuth()
    const [reports, setReports] = useState([])
    const [access, setAccess] = useState({ ownedReportIds: new Set(), ownedSectorIds: new Set() })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
    const [libraryFilter, setLibraryFilter] = useState('all')
    const [selectedSectorSlugs, setSelectedSectorSlugs] = useState(() => new Set())
    const [sort, setSort] = useState('newest')

    const { priceRangeUnits, setPriceRangeUnits, maxPriceUnit } = usePriceRangeUnits(reports)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            if (!supabase) {
                setLoading(false)
                return
            }
            setError('')
            const { data, error: e } = await supabase
                .from('reports')
                .select('id, slug, title, summary, status, price_cents, currency, published_at, thumbnail_image_url, sector_id, sectors(name, slug, icon_image_url)')
                .eq('status', 'published')
                .order('published_at', { ascending: false, nullsFirst: false })
            if (cancelled) return
            if (e) setError(e.message)
            else setReports(data || [])
            setLoading(false)
        })()
        return () => {
            cancelled = true
        }
    }, [supabase])

    const refreshOwnedAccess = useCallback(async () => {
        if (!user) {
            setAccess({ ownedReportIds: new Set(), ownedSectorIds: new Set() })
            return
        }
        setAccess(await fetchUserOwnedReportAccess(supabase, user.id))
    }, [supabase, user])

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            if (cancelled) return
            await refreshOwnedAccess()
        })()
        return () => {
            cancelled = true
        }
    }, [refreshOwnedAccess, location.pathname])

    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') refreshOwnedAccess()
        }
        document.addEventListener('visibilitychange', onVisible)
        window.addEventListener('focus', onVisible)
        return () => {
            document.removeEventListener('visibilitychange', onVisible)
            window.removeEventListener('focus', onVisible)
        }
    }, [refreshOwnedAccess])

    const sectors = useMemo(() => {
        const map = new Map()
        for (const r of reports) {
            if (r.sectors?.slug && r.sectors?.name) map.set(r.sectors.slug, r.sectors.name)
        }
        return [...map.entries()].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name))
    }, [reports])

    const reportsWithOwned = useMemo(
        () => reports.map(r => ({ ...r, owned: isReportOwned(r, access) })),
        [reports, access],
    )

    const ownedCount = useMemo(() => reportsWithOwned.filter(r => r.owned).length, [reportsWithOwned])

    const toggleSector = useCallback(slug => {
        setSelectedSectorSlugs(prev => {
            const next = new Set(prev)
            if (next.has(slug)) next.delete(slug)
            else next.add(slug)
            return next
        })
    }, [])

    const selectAllSectors = useCallback(() => {
        setSelectedSectorSlugs(new Set(sectors.map(s => s.slug)))
    }, [sectors])

    const clearSectors = useCallback(() => {
        setSelectedSectorSlugs(new Set())
    }, [])

    const filteredReports = useMemo(() => {
        let list = reportsWithOwned.filter(r =>
            reportPassesCatalogFilters(r, { selectedSectorSlugs, priceRangeUnits, catalogMaxPriceUnit: maxPriceUnit }),
        )
        if (libraryFilter === 'owned') list = list.filter(r => r.owned)
        if (libraryFilter === 'available') list = list.filter(r => !r.owned)

        list.sort((a, b) => {
            if (sort === 'ownedFirst' && user) {
                if (a.owned !== b.owned) return a.owned ? -1 : 1
            }
            if (sort === 'title') return (a.title || '').localeCompare(b.title || '')
            const ta = a.published_at ? new Date(a.published_at).getTime() : 0
            const tb = b.published_at ? new Date(b.published_at).getTime() : 0
            return tb - ta
        })
        return list
    }, [reportsWithOwned, selectedSectorSlugs, priceRangeUnits, maxPriceUnit, libraryFilter, sort, user])

    return (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header />
            <Drawer anchor="left" open={mobileFiltersOpen} onClose={() => setMobileFiltersOpen(false)} PaperProps={{ sx: { width: 300, p: 3, pt: 4 } }}>
                <FiltersPanel
                    sectors={sectors}
                    selectedSectorSlugs={selectedSectorSlugs}
                    onToggleSector={toggleSector}
                    onSelectAllSectors={selectAllSectors}
                    onClearSectors={clearSectors}
                    priceRangeUnits={priceRangeUnits}
                    onPriceRangeChange={setPriceRangeUnits}
                    maxPriceUnit={maxPriceUnit}
                    onClose={() => setMobileFiltersOpen(false)}
                    t={t}
                />
            </Drawer>

            <MotionInView>
                <Box
                    sx={{
                        pt: 10,
                        px: { xs: 2, md: 4 },
                        pb: 4,
                        background: 'linear-gradient(180deg, #fff 0%, #EBECF1 100%)',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <ContainerWrap>
                        <Breadcrumbs sx={{ mb: 1.5, fontSize: '0.75rem' }}>
                            <Box component={Link} to="/" sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'secondary.main' } }}>
                                Home
                            </Box>
                            <Typography variant="caption" color="text.primary" fontWeight={600}>
                                {t('nav.reports')}
                            </Typography>
                        </Breadcrumbs>
                        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-end' }} gap={2}>
                            <Box sx={{ maxWidth: 640 }}>
                                <Typography variant="overline" color="secondary.main" sx={{ fontWeight: 800, letterSpacing: '0.1em' }}>
                                    {t('reportsListing.overline')}
                                </Typography>
                                <Typography variant="h3" sx={{ fontFamily: '"League Spartan", sans-serif', fontWeight: 800, fontSize: { xs: '1.75rem', md: '2.5rem' }, mb: 1 }}>
                                    {t('reportsListing.title')}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                                    {t('reportsListing.subtitle')}
                                </Typography>
                            </Box>
                            {!loading && (
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <Chip label={t('reportsListing.total', { count: reports.length })} variant="outlined" />
                                    {user && ownedCount > 0 && (
                                        <Chip
                                            icon={<LibraryBooksIcon sx={{ fontSize: 16 }} />}
                                            label={t('reportsListing.ownedCount', { count: ownedCount })}
                                            color="success"
                                            variant="outlined"
                                        />
                                    )}
                                </Stack>
                            )}
                        </Stack>
                    </ContainerWrap>
                </Box>
            </MotionInView>

            <Box sx={{ display: 'flex', flex: 1, maxWidth: '100%', px: { lg: 4 } }}>
                <Drawer
                    variant="permanent"
                    sx={{
                        width: drawerWidth,
                        flexShrink: 0,
                        display: { xs: 'none', lg: 'block' },
                        '& .MuiDrawer-paper': {
                            width: drawerWidth,
                            position: 'sticky',
                            top: 72,
                            height: 'auto',
                            maxHeight: 'calc(100vh - 88px)',
                            bgcolor: 'transparent',
                            borderRight: '1px solid',
                            borderColor: 'divider',
                            p: 3,
                            boxSizing: 'border-box',
                        },
                    }}
                >
                    <FiltersPanel
                        sectors={sectors}
                        selectedSectorSlugs={selectedSectorSlugs}
                        onToggleSector={toggleSector}
                        onSelectAllSectors={selectAllSectors}
                        onClearSectors={clearSectors}
                        priceRangeUnits={priceRangeUnits}
                        onPriceRangeChange={setPriceRangeUnits}
                        maxPriceUnit={maxPriceUnit}
                        t={t}
                    />
                </Drawer>

                <Box component="main" sx={{ flexGrow: 1, py: { xs: 3, md: 4 }, pl: { lg: 3 }, pr: { xs: 0, md: 1 }, minWidth: 0 }}>
                    <ContainerWrap>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ sm: 'center' }}
                            gap={2}
                            sx={{ mb: 3 }}
                        >
                            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" useFlexGap>
                                {user ? (
                                    <ToggleButtonGroup
                                        size="small"
                                        value={libraryFilter}
                                        exclusive
                                        onChange={(_, v) => v && setLibraryFilter(v)}
                                        sx={{ flexWrap: 'wrap' }}
                                    >
                                        <ToggleButton value="all">{t('reportsListing.filterAll')}</ToggleButton>
                                        <ToggleButton value="owned">{t('reportsListing.filterOwned')}</ToggleButton>
                                        <ToggleButton value="available">{t('reportsListing.filterAvailable')}</ToggleButton>
                                    </ToggleButtonGroup>
                                ) : (
                                    <Typography variant="caption" color="text.secondary">
                                        {t('reportsListing.signInLibrary')}{' '}
                                        <Box component={Link} to="/login" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                                            {t('common.login')}
                                </Box>
                                </Typography>
                                )}
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<FilterListIcon />}
                                    onClick={() => setMobileFiltersOpen(true)}
                                    sx={{ display: { lg: 'none' } }}
                                >
                                    {t('reportsListing.filtersTitle')}
                                </Button>
                            </Stack>
                            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
                                <Select value={sort} onChange={e => setSort(e.target.value)} displayEmpty>
                                    <MenuItem value="newest">{t('reportsListing.sortNewest')}</MenuItem>
                                    <MenuItem value="title">{t('reportsListing.sortTitle')}</MenuItem>
                                    {user && <MenuItem value="ownedFirst">{t('reportsListing.sortOwnedFirst')}</MenuItem>}
                            </Select>
                        </FormControl>
                    </Stack>

                    {loading && (
                            <Stack alignItems="center" py={10}>
                            <CircularProgress color="secondary" />
                            </Stack>
                        )}
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                        {!loading && !reports.length && !error && (
                            <Alert severity="info">{t('home.featuredReportsEmpty')}</Alert>
                        )}
                        {!loading && reports.length > 0 && filteredReports.length === 0 && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                {libraryFilter === 'owned'
                                    ? t('reportsListing.emptyOwned')
                                    : libraryFilter === 'available'
                                      ? t('reportsListing.emptyAvailable')
                                      : t('sectorsListing.noReportsMatch')}
                        </Alert>
                    )}

                        {!loading && filteredReports.length > 0 && (
                            <MotionFadeInUp>
                                <MotionStagger
                                    key={filteredReports.map(r => r.id).join(',')}
                                    style={{ width: '100%' }}
                                >
                    <Grid container spacing={3}>
                                        {filteredReports.map(r => (
                                            <Grid key={r.id} size={{ xs: 12, sm: 6, xl: 4 }}>
                                                <MotionStaggerItem style={{ height: '100%' }}>
                                                    <ReportCatalogCard report={r} owned={r.owned} />
                                                </MotionStaggerItem>
                            </Grid>
                        ))}
                    </Grid>
                                </MotionStagger>
                            </MotionFadeInUp>
                        )}
                    </ContainerWrap>
                </Box>
            </Box>
            <Footer />
        </Box>
    )
}

function ContainerWrap({ children }) {
    return (
        <Box sx={{ maxWidth: 1280, mx: 'auto', width: '100%', px: { xs: 0, sm: 1 } }}>{children}</Box>
    )
}
