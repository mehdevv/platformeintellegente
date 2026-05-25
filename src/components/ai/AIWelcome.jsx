import React from 'react'
import { motion } from 'framer-motion'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import LanguageIcon from '@mui/icons-material/Language'
import AIChatBar from './AIChatBar'
import { aiWelcomeIcon, aiWelcomeItem, aiWelcomeStagger } from './aiMotionPresets'

const SUGGESTIONS = [
    'Summarize trends in my retail sector reports',
    'Compare revenue growth across my library',
    'What are the main risks in my latest report?',
]

export default function AIWelcome({ sourcesCount, chatBarProps }) {
    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 2,
                background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(25, 127, 148, 0.06), transparent 70%)',
            }}
        >
            <Stack
                component={motion.div}
                variants={aiWelcomeStagger}
                initial="hidden"
                animate="visible"
                alignItems="center"
                spacing={3}
                sx={{ maxWidth: 800, width: '100%' }}
            >
                <Stack component={motion.div} variants={aiWelcomeItem} direction="row" alignItems="center" gap={2}>
                    <Box
                        component={motion.div}
                        variants={aiWelcomeIcon}
                        sx={{
                            width: 56,
                            height: 56,
                            borderRadius: 3,
                            background: 'linear-gradient(135deg, #1a2332 0%, #197f94 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 12px 32px rgba(25, 127, 148, 0.3)',
                        }}
                    >
                        <AutoAwesomeIcon sx={{ fontSize: 28, color: '#fff' }} />
                    </Box>
                    <Typography
                        variant="h4"
                        sx={{
                            fontFamily: '"Georgia", "Libre Baskerville", serif',
                            fontWeight: 400,
                            letterSpacing: '-0.02em',
                        }}
                    >
                        Ask your reports
                    </Typography>
                </Stack>

                <Typography
                    component={motion.p}
                    variants={aiWelcomeItem}
                    variant="body2"
                    color="text.secondary"
                    textAlign="center"
                    sx={{ lineHeight: 1.75, maxWidth: 520 }}
                >
                    With reports in your library, answers use your PDF research with statistics, tables, and charts.
                    Without reports, the assistant searches public web sources.
                </Typography>

                {sourcesCount > 0 && (
                    <Chip
                        component={motion.div}
                        variants={aiWelcomeItem}
                        icon={<MenuBookIcon sx={{ fontSize: '16px !important' }} />}
                        label={`${sourcesCount} report${sourcesCount === 1 ? '' : 's'} in your library`}
                        color="secondary"
                        variant="outlined"
                        sx={{ fontWeight: 600, borderRadius: 2 }}
                    />
                )}

                <Stack component={motion.div} variants={aiWelcomeItem} direction="row" flexWrap="wrap" gap={1} justifyContent="center">
                    <Chip
                        size="small"
                        icon={<MenuBookIcon sx={{ fontSize: '14px !important' }} />}
                        label="Report RAG"
                        variant="outlined"
                        sx={{ borderRadius: 2, fontWeight: 600 }}
                    />
                    <Chip
                        size="small"
                        icon={<LanguageIcon sx={{ fontSize: '14px !important' }} />}
                        label="Web research"
                        variant="outlined"
                        sx={{ borderRadius: 2, fontWeight: 600 }}
                    />
                </Stack>

                <Stack component={motion.div} variants={aiWelcomeItem} spacing={1} sx={{ width: '100%' }}>
                    <Typography variant="caption" color="text.secondary" textAlign="center" fontWeight={600} letterSpacing="0.06em">
                        TRY ASKING
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center">
                        {SUGGESTIONS.map(text => (
                            <Box
                                key={text}
                                component={motion.button}
                                type="button"
                                onClick={() => chatBarProps.onInputChange?.({ target: { value: text } })}
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                                sx={{
                                    border: 'none',
                                    background: 'none',
                                    p: 0,
                                    cursor: 'pointer',
                                }}
                            >
                                <Chip
                                    label={text}
                                    variant="outlined"
                                    sx={{
                                        borderRadius: 3,
                                        maxWidth: 280,
                                        height: 'auto',
                                        py: 1,
                                        transition: 'border-color 0.2s',
                                        '&:hover': { borderColor: 'secondary.main' },
                                        '& .MuiChip-label': { whiteSpace: 'normal', lineHeight: 1.4 },
                                    }}
                                />
                            </Box>
                        ))}
                    </Stack>
                </Stack>

                <Box component={motion.div} variants={aiWelcomeItem} sx={{ width: '100%' }}>
                    <AIChatBar {...chatBarProps} position="inline" />
                </Box>
            </Stack>
        </Box>
    )
}
