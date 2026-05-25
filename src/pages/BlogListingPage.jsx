import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'

export default function BlogListingPage() {
    const { t } = useTranslation()
    const { supabase } = useAuth()
    const [dbPosts, setDbPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState('')

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            if (!supabase) {
                setDbPosts([])
                setLoading(false)
                return
            }
            setLoadError('')
            const { data, error } = await supabase
                .from('blog_posts')
                .select('slug, title, excerpt, published_at, seo, cover_image_url')
                .eq('status', 'published')
                .lte('published_at', new Date().toISOString())
                .order('published_at', { ascending: false })
                .limit(24)
            if (!cancelled) {
                if (error) {
                    setLoadError(error.message)
                    setDbPosts([])
                } else setDbPosts(data || [])
                setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [supabase])

    const posts = (dbPosts || []).map(p => ({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt || '',
        date: p.published_at ? new Date(p.published_at).toLocaleDateString() : '',
        tag: (p.seo && p.seo.tag) || 'News',
        cover: p.cover_image_url || null,
    }))

    return (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
            <Header />
            <Box component="main" sx={{ pt: '72px', pb: 8 }}>
                <Box className="page-hero-slant" sx={{ py: { xs: 6, md: 9 }, position: 'relative', overflow: 'hidden' }}>
                    <Box className="diagonal-stripes" sx={{ opacity: 0.5 }} aria-hidden />
                    <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                        <Typography variant="h3" sx={{ fontFamily: '"League Spartan", sans-serif', fontWeight: 800, mb: 1 }}>
                            {t('blog.title')}
                        </Typography>
                        <Typography color="text.secondary" sx={{ maxWidth: 560 }}>
                            {t('blog.subtitle')}
                        </Typography>
                    </Container>
                </Box>
                <Container maxWidth="lg" sx={{ mt: -2 }}>
                    {loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                            <CircularProgress color="secondary" />
                        </Box>
                    )}
                    {loadError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {loadError}
                        </Alert>
                    )}
                    {!loading && posts.length === 0 && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            {t('blog.empty')}
                        </Alert>
                    )}
                    <Grid container spacing={3}>
                        {posts.map(post => (
                            <Grid key={post.slug} size={{ xs: 12, md: 4 }}>
                                <Card
                                    className="card-lift"
                                    component={Link}
                                    to={`/blog/${post.slug}`}
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        overflow: 'hidden',
                                        '&:hover .blog-card-title': { color: 'primary.main' },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            position: 'relative',
                                            aspectRatio: '16/10',
                                            overflow: 'hidden',
                                            background: 'linear-gradient(135deg, #4B5B72, #197F94)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {post.cover ? (
                                            <Box component="img" src={post.cover} alt="" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span className="material-symbols-outlined" style={{ fontSize: 56, color: 'rgba(255,255,255,0.2)' }}>
                                                article
                                            </span>
                                        )}
                                    </Box>
                                    <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} sx={{ mb: 2 }}>
                                            <Chip label={post.tag} size="small" color="secondary" variant="outlined" sx={{ flexShrink: 0 }} />
                                            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                                                {post.date}
                                            </Typography>
                                        </Stack>
                                        <Typography
                                            className="blog-card-title"
                                            variant="h6"
                                            sx={{
                                                fontWeight: 700,
                                                mb: 1,
                                                flex: 1,
                                                overflowWrap: 'anywhere',
                                                wordBreak: 'break-word',
                                                lineHeight: 1.3,
                                            }}
                                        >
                                            {post.title}
                                        </Typography>
                                        {post.excerpt ? (
                                            <Typography
                                                component="p"
                                                variant="body2"
                                                color="text.secondary"
                                                className="typography-premium-small"
                                                sx={{
                                                    mb: 2,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 3,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflowWrap: 'anywhere',
                                                    wordBreak: 'break-word',
                                                }}
                                            >
                                                {post.excerpt}
                                            </Typography>
                                        ) : (
                                            <Box sx={{ flex: 1, minHeight: 8 }} />
                                        )}
                                        <Button component="span" size="small" sx={{ alignSelf: 'flex-start', fontWeight: 700, pointerEvents: 'none' }}>
                                            {t('blog.readArticle')}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>
            <Footer />
        </Box>
    )
}
