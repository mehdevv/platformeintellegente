import React, { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import CircularProgress from '@mui/material/CircularProgress'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Divider from '@mui/material/Divider'
import AdminStorageUsage from '../../components/admin/AdminStorageUsage'
import AdminGoogleAnalyticsEmbed from '../../components/admin/AdminGoogleAnalyticsEmbed'
import { useAuth } from '../../context/AuthContext'
import { formatPriceFromCents } from '../../lib/moneyFormat'
import { enrichPaymentRowsWithBundleSectors, paymentRequestKindLabel } from '../../lib/paymentRequestDisplay'

function monthRangeIso() {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { startIso: start.toISOString(), endIso: end.toISOString(), label: start.toLocaleString(undefined, { month: 'long', year: 'numeric' }) }
}

function userLabel(p) {
    if (!p) return '—'
    return p.full_name || p.notification_email || p.id?.slice(0, 8) || '—'
}

const STATUS_CHIP = {
    pending: { label: 'Pending', color: 'warning' },
    approved: { label: 'Approved', color: 'success' },
    rejected: { label: 'Rejected', color: 'default' },
}

function formatRevenueCents(cents) {
    const c = Number(cents) || 0
    if (c <= 0) {
        try {
            return new Intl.NumberFormat(typeof navigator !== 'undefined' ? navigator.language : 'en-US', {
                style: 'currency',
                currency: 'DZD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(0)
        } catch {
            return '0.00 DZD'
        }
    }
    return formatPriceFromCents(c, 'DZD')
}

export default function AdminOverviewPage() {
    const { supabase } = useAuth()
    const [counts, setCounts] = useState({ profiles: 0, published: 0, sectors: 0, blogPublished: 0 })
    const [pendingPayments, setPendingPayments] = useState(0)
    const [revenueMonthCents, setRevenueMonthCents] = useState(0)
    const [recentPayments, setRecentPayments] = useState([])
    const [approvedHistory, setApprovedHistory] = useState([])
    const [newCorporateCount, setNewCorporateCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const monthLabel = useMemo(() => monthRangeIso().label, [])

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            if (!supabase) {
                setLoading(false)
                return
            }
            setError('')
            const { startIso, endIso } = monthRangeIso()

            const [
                rProfiles,
                rPublished,
                rSectors,
                rBlog,
                rPending,
                rMonthApproved,
                rRecent,
                rApprovedList,
                rCorporateNew,
            ] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'published'),
                supabase.from('sectors').select('*', { count: 'exact', head: true }).eq('is_published', true),
                supabase.from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
                supabase.from('payment_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase
                    .from('payment_requests')
                    .select('amount_cents')
                    .eq('status', 'approved')
                    .gte('reviewed_at', startIso)
                    .lte('reviewed_at', endIso),
                supabase
                    .from('payment_requests')
                    .select(
                        'id, kind, amount_cents, currency, status, created_at, reviewed_at, profiles:user_id ( id, full_name, notification_email ), reports:report_id ( title ), sectors:sector_id ( name )',
                    )
                    .order('created_at', { ascending: false })
                    .limit(15),
                supabase
                    .from('payment_requests')
                    .select(
                        'id, kind, amount_cents, currency, status, created_at, reviewed_at, profiles:user_id ( id, full_name, notification_email ), reports:report_id ( title ), sectors:sector_id ( name )',
                    )
                    .eq('status', 'approved')
                    .order('reviewed_at', { ascending: false, nullsFirst: false })
                    .limit(12),
                supabase.from('corporate_messages').select('*', { count: 'exact', head: true }).eq('status', 'new'),
            ])

            if (cancelled) return

            const err =
                rProfiles.error?.message ||
                rPublished.error?.message ||
                rSectors.error?.message ||
                rBlog.error?.message ||
                rPending.error?.message ||
                rMonthApproved.error?.message ||
                rRecent.error?.message ||
                rApprovedList.error?.message ||
                rCorporateNew.error?.message
            if (err) setError(err)

            const monthRows = rMonthApproved.data || []
            const revenueSum = monthRows.reduce((acc, r) => acc + (Number(r.amount_cents) || 0), 0)

            setCounts({
                profiles: rProfiles.count ?? 0,
                published: rPublished.count ?? 0,
                sectors: rSectors.count ?? 0,
                blogPublished: rBlog.count ?? 0,
            })
            setPendingPayments(rPending.count ?? 0)
            setRevenueMonthCents(revenueSum)
            const [recentEnriched, approvedEnriched] = await Promise.all([
                enrichPaymentRowsWithBundleSectors(supabase, rRecent.data || []),
                enrichPaymentRowsWithBundleSectors(supabase, rApprovedList.data || []),
            ])
            setRecentPayments(recentEnriched)
            setApprovedHistory(approvedEnriched)
            setNewCorporateCount(rCorporateNew.count ?? 0)
            setLoading(false)
        })()
        return () => {
            cancelled = true
        }
    }, [supabase])

    return (
        <Stack spacing={4}>
            <Box>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
                    Overview
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Catalogue counts, bank-transfer revenue (approved this month), and recent payment activity from Supabase.
                </Typography>
            </Box>
            {error && (
                <Typography variant="body2" color="error">
                    {error}
                </Typography>
            )}
            {loading ? (
                <Stack alignItems="center" py={4}>
                    <CircularProgress size={36} />
                </Stack>
            ) : (
                <>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                            <Card variant="outlined" sx={{ p: 3, borderRadius: 2, height: '100%' }}>
                                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                                    Published reports
                                </Typography>
                                <Typography variant="h5" fontWeight={800} sx={{ mt: 1 }}>
                                    {counts.published}
                                </Typography>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                            <Card variant="outlined" sx={{ p: 3, borderRadius: 2, height: '100%' }}>
                                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                                    Profiles
                                </Typography>
                                <Typography variant="h5" fontWeight={800} sx={{ mt: 1 }}>
                                    {counts.profiles}
                                </Typography>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                            <Card variant="outlined" sx={{ p: 3, borderRadius: 2, height: '100%', borderColor: 'secondary.light' }}>
                                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                                    Revenue ({monthLabel})
                                </Typography>
                                <Typography variant="h5" fontWeight={800} sx={{ mt: 1, color: 'secondary.dark' }}>
                                    {formatRevenueCents(revenueMonthCents)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, lineHeight: 1.5 }}>
                                    Sum of <strong>approved</strong> payment requests with review date in this calendar month (RIB flow).
                                </Typography>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                            <Card variant="outlined" sx={{ p: 3, borderRadius: 2, height: '100%' }}>
                                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                                    Pending payment reviews
                                </Typography>
                                <Typography variant="h5" fontWeight={800} sx={{ mt: 1 }}>
                                    {pendingPayments}
                                </Typography>
                                <Button component={RouterLink} to="/admin/payments" size="small" variant="outlined" color="secondary" sx={{ mt: 2, fontWeight: 700 }}>
                                    Open payments queue
                                </Button>
                            </Card>
                        </Grid>
                    </Grid>

                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', height: '100%' }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                    <Typography variant="subtitle1" fontWeight={800}>
                                        Recent payments
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Last 15 by submission
                                    </Typography>
                                </Stack>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>When</TableCell>
                                            <TableCell>User</TableCell>
                                            <TableCell>Item</TableCell>
                                            <TableCell>Amount</TableCell>
                                            <TableCell>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {recentPayments.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5}>
                                                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                                        No payment requests yet.
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            recentPayments.map(row => {
                                                const chip = STATUS_CHIP[row.status] || { label: row.status, color: 'default' }
                                                return (
                                                    <TableRow key={row.id}>
                                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(row.created_at).toLocaleString()}</TableCell>
                                                        <TableCell>{userLabel(row.profiles)}</TableCell>
                                                        <TableCell>{paymentRequestKindLabel(row)}</TableCell>
                                                        <TableCell>{formatPriceFromCents(row.amount_cents, row.currency || 'DZD') || '—'}</TableCell>
                                                        <TableCell>
                                                            <Chip size="small" label={chip.label} color={chip.color} variant={row.status === 'rejected' ? 'outlined' : 'filled'} />
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', height: '100%' }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                    <Typography variant="subtitle1" fontWeight={800}>
                                        Purchase history
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Latest approved (RIB)
                                    </Typography>
                                </Stack>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Approved</TableCell>
                                            <TableCell>User</TableCell>
                                            <TableCell>Item</TableCell>
                                            <TableCell>Amount</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {approvedHistory.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4}>
                                                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                                        No approved payments yet.
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            approvedHistory.map(row => (
                                                <TableRow key={row.id}>
                                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                        {row.reviewed_at ? new Date(row.reviewed_at).toLocaleString() : '—'}
                                                    </TableCell>
                                                    <TableCell>{userLabel(row.profiles)}</TableCell>
                                                    <TableCell>{paymentRequestKindLabel(row)}</TableCell>
                                                    <TableCell>{formatPriceFromCents(row.amount_cents, row.currency || 'DZD') || '—'}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </Card>
                        </Grid>
                    </Grid>

                    <Card variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
                            Quick snapshot
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                    Published sectors
                                </Typography>
                                <Typography variant="h6" fontWeight={700}>
                                    {counts.sectors}
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                    Published blog posts
                                </Typography>
                                <Typography variant="h6" fontWeight={700}>
                                    {counts.blogPublished}
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                    Payment queue
                                </Typography>
                                <Typography variant="h6" fontWeight={700}>
                                    {pendingPayments} pending
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                    Corporate inbox
                                </Typography>
                                <Typography variant="h6" fontWeight={700}>
                                    {newCorporateCount} new
                                </Typography>
                                <Button component={RouterLink} to="/admin/corporate" size="small" variant="outlined" color="secondary" sx={{ mt: 1, fontWeight: 700 }}>
                                    Open inbox
                                </Button>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                    Audit trail
                                </Typography>
                                <Button component={RouterLink} to="/admin/audit" size="small" sx={{ mt: 0.5, fontWeight: 700 }}>
                                    View audit log
                                </Button>
                            </Grid>
                        </Grid>
                        <Divider sx={{ my: 2 }} />
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
                            <Button component={RouterLink} to="/admin/reports" variant="outlined" size="small">
                                Reports
                            </Button>
                            <Button component={RouterLink} to="/admin/sectors" variant="outlined" size="small">
                                Sectors
                            </Button>
                            <Button component={RouterLink} to="/admin/blog" variant="outlined" size="small">
                                Blog
                            </Button>
                            <Button component={RouterLink} to="/admin/ai" variant="outlined" size="small">
                                AI assistant
                            </Button>
                            <Button component={RouterLink} to="/admin/settings" variant="outlined" size="small">
                                Bank RIB
                            </Button>
                            <Button component={RouterLink} to="/admin/corporate" variant="outlined" size="small">
                                Corporate inbox
                            </Button>
                        </Stack>
                    </Card>
                </>
            )}
            <AdminGoogleAnalyticsEmbed />
            <Card variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                    Project storage (Supabase)
                </Typography>
                <Box sx={{ mt: 2, maxWidth: 480 }}>
                    <AdminStorageUsage variant="card" />
                </Box>
            </Card>
        </Stack>
    )
}
