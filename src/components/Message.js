import React, { useState, useEffect } from "react";
import MarkdownRender from '../utils/MarkdownRender.js';


export default function Message(props){ 
    const [textContent, setTextContent] = useState("");
    const [completed, setCompleted] = useState(false); // so that it doesn't fetch completions more than once

    const config = {
        loader: { load: ['input/asciimath', 'output/chtml'] },
        asciimath: { delimiters: [["$$", "$$"]] },
        tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] }
    };

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
        const fetchData = async () => {
            if (props.isBot && !completed) {
                setCompleted(true);
                if (props.stream){
                    let result = '';
                    for await (const part of props.stream) {
                        const deltaContent = part.choices[0]?.delta?.content || '';
                        result += deltaContent;
                        setTextContent(result);
                        props.scrollToBottom && props.scrollToBottom();
                    }
                    props.setIsGenerating(false);
                    props.setOpenaiChatHistory(props.openaiChatHistory.concat({ role: 'assistant', content: result }));
                } else {
                    if (!props.text){
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
        };
    
        fetchData().catch(console.error);
    }, [completed, props.isBot, props.text, props.stream, props.setIsGenerating, props.setOpenaiChatHistory, props.scrollToBottom]);

    return (
        <div className={props.isBot? "bot-message-container" : "user-message-container"}>
            <div className={props.isBot? "bot-message" : "user-message"} id = "message">
                <div className="author">
                    {props.isBot? "AI ✨" : "User"}
                </div>
                <MarkdownRender>
                    {adaptLatex(textContent)}
                </MarkdownRender>
            </div>
        </div>
    );
}
