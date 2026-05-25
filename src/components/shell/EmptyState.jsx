import React from 'react'
import { motion } from 'framer-motion'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { fadeInScale } from '../motion/motionPresets'

export default function EmptyState({ title, description, children }) {
    return (
        <Box
            component={motion.div}
            {...fadeInScale}
            sx={{
                py: 5,
                px: 3,
                borderRadius: 2,
                border: '1px dashed',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                textAlign: 'center',
                maxWidth: 520,
                mx: 'auto',
            }}
        >
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: children ? 2 : 0, lineHeight: 1.65 }}>
                {description}
            </Typography>
            {children}
        </Box>
    )
}
