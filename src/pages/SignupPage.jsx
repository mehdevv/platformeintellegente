import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import VisibilityIcon from '@mui/icons-material/Visibility'
import Grid from '@mui/material/Grid'
import { useTranslation } from 'react-i18next'
import BrandLogo from '../components/BrandLogo'
import { MotionFadeInScale } from '../components/motion/Motion'
import { useAuth } from '../context/AuthContext'

export default function SignupPage() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const { supabase, supabaseConfigured, user, loading } = useAuth()
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [agree, setAgree] = useState(false)
    const [error, setError] = useState('')
    const [info, setInfo] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (!loading && user) navigate('/dashboard', { replace: true })
    }, [loading, user, navigate])

    const handleSubmit = async e => {
        e.preventDefault()
        setError('')
        setInfo('')
        if (!agree) {
            setError('Please accept the terms to continue.')
            return
        }
        if (!supabase) {
            setError('Supabase is not configured.')
            return
        }
        setSubmitting(true)
        const fullName = `${firstName} ${lastName}`.trim()
        const { data, error: err } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { full_name: fullName || undefined } },
        })
        setSubmitting(false)
        if (err) {
            setError(err.message)
            return
        }
        if (data.user && !data.session) {
            setInfo('Check your email to confirm your account, then sign in.')
        } else {
            navigate('/dashboard', { replace: true })
        }
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
                                {t('auth.signupH1')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {t('auth.signupTrial')}
                            </Typography>
                        </Box>
                        {!supabaseConfigured && <Alert severity="warning" sx={{ mb: 2 }}>Add Supabase keys to .env</Alert>}
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                        {info && <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>}
                        <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
                            <Grid container spacing={2}>
                                <Grid size={6}>
                                    <TextField fullWidth label={t('auth.firstName')} value={firstName} onChange={e => setFirstName(e.target.value)} />
                                </Grid>
                                <Grid size={6}>
                                    <TextField fullWidth label={t('auth.lastName')} value={lastName} onChange={e => setLastName(e.target.value)} />
                                </Grid>
                            </Grid>
                            <TextField fullWidth label={t('auth.workEmail')} placeholder={t('auth.placeholderEmail')} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                            <TextField
                                fullWidth
                                label={t('auth.password')}
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                helperText={t('auth.passwordHint')}
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
                            />
                            <FormControlLabel control={<Checkbox size="small" checked={agree} onChange={e => setAgree(e.target.checked)} />} label={(
                                <Typography variant="caption" color="text.secondary">
                                    {t('auth.agreePrefix')}{' '}
                                    <Box component={Link} to="/terms" sx={{ color: 'secondary.main', fontWeight: 700, textDecoration: 'none' }}>{t('footer.terms')}</Box>
                                    {' '}{t('auth.and')}{' '}
                                    <Box component={Link} to="/privacy" sx={{ color: 'secondary.main', fontWeight: 700, textDecoration: 'none' }}>{t('footer.privacy')}</Box>
                                </Typography>
                            )} />
                            <Button fullWidth variant="contained" color="secondary" size="large" type="submit" disabled={submitting} sx={{ py: 1.5, fontWeight: 700 }}>
                                {submitting ? '…' : t('auth.createAccountBtn')}
                            </Button>
                        </Stack>
                        <Divider sx={{ my: 3 }}>
                            <Typography variant="caption" color="text.secondary">{t('auth.orDivider')}</Typography>
                        </Divider>
                        <Button fullWidth variant="outlined" disabled sx={{ py: 1.5, color: 'text.primary', borderColor: '#dde1e9', textTransform: 'none' }}>
                            {t('auth.continueGoogle')} (soon)
                        </Button>
                        <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                {t('auth.signInPrompt')}{' '}
                                <Box component={Link} to="/login" sx={{ color: 'secondary.main', fontWeight: 700, textDecoration: 'none' }}>{t('auth.signInCTA')}</Box>
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
                </MotionFadeInScale>
            </Box>
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">{t('footer.copyright')}</Typography>
            </Box>
        </Box>
    )
}
