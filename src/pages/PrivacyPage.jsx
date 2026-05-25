import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function PrivacyPage() {
    const { t } = useTranslation()
    return (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
            <Header />
            <Box component="main" sx={{ pt: '72px', pb: 8 }}>
                <Container maxWidth="md" className="legal-prose">
                    <Typography variant="h3" sx={{ fontFamily: '"League Spartan", sans-serif', fontWeight: 800, mb: 1 }}>{t('privacy.title')}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 4 }}>{t('privacy.lastUpdated')}</Typography>
                    <Stack spacing={2}>
                        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.85 }}>{t('privacy.p1')}</Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.85 }}>{t('privacy.p2')}</Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.85 }}>{t('privacy.p3')}</Typography>
                    </Stack>
                </Container>
            </Box>
            <Footer />
        </Box>
    )
}
