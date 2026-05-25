import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Alert from '@mui/material/Alert'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { useTranslation } from 'react-i18next'
import BrandLogo from '../components/BrandLogo'
import { MotionFadeInScale } from '../components/motion/Motion'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { t } = useTranslation()
    const { supabase, supabaseConfigured, user, loading } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const from = location.state?.from || '/dashboard'

    useEffect(() => {
        if (!loading && user) navigate(from, { replace: true })
    }, [loading, user, navigate, from])

    const handleSubmit = async e => {
        e.preventDefault()
        setError('')
        if (!supabase) {
            setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env')
            return
        }
        setSubmitting(true)
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        setSubmitting(false)
        if (err) {
            setError(err.message)
            return
        }
        navigate(from, { replace: true })
    }

    return (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 3, py: 2 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                    {t('common.back')}
                </Button>
            </Box>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
                <MotionFadeInScale>
                <Paper className="card-lift" elevation={4} sx={{ width: '100%', maxWidth: 440, overflow: 'hidden', borderRadius: 3 }}>
                    <Box sx={{ height: 128, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                        <Box sx={{ position: 'absolute', inset: 0, opacity: 0.2, background: 'radial-gradient(circle, rgba(255,255,255,0.4), transparent)' }} />
                        <Box sx={{ position: 'relative', zIndex: 1 }}>
                            <BrandLogo variant="onDark" />
                        </Box>
                    </Box>
                    <Box sx={{ p: 4 }}>
                        <Box sx={{ textAlign: 'center', mb: 4 }}>
                            <Typography variant="h5" sx={{ mb: 1 }}>
                                {t('auth.welcomeBack')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {t('auth.loginSub')}
                            </Typography>
                        </Box>
                        {!supabaseConfigured && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                Missing Supabase env vars. In the <strong>researcha-app</strong> folder, copy <code>.env.example</code> to{' '}
                                <code>.env</code>, set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then{' '}
                                <strong>stop and restart</strong> <code>npm run dev</code> (Vite only reads .env at startup).
                            </Alert>
                        )}
                        {location.state?.reason === 'no_supabase' && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                Configure Supabase in .env to use the dashboard and admin.
                            </Alert>
                        )}
                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}
                        <Stack component="form" spacing={3} onSubmit={handleSubmit}>
                            <TextField
                                fullWidth
                                label={t('auth.email')}
                                placeholder={t('auth.placeholderEmail')}
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                            <TextField
                                fullWidth
                                label={t('auth.password')}
                                placeholder="••••••••"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                slotProps={{
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton edge="end" size="small" tabIndex={-1}>
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                                helperText={
                                    <Box component={Link} to="/forgot-password" sx={{ fontSize: '0.75rem', color: 'secondary.main', fontWeight: 700, textDecoration: 'none', float: 'right' }}>
                                        {t('auth.forgot')}
                                    </Box>
                                }
                            />
                            <Button fullWidth variant="contained" color="secondary" size="large" type="submit" disabled={submitting} sx={{ py: 1.5, fontWeight: 700 }}>
                                {submitting ? '…' : t('auth.signIn')}
                            </Button>
                        </Stack>
                        <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                {t('auth.signUpPrompt')}{' '}
                                <Box component={Link} to="/signup" sx={{ color: 'secondary.main', fontWeight: 700, textDecoration: 'none' }}>
                                    {t('auth.signUpCTA')}
                                </Box>
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
                </MotionFadeInScale>
            </Box>
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Stack direction="row" justifyContent="center" gap={3} sx={{ mb: 2 }} flexWrap="wrap">
                    <Typography component={Link} to="/privacy" variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'secondary.main' } }}>
                        {t('auth.privacy')}
                    </Typography>
                    <Typography component={Link} to="/terms" variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'secondary.main' } }}>
                        {t('auth.terms')}
                    </Typography>
                    <Typography component={Link} to="/#corporate" variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'secondary.main' } }}>
                        {t('auth.security')}
                    </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                    {t('footer.copyright')}
                </Typography>
            </Box>
        </Box>
    )
}
