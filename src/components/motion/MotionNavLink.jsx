import React from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import Box from '@mui/material/Box'

const activeSx = {
    bgcolor: 'rgba(25, 127, 148, 0.1)',
    color: 'secondary.dark',
    fontWeight: 700,
}

const baseSx = {
    px: 2,
    py: 1.25,
    borderRadius: 1,
    borderLeft: '3px solid',
    borderLeftColor: 'transparent',
    color: 'text.secondary',
    fontWeight: 500,
    fontSize: '0.875rem',
    transition: 'color 0.2s ease',
    '&:hover': { bgcolor: 'rgba(75, 91, 114, 0.06)', color: 'text.primary' },
}

/** Animated sidebar / dashboard nav item. */
export default function MotionNavLink({ to, end, onClick, children, label }) {
    return (
        <NavLink to={to} end={end} onClick={onClick} style={{ textDecoration: 'none', color: 'inherit' }}>
            {({ isActive }) => (
                <Box
                    component={motion.div}
                    layout
                    sx={{ ...baseSx, ...(isActive ? activeSx : {}), borderLeftColor: isActive ? 'secondary.main' : 'transparent' }}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                >
                    {children || label}
                </Box>
            )}
        </NavLink>
    )
}
