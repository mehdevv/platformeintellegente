import React, { useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import AIChartBlock from './AIChartBlock'

const CHART_RE = /```chart\s*\n([\s\S]*?)```/gi

/**
 * Split assistant markdown into text segments and chart blocks.
 * @param {string} content
 */
export function splitAssistantContent(content) {
    const parts = []
    let last = 0
    let match
    const re = new RegExp(CHART_RE.source, CHART_RE.flags)
    while ((match = re.exec(content)) !== null) {
        if (match.index > last) {
            parts.push({ type: 'markdown', text: content.slice(last, match.index) })
        }
        parts.push({ type: 'chart', raw: match[1] })
        last = match.index + match[0].length
    }
    if (last < content.length) {
        parts.push({ type: 'markdown', text: content.slice(last) })
    }
    return parts.length ? parts : [{ type: 'markdown', text: content }]
}

const markdownSx = {
    fontSize: '0.875rem',
    lineHeight: 1.65,
    '& p': { margin: '0 0 0.75em' },
    '& p:last-child': { marginBottom: 0 },
    '& ul, & ol': { margin: '0.25em 0 0.75em', paddingLeft: '1.25em' },
    '& h2, & h3': { margin: '1em 0 0.5em', fontWeight: 700, fontSize: '1rem' },
    '& table': {
        width: '100%',
        borderCollapse: 'collapse',
        my: 1.5,
        fontSize: '0.8125rem',
    },
    '& th, & td': {
        border: '1px solid',
        borderColor: 'divider',
        px: 1.25,
        py: 0.75,
        textAlign: 'left',
    },
    '& th': { bgcolor: 'rgba(25, 127, 148, 0.08)', fontWeight: 700 },
    '& tr:nth-of-type(even) td': { bgcolor: 'rgba(248, 250, 252, 0.8)' },
    '& code': {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '0.8em',
        bgcolor: 'rgba(75, 91, 114, 0.08)',
        px: 0.5,
        borderRadius: 0.5,
    },
    '& pre': {
        overflow: 'auto',
        p: 1.5,
        borderRadius: 1,
        bgcolor: 'rgba(15, 23, 42, 0.04)',
        fontSize: '0.8rem',
    },
}

export default function AssistantRichContent({ content }) {
    const parts = useMemo(() => splitAssistantContent(content || ''), [content])

    return (
        <Box sx={markdownSx}>
            {parts.map((part, i) =>
                part.type === 'chart' ? (
                    <AIChartBlock key={`chart-${i}`} spec={part.raw} />
                ) : (
                    <ReactMarkdown key={`md-${i}`} remarkPlugins={[remarkGfm]}>
                        {part.text}
                    </ReactMarkdown>
                ),
            )}
            {!content?.trim() && (
                <Typography variant="body2" color="text.secondary">
                    …
                </Typography>
            )}
        </Box>
    )
}
