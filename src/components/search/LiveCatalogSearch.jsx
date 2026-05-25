import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Popper from '@mui/material/Popper'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import ListSubheader from '@mui/material/ListSubheader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import SearchIcon from '@mui/icons-material/Search'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { searchCatalog } from '../../lib/catalogSearch'
import { reportPublicPath } from '../../lib/reportPath'

const DEBOUNCE_MS = 280

const popperSameWidth = {
    name: 'sameWidth',
    enabled: true,
    phase: 'beforeWrite',
    requires: ['computeStyles'],
    fn: ({ state }) => {
        state.styles.popper.width = `${state.rects.reference.width}px`
    },
}

/**
 * @param {{
 *   variant?: 'header' | 'hero',
 *   placeholder?: string,
 *   onNavigate?: () => void,
 *   sx?: object,
 * }} props
 */
export default function LiveCatalogSearch({ variant = 'header', placeholder, onNavigate, sx }) {
    const { t } = useTranslation()
    const { supabase } = useAuth()
    const listId = useId()
    const panelRef = useRef(null)
    const [anchorEl, setAnchorEl] = useState(null)
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [reports, setReports] = useState([])
    const [sectors, setSectors] = useState([])
    const [error, setError] = useState('')

    const isHero = variant === 'hero'
    const trimmed = query.trim()
    const showPanel = open && trimmed.length > 0

    const runSearch = useCallback(
        async q => {
            if (!supabase) return
            const safe = q.trim()
            if (safe.length < 2) {
                setReports([])
                setSectors([])
                setError('')
                setLoading(false)
                return
            }
            setLoading(true)
            setError('')
            const { reports: r, sectors: s, error: err } = await searchCatalog(supabase, safe)
            setReports(r)
            setSectors(s)
            setError(err || '')
            setLoading(false)
        },
        [supabase],
    )

    useEffect(() => {
        if (trimmed.length < 2) {
            setReports([])
            setSectors([])
            setLoading(false)
            return undefined
        }
        const id = window.setTimeout(() => void runSearch(trimmed), DEBOUNCE_MS)
        return () => window.clearTimeout(id)
    }, [trimmed, runSearch])

    useEffect(() => {
        const onDocDown = e => {
            if (anchorEl?.contains(e.target) || panelRef.current?.contains(e.target)) return
            setOpen(false)
        }
        document.addEventListener('mousedown', onDocDown)
        return () => document.removeEventListener('mousedown', onDocDown)
    }, [anchorEl])

    const pickResult = () => {
        setOpen(false)
        setQuery('')
        onNavigate?.()
    }

    const hasResults = sectors.length > 0 || reports.length > 0
    const placeholderText = placeholder || t('search.placeholder')

    const input = (
        <TextField
            fullWidth
            size={isHero ? 'medium' : 'small'}
            value={query}
            onChange={e => {
                setQuery(e.target.value)
                setOpen(true)
            }}
            onFocus={() => trimmed.length >= 2 && setOpen(true)}
            onKeyDown={e => {
                if (e.key === 'Enter') e.preventDefault()
                if (e.key === 'Escape') setOpen(false)
            }}
            placeholder={placeholderText}
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={showPanel ? listId : undefined}
            aria-autocomplete="list"
            variant={isHero ? 'standard' : 'outlined'}
            slotProps={{
                input: {
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon sx={{ color: isHero ? '#64748b' : 'text.secondary', ml: isHero ? 1 : 0 }} />
                        </InputAdornment>
                    ),
                },
            }}
            sx={
                isHero
                    ? {
                          px: 1.5,
                          py: 0.5,
                          '& input': { fontSize: '0.9375rem', py: '12px' },
                          '& .MuiInput-underline:before': { borderBottom: 'none' },
                          '& .MuiInput-underline:after': { borderBottom: 'none' },
                          '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
                      }
                    : undefined
            }
        />
    )

    const resultsPanel = (
        <Paper
            id={listId}
            ref={panelRef}
            role="listbox"
            elevation={12}
            sx={{
                maxHeight: 360,
                overflow: 'auto',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
            }}
        >
            {trimmed.length < 2 && (
                <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5 }}>
                    {t('search.typeToSearch')}
                </Typography>
            )}
            {trimmed.length >= 2 && loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={22} color="secondary" />
                </Box>
            )}
            {!loading && error && (
                <Typography variant="body2" color="error" sx={{ px: 2, py: 1.5 }}>
                    {error}
                </Typography>
            )}
            {trimmed.length >= 2 && !loading && !error && !hasResults && (
                <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5 }}>
                    {t('search.noResults')}
                </Typography>
            )}
            {trimmed.length >= 2 && !loading && !error && hasResults && (
                <List dense disablePadding>
                    {sectors.length > 0 && (
                        <>
                            <ListSubheader sx={{ lineHeight: 2, fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.08em' }}>
                                {t('search.sectors')}
                            </ListSubheader>
                            {sectors.map(s => (
                                <ListItemButton
                                    key={s.id}
                                    component={Link}
                                    to={`/sectors/${s.slug}`}
                                    onClick={pickResult}
                                    role="option"
                                >
                                    <ListItemText primary={s.name} secondary={t('search.sectorHint')} primaryTypographyProps={{ fontWeight: 700 }} />
                                </ListItemButton>
                            ))}
                        </>
                    )}
                    {sectors.length > 0 && reports.length > 0 && <Divider />}
                    {reports.length > 0 && (
                        <>
                            <ListSubheader sx={{ lineHeight: 2, fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.08em' }}>
                                {t('search.reports')}
                            </ListSubheader>
                            {reports.map(r => (
                                <ListItemButton
                                    key={r.id}
                                    component={Link}
                                    to={reportPublicPath(r)}
                                    onClick={pickResult}
                                    role="option"
                                >
                                    <ListItemText
                                        primary={r.title}
                                        secondary={r.sectors?.name || undefined}
                                        primaryTypographyProps={{ fontWeight: 600, noWrap: true }}
                                        secondaryTypographyProps={{ noWrap: true }}
                                    />
                                </ListItemButton>
                            ))}
                        </>
                    )}
                </List>
            )}
        </Paper>
    )

    const anchor = (
        <Box
            ref={setAnchorEl}
            sx={{
                width: '100%',
                maxWidth: { xs: '100%', md: '100%' },
                mx: { xs: 'auto', md: 0 },
                ...sx,
            }}
        >
            {isHero ? (
                <Box
                    className="hero-search-glow"
                    sx={{
                        bgcolor: '#fff',
                        borderRadius: 2,
                        border: '1px solid #cbd5e1',
                    }}
                >
                    {input}
                </Box>
            ) : (
                input
            )}
        </Box>
    )

    return (
        <>
            {anchor}
            <Popper
                open={showPanel}
                anchorEl={anchorEl}
                placement="bottom-start"
                disablePortal={false}
                modifiers={[popperSameWidth, { name: 'offset', options: { offset: [0, 6] } }]}
                sx={{ zIndex: theme => theme.zIndex.modal + 2 }}
            >
                {resultsPanel}
            </Popper>
        </>
    )
}
