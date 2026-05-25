import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { reportPublicPath } from '../lib/reportPath'

export default function MyReportsPage() {
    const { t } = useTranslation()
    const { supabase, user } = useAuth()
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            if (!supabase || !user) {
                setLoading(false)
                return
            }
            const { data, error: e } = await supabase
                .from('user_report_entitlements')
                .select('id, source, expires_at, reports(id, title, slug)')
                .eq('user_id', user.id)
                .order('granted_at', { ascending: false })
            if (cancelled) return
            if (e) setError(e.message)
            else setRows(data || [])
            setLoading(false)
        })()
        return () => {
            cancelled = true
        }
    }, [supabase, user])

    return (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
            <Header />
            <Box component="main" sx={{ pt: '72px', pb: 8 }}>
                <Container maxWidth="lg" >
                    <Typography variant="h4" sx={{ fontFamily: '"League Spartan", sans-serif', fontWeight: 800, mb: 1 }}>
                        {t('myReports.title')}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mb: 4 }}>
                        {t('myReports.subtitle')}
                    </Typography>
                    {loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                            <CircularProgress color="secondary" />
                        </Box>
                    )}
                    {error && <Alert severity="error">{error}</Alert>}
                    {!loading && !rows.length && !error && <Alert severity="info">No entitled reports yet. Browse the catalogue or complete a purchase.</Alert>}
                    {!!rows.length && (
                        <TableContainer component={Paper} className="card-lift">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>{t('myReports.colReport')}</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{t('myReports.colAccess')}</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{t('myReports.colExpiry')}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }} />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map(row => (
                                        <TableRow key={row.id} hover>
                                            <TableCell>{row.reports?.title || '—'}</TableCell>
                                            <TableCell>
                                                <Chip size="small" label={row.source} color="secondary" variant="outlined" />
                                            </TableCell>
                                            <TableCell>{row.expires_at ? new Date(row.expires_at).toLocaleDateString() : '—'}</TableCell>
                                            <TableCell align="right">
                                                {row.reports && (
                                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                        <Button
                                                            component={Link}
                                                            to={`${reportPublicPath(row.reports)}/read`}
                                                            size="small"
                                                            variant="contained"
                                                            color="secondary"
                                                        >
                                                            Read
                                                        </Button>
                                                        <Button component={Link} to={reportPublicPath(row.reports)} size="small" variant="outlined">
                                                            Details
                                                        </Button>
                                                    </Stack>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                    <Button component={Link} to="/reports" variant="outlined" sx={{ mt: 3, fontWeight: 700 }}>
                        {t('myReports.browse')}
                    </Button>
                </Container>
            </Box>
            <Footer />
        </Box>
    )
}
