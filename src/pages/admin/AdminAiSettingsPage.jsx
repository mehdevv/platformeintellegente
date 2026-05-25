import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Checkbox from '@mui/material/Checkbox'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import { useAuth } from '../../context/AuthContext'
import { logAdminAction } from '../../lib/adminAudit'
import { fetchAdminAiOverview } from '../../lib/adminAiApi'
import { getFreshAccessToken } from '../../lib/supabaseSession'
import {
    DEFAULT_AI_SETTINGS,
    PLAN_TIERS,
    getAiSettings,
    normalizeAiSettings,
    saveAiSettings,
} from '../../lib/aiPlatformSettings'

function StatCard({ label, value, sub }) {
    return (
        <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.06em' }}>
                {label}
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
                {value}
            </Typography>
            {sub && (
                <Typography variant="caption" color="text.secondary">
                    {sub}
                </Typography>
            )}
        </Card>
    )
}

function ServiceChip({ ok, label }) {
    return <Chip size="small" label={label} color={ok ? 'success' : 'default'} variant={ok ? 'filled' : 'outlined'} />
}

export default function AdminAiSettingsPage() {
    const { supabase } = useAuth()
    const [settings, setSettings] = useState(() => normalizeAiSettings(DEFAULT_AI_SETTINGS))
    const [unlimitedCorporate, setUnlimitedCorporate] = useState(true)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [overview, setOverview] = useState(null)
    const [overviewLoading, setOverviewLoading] = useState(true)
    const [err, setErr] = useState('')
    const [notice, setNotice] = useState('')
    const [updatedAt, setUpdatedAt] = useState(null)

    const getAccessToken = useCallback(() => getFreshAccessToken(supabase), [supabase])

    const loadSettings = useCallback(async () => {
        if (!supabase) {
            setLoading(false)
            return
        }
        const { settings: s, updated_at } = await getAiSettings(supabase)
        setSettings(s)
        setUnlimitedCorporate(s.message_limits.corporate == null)
        setUpdatedAt(updated_at)
    }, [supabase])

    const loadOverview = useCallback(async () => {
        setOverviewLoading(true)
        try {
            const data = await fetchAdminAiOverview(getAccessToken)
            setOverview(data)
        } catch (ex) {
            console.error('admin ai overview', ex)
            setOverview(null)
        } finally {
            setOverviewLoading(false)
        }
    }, [getAccessToken])

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                await Promise.all([loadSettings(), loadOverview()])
            } catch (ex) {
                if (!cancelled) setErr(ex?.message || 'Could not load AI settings')
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [loadSettings, loadOverview])

    const patch = (key, value) => setSettings(prev => ({ ...prev, [key]: value }))

    const patchLimit = (tier, value) => {
        setSettings(prev => ({
            ...prev,
            message_limits: { ...prev.message_limits, [tier]: value },
        }))
    }

    const save = async () => {
        if (!supabase) return
        setSaving(true)
        setErr('')
        setNotice('')
        try {
            const toSave = normalizeAiSettings({
                ...settings,
                message_limits: {
                    ...settings.message_limits,
                    corporate: unlimitedCorporate ? null : settings.message_limits.corporate,
                },
            })
            const saved = await saveAiSettings(supabase, toSave)
            setSettings(saved)
            setUnlimitedCorporate(saved.message_limits.corporate == null)
            await logAdminAction(supabase, {
                action: 'update',
                entityType: 'platform_settings',
                entityId: 'ai_settings',
            })
            setNotice('AI settings saved. Limits apply within ~1 minute on the API; users see new quotas immediately.')
            await loadOverview()
        } catch (ex) {
            setErr(ex?.message || 'Save failed')
        } finally {
            setSaving(false)
        }
    }

    const services = overview?.services || {}
    const stats = overview?.stats || {}

    return (
        <Stack spacing={3}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="flex-start" gap={2}>
                <Box>
                    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
                        <SmartToyIcon color="secondary" />
                        <Typography variant="h5" fontWeight={800}>
                            AI assistant
                        </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                        Control chat limits, RAG retrieval, web fallback, and monitor usage. API keys stay on Railway (
                        <code>GROQ_API_KEY</code>, <code>GOOGLE_API_KEY</code>).
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button component={Link} to="/admin/reports" variant="outlined" size="small">
                        Reports & indexing
                    </Button>
                    <Button component={Link} to="/admin/settings" variant="outlined" size="small">
                        Bank settings
                    </Button>
                </Stack>
            </Stack>

            {err && <Alert severity="error">{err}</Alert>}
            {notice && <Alert severity="success">{notice}</Alert>}

            <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                    API services
                </Typography>
                {overviewLoading ? (
                    <CircularProgress size={22} />
                ) : (
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                        <ServiceChip ok={services.groq} label="Groq (chat)" />
                        <ServiceChip ok={services.embeddings} label="Google (embeddings)" />
                        <ServiceChip ok={services.supabase} label="Supabase" />
                        <ServiceChip
                            ok={services.web_search_env && settings.web_search_enabled}
                            label="Web search"
                        />
                        <ServiceChip ok={services.tavily} label="Tavily (optional)" />
                        <ServiceChip ok={settings.chat_enabled} label={settings.chat_enabled ? 'Chat on' : 'Chat off'} />
                    </Stack>
                )}
            </Card>

            <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                    <StatCard label="Conversations" value={stats.conversations ?? '—'} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                    <StatCard label="Stored messages" value={stats.messages ?? '—'} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                    <StatCard label="AI messages (month)" value={stats.ai_messages_this_month ?? '—'} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                    <StatCard
                        label="Indexed reports"
                        value={stats.indexed_reports ?? '—'}
                        sub={`${stats.report_chunks ?? 0} chunks`}
                    />
                </Grid>
            </Grid>

            {loading ? (
                <Stack alignItems="center" py={4}>
                    <CircularProgress />
                </Stack>
            ) : (
                <>
                    <Card variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                            General
                        </Typography>
                        <Stack spacing={2}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.chat_enabled}
                                        onChange={e => patch('chat_enabled', e.target.checked)}
                                        color="secondary"
                                    />
                                }
                                label="AI chat enabled for users"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.web_search_enabled}
                                        onChange={e => patch('web_search_enabled', e.target.checked)}
                                        color="secondary"
                                    />
                                }
                                label="Web search when user has no reports in library"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.charts_enabled}
                                        onChange={e => patch('charts_enabled', e.target.checked)}
                                        color="secondary"
                                    />
                                }
                                label="Allow charts & tables in answers (model instructed + UI render)"
                            />
                            <TextField
                                label="Groq model override (optional)"
                                placeholder="llama-3.3-70b-versatile"
                                value={settings.groq_chat_model}
                                onChange={e => patch('groq_chat_model', e.target.value)}
                                size="small"
                                fullWidth
                                helperText="Leave empty to use the Railway default model."
                            />
                            <TextField
                                label="Temperature"
                                type="number"
                                inputProps={{ min: 0, max: 1, step: 0.05 }}
                                value={settings.temperature}
                                onChange={e => patch('temperature', e.target.value)}
                                size="small"
                                sx={{ maxWidth: 160 }}
                            />
                        </Stack>
                    </Card>

                    <Card variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                            Monthly message limits (per user)
                        </Typography>
                        <Grid container spacing={2}>
                            {PLAN_TIERS.filter(t => t !== 'corporate').map(tier => (
                                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={tier}>
                                    <TextField
                                        label={tier.charAt(0).toUpperCase() + tier.slice(1)}
                                        type="number"
                                        size="small"
                                        fullWidth
                                        value={settings.message_limits[tier] ?? ''}
                                        onChange={e => patchLimit(tier, e.target.value === '' ? 0 : Number(e.target.value))}
                                    />
                                </Grid>
                            ))}
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Stack spacing={1}>
                                    <TextField
                                        label="Corporate"
                                        type="number"
                                        size="small"
                                        fullWidth
                                        disabled={unlimitedCorporate}
                                        value={unlimitedCorporate ? '' : settings.message_limits.corporate ?? ''}
                                        onChange={e =>
                                            patchLimit('corporate', e.target.value === '' ? 0 : Number(e.target.value))
                                        }
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={unlimitedCorporate}
                                                onChange={e => setUnlimitedCorporate(e.target.checked)}
                                                size="small"
                                            />
                                        }
                                        label="Unlimited"
                                    />
                                </Stack>
                            </Grid>
                        </Grid>
                    </Card>

                    <Card variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                            RAG & web retrieval
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    label="Chunks per query (top K)"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    value={settings.rag_top_k}
                                    onChange={e => patch('rag_top_k', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    label="Max report context (chars)"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    value={settings.rag_max_context_chars}
                                    onChange={e => patch('rag_max_context_chars', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    label="Web results count"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    value={settings.web_search_max_results}
                                    onChange={e => patch('web_search_max_results', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    label="Max web context (chars)"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    value={settings.web_search_max_context_chars}
                                    onChange={e => patch('web_search_max_context_chars', e.target.value)}
                                />
                            </Grid>
                        </Grid>
                    </Card>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button variant="contained" color="secondary" disableElevation onClick={save} disabled={saving}>
                            {saving ? 'Saving…' : 'Save AI settings'}
                        </Button>
                        <Button variant="outlined" onClick={loadOverview} disabled={overviewLoading}>
                            Refresh stats
                        </Button>
                        {updatedAt && (
                            <Typography variant="caption" color="text.secondary">
                                Last saved {new Date(updatedAt).toLocaleString()}
                            </Typography>
                        )}
                    </Stack>
                </>
            )}

            <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                        Recent AI usage events
                    </Typography>
                </Box>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>User</TableCell>
                            <TableCell>When</TableCell>
                            <TableCell>Meta</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(overview?.recent_usage || []).length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3}>
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                        No AI usage events yet.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            overview.recent_usage.map(row => (
                                <TableRow key={row.id}>
                                    <TableCell>{row.user_label}</TableCell>
                                    <TableCell>
                                        {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                            {JSON.stringify(row.metadata || {})}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </Stack>
    )
}
