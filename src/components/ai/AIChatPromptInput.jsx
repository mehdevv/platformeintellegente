import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import MicIcon from '@mui/icons-material/Mic'
import SendIcon from '@mui/icons-material/Send'
import { cn } from '../../lib/cn'

/** Composer with toolbar (shadcn AI Prompt Input pattern, MUI). */
export function AIChatPromptInput({
    value,
    onChange,
    onSubmit,
    placeholder,
    disabled,
    className,
}) {
    const submit = () => {
        if (disabled || !String(value || '').trim()) return
        onSubmit?.()
    }

    return (
        <Paper
            elevation={0}
            className={cn('overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-200/50', className)}
        >
            <TextField
                fullWidth
                multiline
                minRows={1}
                maxRows={6}
                value={value}
                onChange={e => onChange?.(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        submit()
                    }
                }}
                placeholder={placeholder}
                disabled={disabled}
                variant="outlined"
                slotProps={{
                    htmlInput: {
                        sx: { px: 2, py: 1.5, fontSize: '0.9375rem', lineHeight: 1.5 },
                    },
                }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { border: 'none' } } }}
            />
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1, pb: 1, pt: 0 }}>
                <Stack direction="row" alignItems="center">
                    <IconButton size="small" disabled={disabled} aria-label="Attach file" sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'inline-flex' } }}>
                        <AttachFileIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" disabled={disabled} aria-label="Voice input" sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'inline-flex' } }}>
                        <MicIcon fontSize="small" />
                    </IconButton>
                    <Box component="span" sx={{ display: { xs: 'block', sm: 'none' }, pl: 1 }}>
                        <TypographyHint />
                    </Box>
                </Stack>
                <IconButton
                    onClick={submit}
                    disabled={disabled || !String(value || '').trim()}
                    color="secondary"
                    sx={{
                        bgcolor: 'secondary.main',
                        color: '#fff',
                        '&:hover': { bgcolor: 'secondary.dark' },
                        '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
                        boxShadow: '0 4px 14px rgba(25, 127, 148, 0.35)',
                    }}
                    aria-label="Send message"
                >
                    <SendIcon fontSize="small" />
                </IconButton>
            </Stack>
        </Paper>
    )
}

function TypographyHint() {
    return null
}
