import React, { useState } from 'react'
import { motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import { useTranslation } from 'react-i18next'
import BrandLogo from './BrandLogo'
import LanguageSwitcher from './LanguageSwitcher'
import LiveCatalogSearch from './search/LiveCatalogSearch'
import { useAuth } from '../context/AuthContext'

export default function Header() {
    const { t } = useTranslation()
    const { user, signOut } = useAuth()
    const navigate = useNavigate()
    const [visible, setVisible] = useState(true)
    const [mobileOpen, setMobileOpen] = useState(false)
    const { scrollY } = useScroll()

    useMotionValueEvent(scrollY, 'change', latest => {
        const prev = scrollY.getPrevious() ?? 0
        if (latest < 12) setVisible(true)
        else if (latest > prev) setVisible(false)
        else setVisible(true)
    })

    const navLinks = [
        { label: t('nav.sectors'), to: '/sectors' },
        { label: t('nav.reports'), to: '/reports' },
        { label: t('nav.blog'), to: '/blog' },
        { label: t('nav.pricing'), to: '/pricing' },
        { label: t('nav.ai'), to: '/ai' },
    ]

    return (
        <>
            <AppBar
                position="fixed"
                elevation={0}
                component={motion.header}
                animate={{ y: visible ? 0 : -88 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                sx={{
                    bgcolor: 'rgba(255,255,255,0.94)',
                    backdropFilter: 'blur(14px)',
                    borderBottom: '1px solid #dde1e9',
                }}
            >
                <Toolbar sx={{ maxWidth: 1520, mx: 'auto', width: '100%', px: { xs: 2, md: 3 }, gap: { xs: 1, md: 2 }, flexWrap: { lg: 'nowrap' } }}>
                    <BrandLogo />

                    <Box sx={{ flex: 1, maxWidth: 360, display: { xs: 'none', md: 'block' } }}>
                        <LiveCatalogSearch variant="header" />
                    </Box>

                    <Stack direction="row" gap={{ lg: 2, xl: 2.5 }} alignItems="center" sx={{ display: { xs: 'none', lg: 'flex' }, flexShrink: 0 }}>
                        {navLinks.map(item => (
                            <Box
                                key={item.to}
                                component={Link}
                                to={item.to}
                                className="nav-link-animated"
                                sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary', textDecoration: 'none', whiteSpace: 'nowrap', '&:hover': { color: 'secondary.main' } }}
                            >
                                {item.label}
                            </Box>
                        ))}
                    </Stack>

                    <LanguageSwitcher size="small" />

                    <Stack direction="row" gap={1} alignItems="center" sx={{ flexShrink: 0, display: { xs: 'none', md: 'flex' }, ml: { md: 'auto' } }}>
                        {user ? (
                            <>
                                <Button component={Link} to="/profile" variant="outlined" size="small" color="primary">
                                    {t('nav.profile', { defaultValue: 'Profile' })}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outlined"
                                    size="small"
                                    onClick={async () => {
                                        const ok = await signOut()
                                        if (ok) navigate('/', { replace: true })
                                    }}
                                >
                                    {t('common.logout', { defaultValue: 'Log out' })}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button component={Link} to="/login" variant="outlined" size="small" color="primary">
                                    {t('common.login')}
                                </Button>
                                <Button component={Link} to="/pricing" variant="contained" color="secondary" size="small">
                                    {t('common.getAccess')}
                                </Button>
                            </>
                        )}
                    </Stack>

                    <IconButton
                        sx={{ display: { xs: 'flex', md: 'none' }, ml: 'auto', color: 'text.primary' }}
                        onClick={() => setMobileOpen(true)}
                        aria-label="Menu"
                    >
                        <MenuIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>

            <Drawer anchor="right" open={mobileOpen} onClose={() => setMobileOpen(false)} PaperProps={{ sx: { width: '88vw', maxWidth: 340 } }}>
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #dde1e9' }}>
                    <BrandLogo size="compact" />
                    <IconButton onClick={() => setMobileOpen(false)}><CloseIcon /></IconButton>
                </Box>
                <Box sx={{ p: 2 }}>
                    <LiveCatalogSearch variant="header" onNavigate={() => setMobileOpen(false)} />
                </Box>
                <Box sx={{ px: 2, pb: 2 }}><LanguageSwitcher size="small" /></Box>
                <List disablePadding>
                    {navLinks.map(item => (
                        <ListItem key={item.to} disablePadding>
                            <ListItemButton component={Link} to={item.to} onClick={() => setMobileOpen(false)}>
                                <ListItemText primary={item.label} slotProps={{ primary: { fontWeight: 600 } }} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                    <ListItem disablePadding>
                        <ListItemButton component={Link} to="/my-reports" onClick={() => setMobileOpen(false)}>
                            <ListItemText primary={t('nav.myReports')} slotProps={{ primary: { fontWeight: 600 } }} />
                        </ListItemButton>
                    </ListItem>
                </List>
                <Divider sx={{ my: 2 }} />
                <Stack gap={1.5} sx={{ px: 2, pb: 2 }}>
                    {user ? (
                        <>
                            <Button fullWidth component={Link} to="/profile" variant="outlined" onClick={() => setMobileOpen(false)}>
                                {t('nav.profile', { defaultValue: 'Profile' })}
                            </Button>
                            <Button
                                type="button"
                                fullWidth
                                variant="contained"
                                color="secondary"
                                onClick={async () => {
                                    setMobileOpen(false)
                                    const ok = await signOut()
                                    if (ok) navigate('/', { replace: true })
                                }}
                            >
                                {t('common.logout', { defaultValue: 'Log out' })}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button fullWidth component={Link} to="/login" variant="outlined" onClick={() => setMobileOpen(false)}>{t('common.login')}</Button>
                            <Button fullWidth component={Link} to="/pricing" variant="contained" color="secondary" onClick={() => setMobileOpen(false)}>
                                {t('common.getAccess')}
                            </Button>
                        </>
                    )}
                </Stack>
            </Drawer>
        </>
    )
}
