import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import './i18n/config'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from './theme'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { initGtag } from './lib/gtag'
import GoogleAnalyticsRouteListener from './components/GoogleAnalyticsRouteListener.jsx'

initGtag()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 200, damping: 24 }}>
          <AuthProvider>
            <GoogleAnalyticsRouteListener />
            <App />
          </AuthProvider>
        </MotionConfig>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
