import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import BrandLogo from '../components/BrandLogo'
import NotificationBell from '../components/notifications/NotificationBell'
import { useAuth } from '../context/AuthContext'
import AnimatedOutlet from '../components/motion/AnimatedOutlet'
import MotionNavLink from '../components/motion/MotionNavLink'

const drawerWidth = 268

const nav = [
    { to: '/dashboard', label: 'Overview', end: true },
    { to: '/dashboard/library', label: 'Library' },
    { to: '/dashboard/payments', label: 'Payments' },
    { to: '/dashboard/billing', label: 'Billing' },
    { to: '/dashboard/settings', label: 'Settings' },
]

function formatPlanTier(tier) {
    if (!tier) return null
    return tier.charAt(0).toUpperCase() + tier.slice(1)
}

function NavBlock({ onNavigate }) {
    return (
        <Stack spacing={0.5} sx={{ px: 1.5, py: 2 }}>
            {nav.map(item => (
                <MotionNavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate} label={item.label} />
            ))}
        </Stack>
    )
}

function SidebarBody({ onClose, planLine, profileName }) {
    return (
        <Stack sx={{ height: '100%', bgcolor: 'background.paper' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, pt: 3, pb: 1 }}>
                <BrandLogo />
                {onClose && (
                    <IconButton onClick={onClose} size="small" sx={{ display: { md: 'none' } }}>
                        <CloseIcon />
                    </IconButton>
                )}
            </Stack>
            {profileName && (
                <Typography variant="body2" sx={{ px: 3, pb: 0.5, fontWeight: 600, color: 'text.primary' }}>
                    {profileName}
                </Typography>
            )}
            <Typography variant="caption" sx={{ px: 3, pt: 1, pb: 0.5, color: 'text.secondary', letterSpacing: '0.08em', fontWeight: 700 }}>
                Workspace
            </Typography>
            <NavBlock onNavigate={onClose} />
            <Box sx={{ flex: 1 }} />
            <Box sx={{ px: 2.5, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {planLine}
                </Typography>
                <Typography component={Link} to="/pricing" variant="body2" sx={{ color: 'secondary.main', fontWeight: 600, textDecoration: 'none' }}>
                    Manage subscription
                </Typography>
            </Box>
        </Stack>
    )
}

export default function DashboardLayout() {
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))
    const [open, setOpen] = useState(false)
    const { profile, subscription } = useAuth()

    const tier = formatPlanTier(subscription?.plan_tier)
    const planLine = tier
        ? `Plan: ${tier}${subscription?.report_quota != null ? ` · quota ${subscription.report_quota}` : ''}`
        : 'Plan: no active subscription'

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    display: { xs: 'none', md: 'block' },
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        borderRight: '1px solid',
                        borderColor: 'divider',
                    },
                }}
            >
                <SidebarBody planLine={planLine} profileName={profile?.full_name} />
            </Drawer>
            <Drawer
                variant="temporary"
                open={open}
                onClose={() => setOpen(false)}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
                }}
            >
                <SidebarBody onClose={() => setOpen(false)} planLine={planLine} profileName={profile?.full_name} />
            </Drawer>

            <Box component="main" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: { xs: 2, sm: 3 },
                        py: 2,
                        bgcolor: 'background.paper',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Stack direction="row" alignItems="center" gap={1.5}>
                        {isMobile && (
                            <IconButton edge="start" onClick={() => setOpen(true)} aria-label="menu">
                                <MenuIcon />
                            </IconButton>
                        )}
                        <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.125rem' }, fontWeight: 700 }}>
                            Dashboard
                        </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" gap={1}>
                        <NotificationBell paymentsHref="/dashboard/payments" emptyLabel="Aucune nouvelle notification" />
                        <Typography component={Link} to="/profile" variant="body2" sx={{ fontWeight: 600, color: 'text.primary', textDecoration: 'none', ml: 0.5 }}>
                            Profile
                        </Typography>
                    </Stack>
                </Box>
                <Box sx={{ flex: 1, p: { xs: 2, sm: 3, md: 4 }, overflow: 'hidden' }}>
                    <AnimatedOutlet />
                </Box>
            </Box>
        </Box>
    )
}
