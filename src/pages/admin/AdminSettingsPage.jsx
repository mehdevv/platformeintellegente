import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import { useAuth } from '../../context/AuthContext'
import { logAdminAction } from '../../lib/adminAudit'
import { emptyBankRib, getBankRib, isBankRibConfigured, saveBankRib } from '../../lib/platformSettings'

const FIELDS = [
    { key: 'bank_name', label: 'Bank name', required: true, placeholder: 'BNA, AGB, BEA, …' },
    { key: 'account_holder', label: 'Account holder (name on account)', required: true, placeholder: 'AEM Consulting' },
    { key: 'rib', label: 'RIB (20 digits)', required: false, placeholder: '0000 0000 0000 0000 0000', helper: 'Algerian RIB shown to clients on the checkout page.' },
    { key: 'iban', label: 'IBAN', required: false, placeholder: 'DZ00 0000 0000 0000 0000 0000' },
    { key: 'swift', label: 'SWIFT / BIC', required: false, placeholder: 'BNALDZAL' },
    { key: 'notes', label: 'Payment notes (shown on checkout)', required: false, multiline: true, placeholder: 'e.g. include the order id in the transfer reference.' },
]

export default function AdminSettingsPage() {
    const { supabase } = useAuth()
    const [values, setValues] = useState(() => emptyBankRib())
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [err, setErr] = useState('')
    const [notice, setNotice] = useState('')

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            if (!supabase) {
                setLoading(false)
                return
            }
            try {
                const v = await getBankRib(supabase)
                if (!cancelled) setValues(v)
            } catch (ex) {
                if (!cancelled) setErr(ex?.message || 'Could not load bank settings')
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [supabase])

    const update = (key, v) => setValues(prev => ({ ...prev, [key]: v }))

    const save = async () => {
        if (!supabase) return
        setSaving(true)
        setErr('')
        setNotice('')
        try {
            const saved = await saveBankRib(supabase, values)
            setValues(saved)
            await logAdminAction(supabase, { action: 'update', entityType: 'platform_settings', entityId: 'bank_rib' })
            setNotice('Bank details saved. They appear on the public checkout page immediately.')
        } catch (ex) {
            setErr(ex?.message || 'Save failed')
        } finally {
            setSaving(false)
        }
    }

    const configured = isBankRibConfigured(values)
    const canSave = values.bank_name.trim().length > 0 && values.account_holder.trim().length > 0

    return (
        <Stack spacing={3}>
            <Box>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
                    Settings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Manual bank-transfer details shown to clients on the checkout page. They are public (read-only for visitors) and editable only by admins.
                </Typography>
                <Button component={Link} to="/admin/ai" variant="outlined" color="secondary" size="small" sx={{ mt: 1.5 }}>
                    AI assistant settings →
                </Button>
            </Box>

            {err && <Alert severity="error">{err}</Alert>}
            {notice && <Alert severity="success">{notice}</Alert>}
            {!loading && !configured && (
                <Alert severity="warning">
                    Bank details are incomplete. Add at least <strong>Bank name</strong>, <strong>Account holder</strong>, and either a <strong>RIB</strong> or an <strong>IBAN</strong> so clients can transfer funds.
                </Alert>
            )}

            <Card variant="outlined" sx={{ p: 3, maxWidth: 720, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                    Bank RIB
                </Typography>
                {loading ? (
                    <Stack alignItems="center" py={3}>
                        <CircularProgress size={28} />
                    </Stack>
                ) : (
                    <Stack spacing={2}>
                        {FIELDS.map(f => (
                            <TextField
                                key={f.key}
                                label={f.label}
                                placeholder={f.placeholder}
                                required={f.required}
                                value={values[f.key] || ''}
                                onChange={e => update(f.key, e.target.value)}
                                size="small"
                                fullWidth
                                multiline={f.multiline || false}
                                minRows={f.multiline ? 2 : undefined}
                                helperText={f.helper}
                            />
                        ))}
                        <Stack direction="row" spacing={1}>
                            <Button variant="contained" color="secondary" disableElevation onClick={save} disabled={saving || !canSave}>
                                {saving ? 'Saving…' : 'Save bank details'}
                            </Button>
                        </Stack>
                    </Stack>
                )}
            </Card>
        </Stack>
    )
}
