import React from 'react'
import { motion } from 'framer-motion'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import AIChatBar from './AIChatBar'
import { aiWelcomeItem, aiWelcomeStagger } from './aiMotionPresets'

export default function AIWelcome({ chatBarProps }) {
    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 2,
            }}
        >
            <Stack
                component={motion.div}
                variants={aiWelcomeStagger}
                initial="hidden"
                animate="visible"
                alignItems="center"
                spacing={4}
                sx={{ maxWidth: 640, width: '100%' }}
            >
                <Typography
                    component={motion.h1}
                    variants={aiWelcomeItem}
                    variant="h5"
                    fontWeight={500}
                    textAlign="center"
                    color="text.primary"
                >
                    What would you like to know?
                </Typography>
                <Box component={motion.div} variants={aiWelcomeItem} sx={{ width: '100%' }}>
                    <AIChatBar {...chatBarProps} position="inline" />
                </Box>
            </Stack>
        </Box>
    )
}
