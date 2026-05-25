import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Drawer from '@mui/material/Drawer'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import MenuIcon from '@mui/icons-material/Menu'
import AIChatBar, { AI_CHAT_BAR_FLOAT_HEIGHT } from '../components/ai/AIChatBar'
import AISidebar from '../components/ai/AISidebar'
import AIMessageBubble from '../components/ai/AIMessageBubble'
import AIWelcome from '../components/ai/AIWelcome'
import AITypingIndicator from '../components/ai/AITypingIndicator'
import { aiAlertSlide, aiHeaderEnter, aiLoadingFade, aiPanelSwitch } from '../components/ai/aiMotionPresets'
import { useAuth } from '../context/AuthContext'
import { consumeAiChatStream, isAiApiConfigured, sendAiChat, sendAiChatJson } from '../lib/aiApi'
import {
    createAiConversation,
    deleteAiConversation,
    fetchLibrarySourcesCount,
    listAiConversations,
    loadAiMessages,
    mapDbMessageToUi,
    saveAiMessage,
    titleFromMessage,
    touchAiConversation,
    updateAiConversationTitle,
} from '../lib/aiChats'
import { fetchAiUsageState, recordAiMessageUsage } from '../lib/aiUsage'
import { getFreshAccessToken } from '../lib/supabaseSession'

const sidebarWidth = 280
const sidebarCollapsed = 72

