import React from 'react'
import CascadingAssistantText from './CascadingAssistantText'
import AssistantRichContent from './AssistantRichContent'

/** Assistant body: cascade while generating, then tables/charts markdown. */
export default function AIAssistantMessage({ content, streaming, animating, onRevealComplete }) {
    const useRich = !streaming && !animating

    if (useRich) {
        return <AssistantRichContent content={content} />
    }

    return (
        <CascadingAssistantText
            content={content}
            streaming={streaming}
            animating={animating}
            onRevealComplete={onRevealComplete}
        />
    )
}
