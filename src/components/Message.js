import React, { useState, useEffect, useCallback } from "react";
import ReactMarkdown from 'react-markdown';
import { MathJax, MathJaxContext } from 'better-react-mathjax';


export default function Message(props){ 
    const [textContent, setTextContent] = useState("");
    const [completed, setCompleted] = useState(false); // so that it doesn't fetch completions more than once

    const config = {
        loader: { load: ['input/asciimath', 'output/chtml'] },
        asciimath: { delimiters: [["$$", "$$"]] },
        tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] }
    };

    // const [completed, setCompleted] = useState(false); // so that it doesn't fetch completions more than once
    // const delay = ms => new Promise(res => setTimeout(res, ms));

    // const fetchChatCompletions = useCallback(async () => {
    //     let openaiChatHistory = props.messageHistory;
    //     let tokens;

    //     do {
    //         tokens = await getMessageTokens(openaiChatHistory);
    //         // remove the second message from the chat history (because the first is the guidance message)
    //         if (openaiChatHistory.length > 2 && tokens > 4096){
    //             openaiChatHistory.splice(1, 1);
    //         } else if (openaiChatHistory.length === 2 && tokens > 4096){
    //             setTextContent("Sorry, this page is too long to read.");
    //             return;
    //         }
    //     } while (tokens > 4096);

    //     while(true) {
    //         try {
    //             const stream = await props.openai.chat.completions.create({
    //                 model: 'gpt-3.5-turbo',
    //                 messages: openaiChatHistory,
    //                 stream: true,
    //             });

    //             let result = '';
                
    //             props.setIsGenerating(true);

    //             for await (const part of stream) {
    //                 const deltaContent = part.choices[0]?.delta?.content || '';
    //                 result += deltaContent;
    //                 setTextContent(result);
    //                 // setTextContent(<ul className="list-container">
    //                 // {result.split('\n').map((point, index) => (
    //                 //     <li key={index}>{point}</li>
    //                 // ))}
    //                 // </ul>);
    //                 props.scrollToBottom && props.scrollToBottom();
    //             }
                
    //             props.setIsGenerating(false);
    //             break;

    //         } catch (error) {
    //             if (error.type && error.type === "invalid_request_error"){
    //                 if (props.messageHistory.length > 2){
    //                     let newMessageHistory = [...props.messageHistory];
    //                     newMessageHistory.splice(1, 1);
    //                     props.setMessageHistory(newMessageHistory);   
    //                     openaiChatHistory = newMessageHistory;
    //                 } else {
    //                     setTextContent("Sorry, this page is too long to read.");
    //                     break;
    //                 }
    //             } else if (error.type && error.type === "rate_limit_exceeded"){
    //                 setTextContent("Rate limit exceeded. Please try again later.");
    //                 break;
    //             } else {
    //                 throw error;
    //             }
    //         }
    //     }
    // }, [props]);

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
                        setTextContent("Sorry, I couldn't generate a summary at the moment.");
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
                <MathJaxContext config={config}>
                    {props.isBot? <div className="message-content" dangerouslySetInnerHTML={{ __html: textContent }}></div> : <div className="message-content"><ReactMarkdown>{textContent}</ReactMarkdown></div>}
                </MathJaxContext>
            </div>
        </div>
    );
}
