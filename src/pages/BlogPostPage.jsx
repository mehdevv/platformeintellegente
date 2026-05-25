import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'

function normalizeSources(raw) {
    if (!Array.isArray(raw)) return []
    return raw
        .map(s => ({ label: String(s?.label || '').trim(), url: String(s?.url || '').trim() }))
        .filter(s => s.url.length > 0)
}

export default function BlogPostPage() {
    const { slug } = useParams()
    const { t } = useTranslation()
    const { supabase } = useAuth()
    const [post, setPost] = useState(undefined)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            if (!supabase || !slug) {
                setPost(null)
                setLoading(false)
                return
            }
            const { data } = await supabase
                .from('blog_posts')
                .select('*')
                .eq('slug', slug)
                .eq('status', 'published')
                .lte('published_at', new Date().toISOString())
                .maybeSingle()
            if (!cancelled) {
                setPost(data || null)
                setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [supabase, slug])

    const tag = post ? (post.seo && post.seo.tag) || 'News' : ''
    const date = post?.published_at ? new Date(post.published_at).toLocaleDateString() : ''
    const sources = post ? normalizeSources(post.sources) : []

    return (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
            <Header />
            <Box component="main" sx={{ pt: '72px', pb: 8 }}>
                <Container maxWidth="md"  sx={{ py: 4, maxWidth: 'min(720px, 100%) !important' }}>
                    <Button component={Link} to="/blog" size="small" sx={{ mb: 3, fontWeight: 700 }}>
                        {t('common.back')}
                    </Button>
                    {loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={28} />
                        </Box>
                    )}
                    {!loading && post ? (
                        <>
                            <Stack direction="row" gap={1} sx={{ mb: 2 }} flexWrap="wrap" alignItems="center">
                                <Chip label={tag} size="small" color="secondary" />
                                <Typography variant="caption" color="text.secondary">
                                    {date}
                                </Typography>
                            </Stack>
                            <Typography
                                variant="h3"
                                sx={{
                                    fontFamily: '"League Spartan", sans-serif',
                                    fontWeight: 800,
                                    mb: 3,
                                    overflowWrap: 'anywhere',
                                    wordBreak: 'break-word',
                                    lineHeight: 1.15,
                                    fontSize: { xs: '1.75rem', sm: '2.25rem' },
                                }}
                            >
                                {post.title}
                            </Typography>
                            {post.cover_image_url && (
                                <Box
                                    sx={{
                                        mb: 4,
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                        maxHeight: 420,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        bgcolor: 'action.hover',
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={post.cover_image_url}
                                        alt=""
                                        sx={{ width: '100%', maxHeight: 420, objectFit: 'cover', display: 'block' }}
                                    />
                                </Box>
                            )}
                            <Box
                                component="article"
                                sx={{
                                    color: 'text.secondary',
                                    lineHeight: 1.85,
                                    fontSize: '1.0625rem',
                                    maxWidth: '100%',
                                    overflowX: 'hidden',
                                }}
                            >
                                {post.body ? (
                                    <Typography
                                        component="div"
                                        variant="body1"
                                        sx={{
                                            whiteSpace: 'pre-wrap',
                                            overflowWrap: 'anywhere',
                                            wordBreak: 'break-word',
                                            '& a': { color: 'secondary.main', overflowWrap: 'anywhere', wordBreak: 'break-all' },
                                        }}
                                    >
                                        {post.body}
                                    </Typography>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                        {t('blog.noBody')}
                                    </Typography>
                                )}
                            </Box>
                            {sources.length > 0 && (
                                <>
                                    <Divider sx={{ my: 4 }} />
                                    <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                                        {t('blog.sources')}
                                    </Typography>
                                    <Stack component="ul" spacing={1.25} sx={{ m: 0, pl: 2.5, listStyleType: 'disc' }}>
                                        {sources.map((s, i) => (
                                            <Typography component="li" key={`${s.url}-${i}`} variant="body2" sx={{ pl: 0.5 }}>
                                                <Box
                                                    component="a"
                                                    href={s.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    sx={{
                                                        color: 'secondary.main',
                                                        fontWeight: 600,
                                                        overflowWrap: 'anywhere',
                                                        wordBreak: 'break-all',
                                                    }}
                                                >
                                                    {s.label || s.url}
                                                </Box>
                                            </Typography>
                                        ))}
                                    </Stack>
                                </>
                            )}
                        </>
                    ) : (
                        !loading && (
                            <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                                {t('blog.notFound')}
                            </Typography>
                        )
                    )}
                </Container>
            </Box>
            <Footer />
        </Box>
    )
}
