import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { reportPublicPath } from '../lib/reportPath'

export default function SearchPage() {
    const { t } = useTranslation()
    const { supabase } = useAuth()
    const [params] = useSearchParams()
    const q = (params.get('q') || '').trim()
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            if (!supabase || !q) {
                setRows([])
                return
            }
            setLoading(true)
            setError('')
            const safe = q.replace(/[%_,]/g, '')
            const { data, error: e } = await supabase
                .from('reports')
                .select('id, slug, title, summary, sectors(name)')
                .eq('status', 'published')
                .or(`title.ilike.%${safe}%,summary.ilike.%${safe}%`)
                .limit(25)
            if (cancelled) return
            if (e) setError(e.message)
            else setRows(data || [])
            setLoading(false)
        })()
        return () => {
            cancelled = true
        }
    }, [supabase, q])

    return (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
            <Header />
            <Box component="main" sx={{ pt: '72px', pb: 8 }}>
                <Container maxWidth="md" >
                    <Typography variant="h4" sx={{ fontFamily: '"League Spartan", sans-serif', fontWeight: 800, mb: 2 }}>
                        {t('search.title')}
                    </Typography>
                    {!q ? (
                        <Typography color="text.secondary">{t('search.noQuery')}</Typography>
                    ) : (
                        <>
                            <Typography color="text.secondary" sx={{ mb: 3 }}>
                                {t('search.for')}: <strong>{q}</strong>
                            </Typography>
                            {loading && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                    <CircularProgress size={32} />
                                </Box>
                            )}
                            {error && <Alert severity="error">{error}</Alert>}
                            {!loading && !rows.length && !error && <Alert severity="info">No matching published reports.</Alert>}
                            <Stack spacing={2}>
                                {rows.map(r => (
                                    <Card key={r.id} className="card-lift">
                                        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                                            <Box>
                                                <Typography fontWeight={600}>{r.title}</Typography>
                                                {r.sectors?.name && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {r.sectors.name}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Button component={Link} to={reportPublicPath(r)} size="small" variant="contained" color="secondary">
                                                {t('search.open')}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Stack>
                        </>
                    )}
                </Container>
            </Box>
            <Footer />
        </Box>
    )
}
