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

export default function AdminLoginPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { t } = useTranslation()
    const { supabase, supabaseConfigured, user, loading, profileLoading, isAdmin, signOut, refreshProfile } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const from = location.state?.from && location.state.from !== '/admin/login' ? location.state.from : '/admin'

    useEffect(() => {
        if (!loading && !profileLoading && user && isAdmin) {
            navigate(from, { replace: true })
        }
    }, [loading, profileLoading, user, isAdmin, navigate, from])

    const handleSubmit = async e => {
        e.preventDefault()
        setError('')
        if (!supabase) {
            setError(t('auth.adminSupabaseMissing'))
            return
        }
        setSubmitting(true)
        const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (err) {
            setSubmitting(false)
            setError(err.message)
            return
        }
        const userId = data.user?.id
        const { data: prof, error: profErr } = await supabase.from('profiles').select('app_role').eq('id', userId).single()
        setSubmitting(false)
        if (profErr || prof?.app_role !== 'admin') {
            await supabase.auth.signOut()
            setError(t('auth.adminNotAuthorized'))
            return
        }
        await refreshProfile(userId)
        navigate(from, { replace: true })
    }

    return (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 3, py: 2 }}>
                <Button component={Link} to="/" startIcon={<ArrowBackIcon />} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                    {t('auth.backToSite')}
                </Button>
            </Box>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
                <MotionFadeInScale>
                <Paper className="card-lift" elevation={4} sx={{ width: '100%', maxWidth: 440, overflow: 'hidden', borderRadius: 3 }}>
                    <Box
                        sx={{
                            height: 128,
                            bgcolor: 'grey.900',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        <Box sx={{ position: 'absolute', inset: 0, opacity: 0.15, background: 'radial-gradient(circle, rgba(255,255,255,0.35), transparent)' }} />
                        <Box sx={{ position: 'relative', zIndex: 1 }}>
                            <BrandLogo variant="onDark" />
                        </Box>
                    </Box>
                    <Box sx={{ p: 4 }}>
                        <Box sx={{ textAlign: 'center', mb: 4 }}>
                            <Typography variant="h5" sx={{ mb: 1 }} fontWeight={800}>
                                {t('auth.adminConsole')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {t('auth.adminLoginSub')}
                            </Typography>
                        </Box>
                        {!supabaseConfigured && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                {t('auth.adminEnvHint')}
                            </Alert>
                        )}
                        {location.state?.reason === 'no_supabase' && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                {t('auth.adminConfigureSupabase')}
                            </Alert>
                        )}
                        {location.state?.reason === 'not_admin' && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                {t('auth.adminKickedForRole')}
                            </Alert>
                        )}
                        {!loading && user && !isAdmin && (
                            <Alert
                                severity="warning"
                                sx={{ mb: 2 }}
                                action={
                                    <Button color="inherit" size="small" onClick={() => signOut()}>
                                        {t('common.logout', { defaultValue: 'Log out' })}
                                    </Button>
                                }
                            >
                                {t('auth.adminSignedInAsUser')}
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
                                    <Box component={Link} to="/forgot-password" state={{ redirectTo: '/admin/login' }} sx={{ fontSize: '0.75rem', color: 'secondary.main', fontWeight: 700, textDecoration: 'none', float: 'right' }}>
                                        {t('auth.forgot')}
                                    </Box>
                                }
                            />
                            <Button fullWidth variant="contained" color="secondary" size="large" type="submit" disabled={submitting || (!!user && !isAdmin)} sx={{ py: 1.5, fontWeight: 700 }}>
                                {submitting ? '…' : t('auth.signIn')}
                            </Button>
                        </Stack>
                    </Box>
                </Paper>
                </MotionFadeInScale>
            </Box>
        </Box>
    )
}
