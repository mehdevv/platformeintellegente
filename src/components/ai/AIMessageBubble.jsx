import React from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import AIAssistantMessage from './AIAssistantMessage'
import {
    aiAvatarPop,
    aiBubbleAssistant,
    aiBubbleUser,
    aiSourceChipVariant,
    aiChatListStagger,
} from './aiMotionPresets'

function SourceChip({ source }) {
    const label = source.report_title || source.title || (source.source_type === 'web' ? 'Web source' : 'Report')
    if (source.url) {
        return (
            <Chip
                size="small"
                label={label}
                variant="outlined"
                component="a"
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                clickable
                sx={{ borderRadius: 2, transition: 'border-color 0.2s', '&:hover': { borderColor: 'secondary.main' } }}
            />
        )
    }
    if (source.report_id) {
        return (
            <Chip
                size="small"
                label={label}
                variant="outlined"
                component={Link}
                to={`/reports/${source.report_id}`}
                sx={{ borderRadius: 2, transition: 'border-color 0.2s', '&:hover': { borderColor: 'secondary.main' } }}
            />
        )
    }
    return <Chip size="small" label={label} variant="outlined" sx={{ borderRadius: 2 }} />
}

export default function AIMessageBubble({ msg, onRevealComplete }) {
    const isUser = msg.role === 'user'
    const showSources = !isUser && msg.sources?.length > 0 && !msg.streaming && !msg.animating
    const modeLabel =
        msg.data_mode === 'web' ? 'Web research' : msg.data_mode === 'reports' ? 'Your reports' : null
    const bubblePreset = isUser ? aiBubbleUser : aiBubbleAssistant

    return (
        <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
            <Stack alignItems={isUser ? 'flex-end' : 'flex-start'} gap={0.75} sx={{ maxWidth: 'min(85%, 640px)' }}>
                {!isUser && (
                    <Box
                        component={motion.div}
                        {...aiAvatarPop}
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 2.5,
                            background: 'linear-gradient(135deg, #1a2332 0%, #197f94 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 14px rgba(25, 127, 148, 0.35)',
                        }}
                    >
                        <SmartToyIcon sx={{ color: '#fff', fontSize: 20 }} />
                    </Box>
                )}
                <Box
                    component={motion.div}
                    {...bubblePreset}
                    layout
                    sx={{
                        px: { xs: 2, md: 2.5 },
                        py: { xs: 1.75, md: 2 },
                        borderRadius: isUser ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                        bgcolor: isUser ? 'primary.main' : 'background.paper',
                        color: isUser ? '#fff' : 'text.primary',
                        border: isUser ? 'none' : '1px solid',
                        borderColor: isUser ? 'transparent' : 'divider',
                        boxShadow: isUser
                            ? '0 8px 24px rgba(26, 35, 50, 0.18)'
                            : '0 4px 20px rgba(26, 35, 50, 0.06)',
                        transition: 'box-shadow 0.25s ease',
                    }}
                >
                    {isUser ? (
                        <Typography variant="body2" sx={{ lineHeight: 1.7, whiteSpace: 'pre-wrap', fontSize: '0.9375rem' }}>
                            {msg.content}
                        </Typography>
                    ) : (
                        <AIAssistantMessage
                            content={msg.content || ''}
                            streaming={Boolean(msg.streaming)}
                            animating={Boolean(msg.animating)}
                            onRevealComplete={onRevealComplete}
                        />
                    )}
                </Box>
                <AnimatePresence>
                    {modeLabel && !msg.streaming && !msg.animating && (
                        <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Chip
                                size="small"
                                label={modeLabel}
                                color={msg.data_mode === 'web' ? 'info' : 'secondary'}
                                variant="outlined"
                                sx={{ borderRadius: 2, fontWeight: 600, fontSize: '0.7rem' }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
                <AnimatePresence>
                    {showSources && (
                        <motion.div
                            variants={aiChatListStagger}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                        >
                            <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 0.25 }}>
                                {msg.sources.map((s, i) => (
                                    <motion.div key={i} variants={aiSourceChipVariant}>
                                        <SourceChip source={s} />
                                    </motion.div>
                                ))}
                            </Stack>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Stack>
        </Box>
    )
}
