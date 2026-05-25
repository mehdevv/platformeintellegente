import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import { useTranslation } from 'react-i18next'
import BrandLogo from '../components/BrandLogo'
import { MotionFadeInScale } from '../components/motion/Motion'
import { useAuth } from '../context/AuthContext'

export default function ForgotPasswordPage() {
    const { t } = useTranslation()
    const location = useLocation()
    const returnToLogin = location.state?.redirectTo || '/login'
    const { supabase, supabaseConfigured } = useAuth()
    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async e => {
        e.preventDefault()
        setMessage('')
        setError('')
        if (!supabase) {
            setError('Supabase is not configured.')
            return
        }
        setSubmitting(true)
        const path = returnToLogin.startsWith('/') ? returnToLogin : `/${returnToLogin}`
        const redirectTo = `${window.location.origin}${path}`
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
        setSubmitting(false)
        if (err) {
            setError(err.message)
            return
        }
        setMessage(t('forgotPassword.sentHint', { defaultValue: 'If an account exists, you will receive a reset link.' }))
    }

    return (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
            <MotionFadeInScale>
            <Paper className="card-lift" elevation={4} sx={{ width: '100%', maxWidth: 420, p: 4 }}>
                <Stack spacing={3} alignItems="center" sx={{ mb: 2 }}>
                    <BrandLogo />
                </Stack>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>{t('forgotPassword.title')}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('forgotPassword.subtitle')}</Typography>
                {!supabaseConfigured && <Alert severity="warning" sx={{ mb: 2 }}>Configure .env first.</Alert>}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
                <Stack component="form" spacing={2} onSubmit={handleSubmit}>
                    <TextField label={t('forgotPassword.email')} type="email" fullWidth required value={email} onChange={e => setEmail(e.target.value)} />
                    <Button type="submit" variant="contained" color="secondary" fullWidth sx={{ fontWeight: 700 }} disabled={submitting}>
                        {submitting ? '…' : t('forgotPassword.send')}
                    </Button>
                    <Button component={Link} to={returnToLogin} fullWidth sx={{ fontWeight: 600 }}>{t('forgotPassword.backToLogin')}</Button>
                </Stack>
            </Paper>
            </MotionFadeInScale>
        </Box>
    )
}