export default function AIAgentPage() {
    const navigate = useNavigate()
    const { supabase, user, profile, subscription } = useAuth()
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
    const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)
    const [conversations, setConversations] = useState([])
    const [loadingChats, setLoadingChats] = useState(true)
    const [activeConversationId, setActiveConversationId] = useState(null)
    const [messages, setMessages] = useState([])
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [inputValue, setInputValue] = useState('')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')
    const [aiUsed, setAiUsed] = useState(0)
    const [aiLimit, setAiLimit] = useState(15)
    const [aiUnlimited, setAiUnlimited] = useState(false)
    const [chatEnabled, setChatEnabled] = useState(true)
    const [sourcesCount, setSourcesCount] = useState(0)

    const hasChat = messages.length > 0
    const apiReady = isAiApiConfigured()
    const getAccessToken = useCallback(async () => getFreshAccessToken(supabase), [supabase])
    const inputDisabled = sending || !chatEnabled || (!aiUnlimited && aiLimit != null && aiUsed >= aiLimit)

    const handleRevealComplete = useCallback(messageId => {
        setMessages(prev =>
            prev.map(m => (m.id === messageId ? { ...m, animating: false, streaming: false } : m)),
        )
    }, [])

    const refreshSidebarMeta = useCallback(async () => {
        if (!supabase || !user) return
        const [usage, sources] = await Promise.all([
            fetchAiUsageState(supabase, user.id, subscription?.plan_tier),
            fetchLibrarySourcesCount(supabase, user.id),
        ])
        setAiUsed(usage.used)
        setAiLimit(usage.limit ?? 15)
        setAiUnlimited(usage.unlimited)
        setChatEnabled(usage.chat_enabled)
        setSourcesCount(sources)
    }, [supabase, user, subscription?.plan_tier])

    const refreshConversations = useCallback(async () => {
        if (!supabase || !user) {
            setConversations([])
            setLoadingChats(false)
            return
        }
        setLoadingChats(true)
        const { data, error: listErr } = await listAiConversations(supabase, user.id)
        if (listErr) console.error('listAiConversations', listErr)
        setConversations(data || [])
        setLoadingChats(false)
    }, [supabase, user])

    useEffect(() => {
        refreshConversations()
        refreshSidebarMeta()
    }, [refreshConversations, refreshSidebarMeta])

    const startNewChat = useCallback(() => {
        setActiveConversationId(null)
        setMessages([])
        setError('')
        setInputValue('')
    }, [])

    const loadConversation = useCallback(
        async conversationId => {
            if (!supabase || !conversationId) return
            setActiveConversationId(conversationId)
            setLoadingMessages(true)
            setError('')
            const { data, error: loadErr } = await loadAiMessages(supabase, conversationId)
            if (loadErr) {
                setError(loadErr.message || 'Could not load chat')
                setMessages([])
            } else {
                setMessages((data || []).map(mapDbMessageToUi))
            }
            setLoadingMessages(false)
        },
        [supabase],
    )

    const handleDeleteConversation = useCallback(
        async conversationId => {
            if (!supabase || !conversationId) return
            const { error: delErr } = await deleteAiConversation(supabase, conversationId)
            if (delErr) {
                setError(delErr.message || 'Could not delete chat')
                return
            }
            if (activeConversationId === conversationId) startNewChat()
            await refreshConversations()
        },
        [supabase, activeConversationId, startNewChat, refreshConversations],
    )

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
        if (!chatEnabled) {
            setError('AI chat is temporarily disabled. Please try again later.')
            return
        }
        if (!aiUnlimited && aiLimit != null && aiUsed >= aiLimit) {
            setError('Monthly AI message limit reached. Upgrade your plan in Billing.')
            return
        }

        setError('')
        setInputValue('')
        const history = messages
            .filter(m => !m.streaming && m.content)
            .map(m => ({ role: m.role, content: m.content }))
        const userMsg = { id: `u-${Date.now()}`, role: 'user', content: text }
        const assistantId = `a-${Date.now()}`
        setMessages(prev => [
            ...prev,
            userMsg,
            { id: assistantId, role: 'assistant', content: '', streaming: true, animating: true, sources: [], data_mode: 'reports' },
        ])
        setSending(true)

        let conversationId = activeConversationId
        const isFirstMessageInChat = !conversationId

        try {
            if (isFirstMessageInChat) {
                const { data: conv, error: createErr } = await createAiConversation(
                    supabase,
                    user.id,
                    titleFromMessage(text),
                )
                if (createErr || !conv) throw new Error(createErr?.message || 'Could not create chat')
                conversationId = conv.id
                setActiveConversationId(conv.id)
            }

            await saveAiMessage(supabase, {
                conversationId,
                role: 'user',
                content: text,
            })

            if (isFirstMessageInChat) {
                await updateAiConversationTitle(supabase, conversationId, titleFromMessage(text))
            }

            let sources = []
            let dataMode = 'reports'
            let accumulated = ''

            const applyToken = t => {
                accumulated += t
                setMessages(prev =>
                    prev.map(m => (m.id === assistantId ? { ...m, content: m.content + t } : m)),
                )
            }

            const response = await sendAiChat({ message: text, history, stream: true, getAccessToken })
            const contentType = response.headers.get('content-type') || ''

            if (contentType.includes('application/json')) {
                const data = await response.json()
                accumulated = data.answer || ''
                sources = data.sources || []
                dataMode = data.data_mode || dataMode
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantId
                            ? { ...m, content: accumulated, streaming: false, animating: true, sources, data_mode: dataMode }
                            : m,
                    ),
                )
            } else {
                await consumeAiChatStream(response, {
                    onToken: applyToken,
                    onDone: meta => {
                        sources = meta.sources || []
                        dataMode = meta.data_mode || dataMode
                    },
                })
                if (!accumulated.trim()) {
                    const data = await sendAiChatJson({ message: text, history, getAccessToken })
                    accumulated = data.answer || ''
                    sources = data.sources || []
                    dataMode = data.data_mode || dataMode
                    setMessages(prev =>
                        prev.map(m =>
                            m.id === assistantId
                                ? { ...m, content: accumulated, streaming: false, animating: true, sources, data_mode: dataMode }
                                : m,
                        ),
                    )
                } else {
                    setMessages(prev =>
                        prev.map(m =>
                            m.id === assistantId
                                ? {
                                      ...m,
                                      content: accumulated,
                                      streaming: false,
                                      animating: true,
                                      sources,
                                      data_mode: dataMode,
                                  }
                                : m,
                        ),
                    )
                }
            }

            const { data: savedAssistant } = await saveAiMessage(supabase, {
                conversationId,
                role: 'assistant',
                content: accumulated,
                citations: sources,
            })
            if (savedAssistant) {
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantId
                            ? { ...m, dbId: savedAssistant.id, sources: m.sources?.length ? m.sources : sources }
                            : m,
                    ),
                )
            }

            await touchAiConversation(supabase, conversationId)
            await recordAiMessageUsage(supabase, user.id, {
                conversation_id: conversationId,
                sources_count: sources.length,
            })
            await Promise.all([refreshConversations(), refreshSidebarMeta()])
        } catch (e) {
            setMessages(prev => prev.filter(m => m.id !== assistantId && m.id !== userMsg.id))
            if (isFirstMessageInChat && conversationId) {
                await deleteAiConversation(supabase, conversationId)
                setActiveConversationId(null)
            }
            setError(e?.message || 'AI request failed')
        } finally {
            setSending(false)
        }
    }

    const sidebarProps = {
        navigate,
        conversations,
        activeConversationId,
        loadingChats,
        onSelectConversation: id => {
            loadConversation(id)
            setMobileSidebarOpen(false)
        },
        onNewChat: () => {
            startNewChat()
            setMobileSidebarOpen(false)
        },
        onDeleteConversation: handleDeleteConversation,
        profile,
        subscription,
        aiUsed,
        aiLimit: aiUnlimited ? null : aiLimit,
        sourcesCount,
    }

    const chatBarProps = {
        inputValue,
        onInputChange: e => setInputValue(e.target.value),
        onSend: handleSend,
        hasChat,
        layoutId: 'ai-chat-bar',
        disabled: inputDisabled,
    }

    const drawerWidth = desktopSidebarOpen ? sidebarWidth : sidebarCollapsed

    return (
        <LayoutGroup>
            <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
                <Drawer
                    variant="permanent"
                    sx={{
                        width: drawerWidth,
                        display: { xs: 'none', lg: 'block' },
                        flexShrink: 0,
                        transition: theme => theme.transitions.create('width', { duration: 280, easing: 'ease' }),
                        '& .MuiDrawer-paper': {
                            width: drawerWidth,
                            bgcolor: 'background.paper',
                            borderRight: '1px solid',
                            borderColor: 'divider',
                            position: 'relative',
                            overflowX: 'hidden',
                            transition: theme => theme.transitions.create('width', { duration: 280, easing: 'ease' }),
                        },
                    }}
                >
                    <AISidebar {...sidebarProps} isCollapsed={!desktopSidebarOpen} />
                </Drawer>

                <Drawer
                    variant="temporary"
                    open={mobileSidebarOpen}
                    onClose={() => setMobileSidebarOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', lg: 'none' },
                        '& .MuiDrawer-paper': { width: sidebarWidth },
                    }}
                    SlideProps={{ timeout: 280 }}
                >
                    <AISidebar {...sidebarProps} isCollapsed={false} onCloseDrawer={() => setMobileSidebarOpen(false)} />
                </Drawer>

                <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <Box
                        component={motion.header}
                        {...aiHeaderEnter}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 2,
                            py: 1.5,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'rgba(255,255,255,0.92)',
                            backdropFilter: 'blur(12px)',
                        }}
                    >
                        <IconButton
                            component={motion.button}
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={toggleSidebar}
                            size="small"
                            aria-label="Toggle sidebar"
                        >
                            <MenuIcon />
                        </IconButton>
                        <Box
                            component={motion.button}
                            type="button"
                            onClick={toggleSidebar}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            aria-label="Toggle chat sidebar"
                            sx={{
                                border: 'none',
                                background: 'none',
                                p: 0,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <Box component="img" src="/logo.png" alt="Researcha" sx={{ height: 28, width: 'auto' }} />
                        </Box>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ ml: 0.5 }}>
                            Researcha AI
                        </Typography>
                        {!user && (
                            <Button component={Link} to="/login" state={{ redirectTo: '/ai' }} size="small" sx={{ ml: 'auto' }}>
                                Sign in
                            </Button>
                        )}
                    </Box>

                    <AnimatePresence>
                        {error && (
                            <motion.div key="error" {...aiAlertSlide} style={{ margin: '8px 16px 0' }}>
                                <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: 2 }}>
                                    {error}
                                </Alert>
                            </motion.div>
                        )}
                        {!apiReady && (
                            <motion.div key="api-warn" {...aiAlertSlide} style={{ margin: '8px 16px 0' }}>
                                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                                    Set <code>VITE_AI_API_URL</code> in your frontend <code>.env</code> and run the backend (
                                    <code>uvicorn</code> in <code>backend/</code>).
                                </Alert>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <Box sx={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
                        <AnimatePresence mode="wait">
                            {loadingMessages ? (
                                <Stack
                                    key="loading"
                                    component={motion.div}
                                    {...aiLoadingFade}
                                    alignItems="center"
                                    justifyContent="center"
                                    sx={{ height: '100%' }}
                                >
                                    <CircularProgress color="secondary" />
                                </Stack>
                            ) : hasChat ? (
                                <Box
                                    key="chat"
                                    component={motion.div}
                                    {...aiPanelSwitch}
                                    sx={{ position: 'absolute', inset: 0 }}
                                >
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            overflow: 'auto',
                                            p: { xs: 2, md: 3 },
                                            pb: AI_CHAT_BAR_FLOAT_HEIGHT,
                                            scrollBehavior: 'smooth',
                                        }}
                                    >
                                        <Stack spacing={3} sx={{ maxWidth: 720, mx: 'auto' }}>
                                            <AnimatePresence initial={false}>
                                                {messages.map(msg => {
                                                    const isEmptyStream =
                                                        msg.role === 'assistant' && msg.streaming && !String(msg.content || '').trim()
                                                    if (isEmptyStream) return null
                                                    return (
                                                        <motion.div key={msg.id} layout="position">
                                                            <AIMessageBubble
                                                                msg={msg}
                                                                onRevealComplete={
                                                                    msg.role === 'assistant' && msg.animating
                                                                        ? () => handleRevealComplete(msg.id)
                                                                        : undefined
                                                                }
                                                            />
                                                        </motion.div>
                                                    )
                                                })}
                                            </AnimatePresence>
                                            <AnimatePresence>
                                                {sending &&
                                                    messages.some(
                                                        m => m.role === 'assistant' && m.streaming && !String(m.content || '').trim(),
                                                    ) && <AITypingIndicator key="typing" />}
                                            </AnimatePresence>
                                        </Stack>
                                    </Box>
                                    <AIChatBar {...chatBarProps} position="floating" />
                                </Box>
                            ) : (
                                <AIWelcome key="welcome" chatBarProps={chatBarProps} />
                            )}
                        </AnimatePresence>
                    </Box>
                </Box>
            </Box>
        </LayoutGroup>
    )
}
