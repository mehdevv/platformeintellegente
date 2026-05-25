import React, { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'

function nextRevealIndex(target, fromIndex) {
    if (fromIndex >= target.length) return fromIndex
    const rest = target.slice(fromIndex)
    const word = rest.match(/^(\s*\S+\s*)/)
    if (word) return fromIndex + word[0].length
    return Math.min(target.length, fromIndex + 1)
}

/**
 * Word-by-word reveal (ChatGPT / Claude). Display text only advances via `visible`.
 */
export function useCascadingReveal(content, { streaming, animating, onRevealComplete }) {
    const [visible, setVisible] = useState('')
    const indexRef = useRef(0)
    const contentRef = useRef(content)
    const streamingRef = useRef(streaming)
    const animatingRef = useRef(animating)
    const onCompleteRef = useRef(onRevealComplete)
    const completedRef = useRef(false)

    contentRef.current = content
    streamingRef.current = streaming
    animatingRef.current = animating
    onCompleteRef.current = onRevealComplete

    useEffect(() => {
        if (!streaming && !animating) {
            indexRef.current = content.length
            setVisible(content)
            completedRef.current = true
        }
    }, [streaming, animating, content])

    useEffect(() => {
        if (!streaming && !animating) return undefined

        completedRef.current = false
        let frame = null
        let last = performance.now()

        const tick = now => {
            const target = contentRef.current
            let idx = indexRef.current

            if (idx < target.length) {
                const lag = target.length - idx
                const elapsed = now - last
                const delay = lag > 300 ? 8 : lag > 120 ? 14 : lag > 50 ? 24 : 38

                if (elapsed >= delay) {
                    idx = nextRevealIndex(target, idx)
                    indexRef.current = idx
                    setVisible(target.slice(0, idx))
                    last = now
                }
            }

            const behind = indexRef.current < contentRef.current.length
            const waitingForTokens = streamingRef.current && !behind

            if (behind || waitingForTokens) {
                frame = requestAnimationFrame(tick)
                return
            }

            if (animatingRef.current && !completedRef.current) {
                completedRef.current = true
                onCompleteRef.current?.()
            }
        }

        frame = requestAnimationFrame(tick)
        return () => {
            if (frame) cancelAnimationFrame(frame)
        }
    }, [streaming, animating])

    useEffect(() => {
        if ((streaming || animating) && content.length === 0) {
            indexRef.current = 0
            setVisible('')
            completedRef.current = false
        }
    }, [streaming, animating, content.length])

    const behind = visible.length < content.length
    const showCursor = streaming || (animating && behind) || (animating && visible.length === 0 && content.length > 0)

    return { visible, showCursor: Boolean(showCursor || (animating && behind)) }
}

export default function CascadingAssistantText({
    content,
    streaming = false,
    animating = false,
    onRevealComplete,
}) {
    const { visible, showCursor } = useCascadingReveal(content, {
        streaming,
        animating,
        onRevealComplete,
    })

    return (
        <>
            {visible}
            {showCursor && (
                <Box
                    component="span"
                    aria-hidden
                    sx={{
                        display: 'inline-block',
                        width: 2,
                        height: '1.1em',
                        ml: 0.25,
                        verticalAlign: 'text-bottom',
                        bgcolor: 'secondary.main',
                        animation: 'ai-cursor-blink 1s step-end infinite',
                        '@keyframes ai-cursor-blink': {
                            '0%, 100%': { opacity: 1 },
                            '50%': { opacity: 0 },
                        },
                    }}
                />
            )}
        </>
    )
}
