import React, { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Drawer from '@mui/material/Drawer'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import ChatBubbleIcon from '@mui/icons-material/ChatBubble'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import AIChatBar, { AI_CHAT_BAR_FLOAT_HEIGHT } from '../components/ai/AIChatBar'
import { useAuth } from '../context/AuthContext'
import { consumeAiChatStream, isAiApiConfigured, sendAiChat } from '../lib/aiApi'

const sidebarWidth = 260

function LeftSidebarContent({ navigate, onClose, isCollapsed }) {
    return (
        <Stack sx={{ height: '100%', overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0' }}>
                <Stack direction="row" justifyContent={isCollapsed ? 'center' : 'space-between'} alignItems="center" sx={{ mb: 2 }}>
                    {isCollapsed ? (
                        <IconButton onClick={() => navigate(-1)} size="small" sx={{ color: 'text.secondary' }}>
                            <ArrowBackIcon />
                        </IconButton>
                    ) : (
                        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} size="small" sx={{ color: 'text.secondary' }}>
                            Back
                        </Button>
                    )}
                    {onClose && !isCollapsed && (
                        <IconButton onClick={onClose} size="small">
                            <CloseIcon />
                        </IconButton>
                    )}
                </Stack>
                <Button
                    fullWidth={!isCollapsed}
                    variant="contained"
                    sx={{
                        minWidth: isCollapsed ? 0 : 'auto',
                        p: isCollapsed ? 1 : undefined,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                    onClick={onClose}
                >
                    <AddIcon sx={{ mr: isCollapsed ? 0 : 1 }} />
                    {!isCollapsed && <span>New chat</span>}
                </Button>
            </Box>
            <Box sx={{ flexGrow: 1, p: 2 }}>
                {!isCollapsed && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6 }}>
                        Answers use only reports in your library. Subscribe or purchase reports, then ensure they are indexed by an admin.
                    </Typography>
                )}
            </Box>
        </Stack>
    )
}

function MessageBubble({ msg }) {
    const isUser = msg.role === 'user'
    return (
        <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
            <Stack alignItems={isUser ? 'flex-end' : 'flex-start'} gap={0.5} sx={{ maxWidth: '85%' }}>
                {!isUser && (
                    <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <SmartToyIcon sx={{ color: '#fff', fontSize: 18 }} />
                    </Box>
                )}
                <Paper
                    sx={{
                        px: { xs: 2, md: 3 },
                        py: 2,
                        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        bgcolor: isUser ? 'primary.main' : 'background.paper',
                        color: isUser ? '#fff' : 'text.primary',
                        border: isUser ? 'none' : '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Typography variant="body2" sx={{ lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                        {msg.content}
                        {msg.streaming && (
                            <Box component="span" sx={{ display: 'inline-block', width: 8, height: 14, ml: 0.5, bgcolor: 'secondary.main', animation: 'pulse 1s infinite' }} />
                        )}
                    </Typography>
                </Paper>
                {msg.sources?.length > 0 && (
                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                        {msg.sources.map((s, i) => (
                            <Chip key={i} size="small" label={s.report_title || 'Report'} variant="outlined" component={s.report_id ? Link : 'div'} to={s.report_id ? `/reports/${s.report_id}` : undefined} />
                        ))}
                    </Stack>
                )}
            </Stack>
        </Box>
    )
}

export default function AIAgentPage() {
    const navigate = useNavigate()
    const { supabase, user, session } = useAuth()
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
    const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)
    const [messages, setMessages] = useState([])
    const [inputValue, setInputValue] = useState('')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')

    const hasChat = messages.length > 0
    const apiReady = isAiApiConfigured()

    const getAccessToken = useCallback(async () => session?.access_token ?? null, [session?.access_token])

    const resetChat = () => {
        setMessages([])
        setError('')
        setInputValue('')
    }

    const toggleSidebar = () => {
        if (window.innerWidth >= 1200) {
            setDesktopSidebarOpen(!desktopSidebarOpen)
        } else {
            setMobileSidebarOpen(!mobileSidebarOpen)
        }
    }

    const handleSend = async () => {
        const text = inputValue.trim()
        if (!text || sending) return
        if (!user) {
            setError('Sign in to use the AI assistant.')
            return
        }
        if (!apiReady) {
            setError('AI API is not configured. Set VITE_AI_API_URL in .env (e.g. http://localhost:8000).')
            return
        }

        setError('')
        setInputValue('')
        const history = messages
            .filter(m => !m.streaming && m.content)
            .map(m => ({ role: m.role, content: m.content }))
        const userMsg = { id: `u-${Date.now()}`, role: 'user', content: text }
        const assistantId = `a-${Date.now()}`
        setMessages(prev => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '', streaming: true, sources: [] }])
        setSending(true)

        try {
            const response = await sendAiChat({ message: text, history, stream: true, getAccessToken })
            let sources = []
            await consumeAiChatStream(response, {
                onToken: t => {
                    setMessages(prev =>
                        prev.map(m => (m.id === assistantId ? { ...m, content: m.content + t } : m)),
                    )
                },
                onDone: meta => {
                    sources = meta.sources || []
                },
            })
            setMessages(prev =>
                prev.map(m =>
                    m.id === assistantId ? { ...m, streaming: false, sources } : m,
                ),
            )
        } catch (e) {
            setMessages(prev => prev.filter(m => m.id !== assistantId))
            setError(e?.message || 'AI request failed')
        } finally {
            setSending(false)
        }
    }

    const chatBarProps = {
        inputValue,
        onInputChange: e => setInputValue(e.target.value),
        onSend: handleSend,
        hasChat,
        layoutId: 'ai-chat-bar',
    }

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
            <Drawer
                variant="permanent"
                sx={{
                    width: desktopSidebarOpen ? sidebarWidth : 72,
                    display: { xs: 'none', lg: 'block' },
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: desktopSidebarOpen ? sidebarWidth : 72,
                        bgcolor: 'background.paper',
                        borderRight: '1px solid #e2e8f0',
                        position: 'relative',
                        overflowX: 'hidden',
                    },
                }}
            >
                <LeftSidebarContent navigate={navigate} onClose={resetChat} isCollapsed={!desktopSidebarOpen} />
            </Drawer>

            <Drawer
                variant="temporary"
                open={mobileSidebarOpen}
                onClose={() => setMobileSidebarOpen(false)}
                ModalProps={{ keepMounted: true }}
                sx={{ display: { xs: 'block', lg: 'none' }, '& .MuiDrawer-paper': { width: sidebarWidth } }}
            >
                <LeftSidebarContent navigate={navigate} onClose={() => { setMobileSidebarOpen(false); resetChat() }} isCollapsed={false} />
            </Drawer>

            <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: '1px solid #e2e8f0', bgcolor: 'background.paper' }}>
                    <IconButton onClick={toggleSidebar} size="small">
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="subtitle2" fontWeight={800}>
                        Researcha AI
                    </Typography>
                    {!user && (
                        <Button component={Link} to="/login" state={{ redirectTo: '/ai' }} size="small" sx={{ ml: 'auto' }}>
                            Sign in
                        </Button>
                    )}
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mx: 2, mt: 1 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}
                {!apiReady && (
                    <Alert severity="warning" sx={{ mx: 2, mt: 1 }}>
                        Set <code>VITE_AI_API_URL</code> in your frontend <code>.env</code> and run the backend (<code>uvicorn</code> in <code>backend/</code>).
                    </Alert>
                )}

                <Box sx={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
                    {hasChat ? (
                        <>
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    overflow: 'auto',
                                    p: { xs: 2, md: 3 },
                                    pb: AI_CHAT_BAR_FLOAT_HEIGHT,
                                }}
                            >
                                <Stack spacing={3} sx={{ maxWidth: 720, mx: 'auto' }}>
                                    {messages.map(msg => (
                                        <motion.div key={msg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                                            <MessageBubble msg={msg} />
                                        </motion.div>
                                    ))}
                                    {sending && (
                                        <Stack direction="row" alignItems="center" gap={1} justifyContent="center">
                                            <CircularProgress size={20} color="secondary" />
                                        </Stack>
                                    )}
                                </Stack>
                            </Box>
                            <AIChatBar {...chatBarProps} position="floating" />
                        </>
                    ) : (
                        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
                            <Stack alignItems="center" spacing={3} sx={{ maxWidth: 800, width: '100%' }}>
                                <Stack direction="row" alignItems="center" gap={2}>
                                    <AutoAwesomeIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                                    <Typography variant="h4" sx={{ fontFamily: '"Georgia", serif', fontWeight: 400 }}>
                                        Ask your reports
                                    </Typography>
                                </Stack>
                                <Typography variant="body2" color="text.secondary" textAlign="center">
                                    Questions are answered from PDF content in reports you own — not the open web.
                                </Typography>
                                <AIChatBar {...chatBarProps} position="inline" />
                            </Stack>
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    )
}
