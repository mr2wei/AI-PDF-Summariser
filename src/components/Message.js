import React, { useState, useEffect } from "react";
import MarkdownRender from '../utils/MarkdownRender.js';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight, faCopy, faGear } from "@fortawesome/free-solid-svg-icons";

/**
 * Message component that renders both user and AI messages with markdown and LaTeX support
 * @param {Object} props
 * @param {boolean} props.isBot - Indicates if the message is from the AI (true) or user (false)
 * @param {boolean} props.thought - If true, renders as a thought bubble without author header
 * @param {string} props.text - The message text content for non-streamed messages
 * @param {AsyncIterator} [props.stream] - Stream of OpenAI API responses for real-time message rendering
 * @param {Function} props.scrollToBottom - Callback to scroll the chat window to bottom
 * @param {Function} props.setIsGenerating - Setter function to update the generating state
 * @param {Array} props.openaiChatHistory - Array of message objects representing the chat history
 * @param {Function} props.setOpenaiChatHistory - Setter function to update the chat history
 * @param {string} props.messageKey - React key prop for the message component
 * @param {string} props.model - The model to be used for generating responses.
 * @returns {JSX.Element} Message component
 */
export default function Message(props) {
    const [textContent, setTextContent] = useState("");
    const [completed, setCompleted] = useState(false); // so that it doesn't fetch completions more than once
    const [thinking, setThinking] = useState(false);
    const [showThinking, setShowThinking] = useState(false);
    const [thinkingText, setThinkingText] = useState("");
    const [responseText, setResponseText] = useState("");
    const [didThink, setDidThink] = useState(false);

    const config = {
        loader: { load: ['input/asciimath', 'output/chtml'] },
        asciimath: { delimiters: [["$$", "$$"]] },
        tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] }
    };

    // console.log("Message props", props);

    const adaptLatex = (text) => {
        // convert \[ \] to $$ $$ and \( \) to $ $
        let newText = text;
        newText = newText.replaceAll("\\[", "$$");
        newText = newText.replaceAll("\\]", "$$");
        newText = newText.replaceAll("\\(", "$");
        newText = newText.replaceAll("\\)", "$");
        return newText;
    }

    useEffect(() => {
        if (props.model.includes("DeepSeek-R1")) {
            // Extract thinking content and response content
            const regex = /<think>([\s\S]*?)<\/think>/g;
            let matches = [...textContent.matchAll(regex)];

            if (matches.length > 0) {
                // Get the last thinking block content
                const lastThinkingContent = matches[matches.length - 1][1].trim();
                setThinkingText(lastThinkingContent);

                // Remove all thinking blocks from the response
                let cleanResponse = textContent.replace(regex, '').trim();
                setResponseText(cleanResponse);

                // Only show thinking if there's content
                const hasThinkingContent = lastThinkingContent.length > 0;
                setThinking(false);
                setDidThink(hasThinkingContent);
            } else {
                // Check if we're in the middle of a thinking block
                const openThinkTag = textContent.lastIndexOf('<think>');
                if (openThinkTag !== -1) {
                    // We have an open tag with no closing tag yet
                    const currentThinking = textContent.substring(openThinkTag + 7);
                    setThinkingText(currentThinking);
                    setResponseText("");
                    setThinking(true);
                    if (currentThinking.trim().length > 0) {
                        setDidThink(true);
                    }
                } else {
                    // No thinking tags found, treat as normal response
                    setResponseText(textContent);
                    setThinking(false);
                }
            }
        } else {
            // For other models, just use the full text content
            setResponseText(textContent);
        }
    }, [textContent, props.model]);

    useEffect(() => {
        const fetchData = async () => {
            if (props.isBot && !completed) {
                setCompleted(true);
                if (props.stream) {
                    let result = '';
                    for await (const part of props.stream) {
                        const deltaContent = part.choices[0]?.delta?.content || '';
                        result += deltaContent;

                        // Update the full text content
                        setTextContent(result);

                        props.scrollToBottom && props.scrollToBottom();
                    }
                    props.setIsGenerating(false);

                    // Use the full text (including thinking) for the chat history
                    props.setOpenaiChatHistory(props.openaiChatHistory.concat({ role: 'assistant', content: result }));
                } else {
                    if (!props.text) {
                        setTextContent("Sorry, there was an unexpected error.");
                    } else {
                        setTextContent(props.text);
                    }
                    props.scrollToBottom && props.scrollToBottom();
                    props.setIsGenerating(false);
                    props.setOpenaiChatHistory(props.openaiChatHistory.concat({ role: 'assistant', content: textContent }));
                }
            } else if (!props.isBot && !completed) {
                setTextContent(props.text);
                setCompleted(true);
                props.scrollToBottom && props.scrollToBottom();
            }
            window.MathJax && window.MathJax.typesetPromise();
        };

        fetchData().catch(console.error);
    }, [completed, props.isBot, props.text, props.stream, props.setIsGenerating, props.setOpenaiChatHistory, props.scrollToBottom]);

    return (
        <div className={props.isBot ? "bot-message-container" : "user-message-container"}>
            <div className={props.isBot ? "bot-message" : "user-message"} id={props.thought ? "thought" : "message"}>
                {!props.thought && <div className="author">
                    {props.isBot ? "AI ✨" : "User"}
                    {props.isBot && (
                        <button className="copy-button" onClick={() => navigator.clipboard.writeText(didThink ? responseText : textContent)}>
                            Copy <FontAwesomeIcon icon={faCopy} />
                        </button>
                    )}
                </div>}

                {props.isBot && didThink && (
                    <div>
                        <button
                            className="toggle-thinking"
                            onClick={() => setShowThinking(!showThinking)}
                        >
                            Reasoning
                            {thinking && <FontAwesomeIcon icon={faGear} className="thinking-gear spinning" />}
                            <FontAwesomeIcon icon={faChevronRight} className={showThinking ? "rotate-90" : ""} />
                        </button>

                        <div className={`reasoning-content ${showThinking ? "visible" : ""}`} id="reasoning">
                            <MarkdownRender key={`${props.messageKey}-reasoning`}>
                                {adaptLatex(thinkingText)}
                            </MarkdownRender>
                        </div>
                    </div>
                )}

                <MarkdownRender key={props.messageKey}>
                    {adaptLatex(props.isBot && props.model.includes("DeepSeek-R1") ? responseText : textContent)}
                </MarkdownRender>


            </div>
        </div>
    );
}
