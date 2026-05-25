import React from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import LinearProgress from '@mui/material/LinearProgress'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import { formatPlanTier } from '../../lib/accountActions'
import { formatChatDate } from '../../lib/aiChats'
import {
    aiChatListItem,
    aiChatListStagger,
    aiNewChatButton,
    aiSidebarSection,
} from './aiMotionPresets'

function UserInitial({ name, email }) {
    const base = (name || email || '?').trim()
    return base.charAt(0).toUpperCase()
}

function ChatListItem({ conv, active, isCollapsed, onSelect, onDelete }) {
    const btn = (
        <ListItemButton
            component={motion.div}
            layout
            onClick={() => onSelect(conv.id)}
            whileHover={{ x: isCollapsed ? 0 : 4 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            sx={{
                borderRadius: 2,
                mx: 0.5,
                mb: 0.35,
                py: 1.1,
                bgcolor: active ? 'rgba(25, 127, 148, 0.1)' : 'transparent',
                borderLeft: '3px solid',
                borderLeftColor: active ? 'secondary.main' : 'transparent',
                transition: 'background-color 0.2s ease',
            }}
        >
            {isCollapsed ? (
                <ChatBubbleOutlineIcon sx={{ fontSize: 20, color: active ? 'secondary.main' : 'text.secondary', mx: 'auto' }} />
            ) : (
                <>
                    <ChatBubbleOutlineIcon
                        sx={{ fontSize: 18, mr: 1.5, color: active ? 'secondary.main' : 'text.disabled', flexShrink: 0 }}
                    />
                    <ListItemText
                        primary={conv.title || 'New chat'}
                        secondary={formatChatDate(conv.updated_at || conv.created_at)}
                        primaryTypographyProps={{
                            noWrap: true,
                            fontSize: '0.8125rem',
                            fontWeight: active ? 700 : 500,
                        }}
                        secondaryTypographyProps={{ fontSize: '0.7rem' }}
                    />
                    <IconButton
                        component={motion.button}
                        whileHover={{ scale: 1.1, opacity: 1 }}
                        whileTap={{ scale: 0.9 }}
                        size="small"
                        aria-label="Delete chat"
                        onClick={e => {
                            e.stopPropagation()
                            onDelete?.(conv.id)
                        }}
                        sx={{
                            opacity: 0,
                            '.MuiListItemButton-root:hover &': { opacity: 0.75 },
                        }}
                    >
                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </>
            )}
        </ListItemButton>
    )

    return isCollapsed ? (
        <Tooltip title={conv.title || 'Chat'} placement="right">
            {btn}
        </Tooltip>
    ) : (
        btn
    )
}

export default function AISidebar({
    navigate,
    isCollapsed,
    onCloseDrawer,
    conversations = [],
    activeConversationId,
    loadingChats,
    onSelectConversation,
    onNewChat,
    onDeleteConversation,
    profile,
    subscription,
    aiUsed = 0,
    aiLimit = null,
    sourcesCount = 0,
}) {
    const displayName = profile?.full_name?.trim() || profile?.email?.split('@')[0] || 'Account'
    const planLabel = subscription?.plan_tier ? formatPlanTier(subscription.plan_tier) : 'Free'
    const unlimited = aiLimit == null
    const limit = unlimited ? null : Number(aiLimit) || 0
    const usagePct = unlimited || limit <= 0 ? 0 : Math.min(100, Math.round((aiUsed / limit) * 100))
    const usageLabel = unlimited ? `${aiUsed} messages this month (unlimited)` : `${aiUsed} / ${limit} AI messages`

    return (
        <Stack component={motion.div} {...aiSidebarSection} sx={{ height: '100%', overflow: 'hidden' }}>
            <Box sx={{ p: isCollapsed ? 1.5 : 2, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                <Stack
                    direction="row"
                    justifyContent={isCollapsed ? 'center' : 'space-between'}
                    alignItems="center"
                    sx={{ mb: isCollapsed ? 1 : 2 }}
                >
                    {isCollapsed ? (
                        <Tooltip title="Back">
                            <IconButton
                                component={motion.button}
                                whileHover={{ scale: 1.08, x: -2 }}
                                whileTap={{ scale: 0.94 }}
                                onClick={() => navigate(-1)}
                                size="small"
                                sx={{ color: 'text.secondary' }}
                            >
                                <ArrowBackIcon />
                            </IconButton>
                        </Tooltip>
                    ) : (
                        <Button
                            component={motion.button}
                            whileHover={{ x: -3 }}
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate(-1)}
                            size="small"
                            sx={{ color: 'text.secondary', minWidth: 0, px: 1 }}
                        >
                            Back
                        </Button>
                    )}
                    {onCloseDrawer && !isCollapsed && (
                        <IconButton
                            component={motion.button}
                            whileHover={{ rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onCloseDrawer}
                            size="small"
                            aria-label="Close menu"
                        >
                            <CloseIcon />
                        </IconButton>
                    )}
                </Stack>
                <Tooltip title="New chat">
                    <Button
                        component={motion.button}
                        fullWidth={!isCollapsed}
                        variant="contained"
                        color="secondary"
                        onClick={onNewChat}
                        {...aiNewChatButton}
                        sx={{
                            minWidth: isCollapsed ? 44 : 'auto',
                            p: isCollapsed ? 1.25 : undefined,
                            justifyContent: 'center',
                            borderRadius: 2.5,
                            fontWeight: 700,
                            boxShadow: '0 6px 20px rgba(25, 127, 148, 0.25)',
                        }}
                    >
                        <AddIcon sx={{ mr: isCollapsed ? 0 : 1 }} />
                        <AnimatePresence mode="wait">
                            {!isCollapsed && (
                                <motion.span
                                    key="label"
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                >
                                    New chat
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </Button>
                </Tooltip>
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', py: 1 }}>
                <AnimatePresence>
                    {!isCollapsed && (
                        <Typography
                            component={motion.span}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            variant="caption"
                            sx={{
                                px: 2,
                                py: 0.75,
                                display: 'block',
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                color: 'text.secondary',
                            }}
                        >
                            CHATS
                        </Typography>
                    )}
                </AnimatePresence>
                {loadingChats ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                        <CircularProgress size={22} color="secondary" />
                    </Box>
                ) : conversations.length === 0 ? (
                    !isCollapsed && (
                        <Typography
                            component={motion.p}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            variant="caption"
                            color="text.secondary"
                            sx={{ px: 2, display: 'block', lineHeight: 1.6 }}
                        >
                            No saved chats yet. Ask a question to start.
                        </Typography>
                    )
                ) : (
                    <List
                        component={motion.ul}
                        variants={aiChatListStagger}
                        initial="hidden"
                        animate="visible"
                        dense
                        disablePadding
                        sx={{ px: isCollapsed ? 0.5 : 1, listStyle: 'none' }}
                    >
                        <AnimatePresence initial={false}>
                            {conversations.map(conv => (
                                <motion.li
                                    key={conv.id}
                                    variants={aiChatListItem}
                                    layout
                                    exit={{ opacity: 0, x: -12, transition: { duration: 0.18 } }}
                                    style={{ listStyle: 'none' }}
                                >
                                    <ChatListItem
                                        conv={conv}
                                        active={conv.id === activeConversationId}
                                        isCollapsed={isCollapsed}
                                        onSelect={onSelectConversation}
                                        onDelete={onDeleteConversation}
                                    />
                                </motion.li>
                            ))}
                        </AnimatePresence>
                    </List>
                )}
            </Box>

            <Box
                component={motion.div}
                layout
                sx={{
                    flexShrink: 0,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    p: isCollapsed ? 1 : 2,
                    bgcolor: 'rgba(248, 250, 252, 0.95)',
                }}
            >
                {isCollapsed ? (
                    <Stack alignItems="center" spacing={1}>
                        <Tooltip title={displayName}>
                            <Box
                                component={motion.div}
                                whileHover={{ scale: 1.08 }}
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #197f94, #1a2332)',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: '0.9rem',
                                    boxShadow: '0 4px 12px rgba(25, 127, 148, 0.35)',
                                }}
                            >
                                <UserInitial name={profile?.full_name} email={profile?.email} />
                            </Box>
                        </Tooltip>
                        <Tooltip title={`${planLabel} · ${usageLabel}`}>
                            <WorkspacePremiumIcon sx={{ fontSize: 20, color: 'secondary.main' }} />
                        </Tooltip>
                    </Stack>
                ) : (
                    <Stack spacing={1.5}>
                        <Stack direction="row" alignItems="center" spacing={1.25}>
                            <Box
                                component={motion.div}
                                whileHover={{ scale: 1.05 }}
                                sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #197f94, #1a2332)',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    flexShrink: 0,
                                    boxShadow: '0 4px 14px rgba(25, 127, 148, 0.3)',
                                }}
                            >
                                <UserInitial name={profile?.full_name} email={profile?.email} />
                            </Box>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography variant="body2" fontWeight={700} noWrap>
                                    {displayName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                    {profile?.email}
                                </Typography>
                            </Box>
                        </Stack>

                        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                            <Stack direction="row" alignItems="center" gap={0.5}>
                                <WorkspacePremiumIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
                                <Typography variant="caption" fontWeight={700} color="text.primary">
                                    {planLabel}
                                </Typography>
                            </Stack>
                            <Typography
                                component={motion(Link)}
                                whileHover={{ x: 2 }}
                                to="/dashboard/billing"
                                variant="caption"
                                sx={{ color: 'secondary.main', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}
                            >
                                Manage
                            </Typography>
                        </Stack>

                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                {usageLabel}
                            </Typography>
                            {!unlimited && (
                                <Box
                                    component={motion.div}
                                    initial={{ scaleX: 0, opacity: 0.6 }}
                                    animate={{ scaleX: 1, opacity: 1 }}
                                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                    sx={{ transformOrigin: 'left' }}
                                >
                                    <LinearProgress
                                        variant="determinate"
                                        value={usagePct}
                                        color={usagePct >= 90 ? 'warning' : 'secondary'}
                                        sx={{
                                            height: 6,
                                            borderRadius: 3,
                                            bgcolor: 'rgba(25, 127, 148, 0.12)',
                                        }}
                                    />
                                </Box>
                            )}
                        </Box>

                        <Stack
                            component={motion(Link)}
                            whileHover={{ x: 4, color: 'secondary.main' }}
                            direction="row"
                            alignItems="center"
                            spacing={0.75}
                            to="/dashboard/library"
                            sx={{ textDecoration: 'none', color: 'text.secondary' }}
                        >
                            <MenuBookIcon sx={{ fontSize: 18 }} />
                            <Typography variant="caption" fontWeight={600}>
                                Sources: {sourcesCount} report{sourcesCount === 1 ? '' : 's'} in your library
                            </Typography>
                        </Stack>
                    </Stack>
                )}
            </Box>
        </Stack>
    )
}
