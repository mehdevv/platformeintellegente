import { Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Avatar from '@mui/material/Avatar'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { useTranslation } from 'react-i18next'
import { formatPriceFromCents } from '../../lib/moneyFormat'
import { reportPublicPath } from '../../lib/reportPath'
import MotionCard from '../motion/MotionCard'

/**
 * @param {{ report: object, owned?: boolean }} props
 */
export default function ReportCatalogCard({ report, owned = false }) {
    const { t } = useTranslation()
    const priceLabel =
        (report.price_cents ?? 0) > 0 ? formatPriceFromCents(report.price_cents, report.currency || 'DZD') : t('common.free')
    const date = report.published_at
        ? new Date(report.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
        : ''

    return (
        <MotionCard>
        <Card
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: 2,
                border: '1px solid',
                borderColor: owned ? 'secondary.main' : 'divider',
                boxShadow: owned ? '0 4px 20px rgba(25, 127, 148, 0.12)' : '0 1px 3px rgba(26, 35, 50, 0.06)',
                bgcolor: owned ? 'rgba(25, 127, 148, 0.03)' : 'background.paper',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                '&:hover': {
                    borderColor: 'secondary.main',
                    '& .report-catalog-title': { color: 'secondary.dark' },
                },
            }}
        >
            <Box
                component={Link}
                to={reportPublicPath(report)}
                sx={{
                    position: 'relative',
                    aspectRatio: '16/10',
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, #4B5B72 0%, #197F94 100%)',
                    textDecoration: 'none',
                    display: 'block',
                }}
            >
                {report.thumbnail_image_url ? (
                    <Box
                        component="img"
                        src={report.thumbnail_image_url}
                        alt=""
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 56, color: 'rgba(255,255,255,0.22)' }}>
                            analytics
                        </span>
                    </Box>
                )}
                <Box
                    aria-hidden
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, transparent 40%, rgba(15,23,42,0.5) 100%)',
                        pointerEvents: 'none',
                    }}
                />
                <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ position: 'absolute', top: 10, left: 10, zIndex: 2, maxWidth: 'calc(100% - 20px)' }}>
                    {report.sectors?.name && (
                        <Chip
                            avatar={
                                report.sectors.icon_image_url ? (
                                    <Avatar alt="" src={report.sectors.icon_image_url} sx={{ width: 20, height: 20 }} />
                                ) : undefined
                            }
                            label={report.sectors.name}
                            size="small"
                            sx={{ bgcolor: 'rgba(255,255,255,0.92)', fontWeight: 700, fontSize: '0.7rem', height: 24 }}
                        />
                    )}
                </Stack>
                {owned ? (
                    <Chip
                        icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                        label={t('reportsListing.owned')}
                        size="small"
                        color="success"
                        sx={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            zIndex: 2,
                            fontWeight: 800,
                            fontSize: '0.7rem',
                            height: 26,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        }}
                    />
                ) : (report.price_cents ?? 0) > 0 ? (
                    <Chip
                        icon={<LockOutlinedIcon sx={{ fontSize: '13px !important' }} />}
                        label={priceLabel}
                        size="small"
                        sx={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            zIndex: 2,
                            bgcolor: 'rgba(255,255,255,0.92)',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            height: 26,
                        }}
                    />
                ) : (
                    <Chip
                        label={t('common.free')}
                        size="small"
                        color="success"
                        sx={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            zIndex: 2,
                            fontWeight: 800,
                            fontSize: '0.7rem',
                            height: 26,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        }}
                    />
                )}
            </Box>

            <Box sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {date && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.75, letterSpacing: '0.04em' }}>
                        {date}
                    </Typography>
                )}
                <Typography
                    className="report-catalog-title"
                    component={Link}
                    to={reportPublicPath(report)}
                    variant="subtitle1"
                    sx={{
                        fontFamily: '"League Spartan", sans-serif',
                        fontWeight: 800,
                        lineHeight: 1.3,
                        mb: 1,
                        flexGrow: 1,
                        color: 'text.primary',
                        textDecoration: 'none',
                        display: 'block',
                    }}
                >
                    {report.title}
                </Typography>
                {report.summary && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            mb: 2,
                            lineHeight: 1.55,
                            fontSize: '0.8125rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                        }}
                    >
                        {report.summary}
                    </Typography>
                )}
                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ mt: 'auto', pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                    {!owned && (
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                            {priceLabel}
                        </Typography>
                    )}
                    {owned && (
                        <Typography variant="caption" color="success.main" fontWeight={700}>
                            {t('reportsListing.ownedHint')}
                        </Typography>
                    )}
                    <Stack direction="row" spacing={0.75}>
                        {owned && (
                            <Button
                                component={Link}
                                to={`${reportPublicPath(report)}/read`}
                                size="small"
                                variant="contained"
                                color="secondary"
                                startIcon={<MenuBookIcon sx={{ fontSize: 16 }} />}
                                sx={{ fontWeight: 700, fontSize: '0.75rem', py: 0.5 }}
                                onClick={e => e.stopPropagation()}
                            >
                                {t('reportsListing.read')}
                            </Button>
                        )}
                        <Button
                            component={Link}
                            to={reportPublicPath(report)}
                            size="small"
                            variant={owned ? 'outlined' : 'contained'}
                            color="secondary"
                            endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                            sx={{ fontWeight: 700, fontSize: '0.75rem', py: 0.5 }}
                        >
                            {owned ? t('reportsListing.details') : t('reportsListing.view')}
                        </Button>
                    </Stack>
                </Stack>
            </Box>
        </Card>
        </MotionCard>
    )
}
