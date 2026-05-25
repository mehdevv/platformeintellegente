import React from 'react'
import { motion } from 'framer-motion'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import { aiBubbleAssistant, aiTypingPulse } from './aiMotionPresets'

export default function AITypingIndicator() {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
            <Stack alignItems="flex-start" gap={0.75} sx={{ maxWidth: 'min(85%, 640px)' }}>
                <Box
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
                <Box
                    component={motion.div}
                    {...aiBubbleAssistant}
                    sx={{
                        px: 2.5,
                        py: 2,
                        borderRadius: '20px 20px 20px 6px',
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: '0 4px 20px rgba(26, 35, 50, 0.06)',
                    }}
                >
                    <Stack direction="row" alignItems="center" gap={0.75}>
                        {[0, 1, 2].map(i => (
                            <Box
                                key={i}
                                component={motion.span}
                                {...aiTypingPulse}
                                transition={{ ...aiTypingPulse.transition, delay: i * 0.15 }}
                                sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    bgcolor: 'secondary.main',
                                    display: 'block',
                                }}
                            />
                        ))}
                    </Stack>
                </Box>
            </Stack>
        </Box>
    )
}
