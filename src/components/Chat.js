import React, { useState, useEffect, useRef } from "react";
import { OpenAI } from "openai";
import Message from './Message.js';
import Cookies from 'js-cookie';
import '../styles/Chat.css';


export default function Chat(props){
    const openai = new OpenAI({ apiKey: Cookies.get('apiKey'), dangerouslyAllowBrowser: true });
    const guidance = "Your job is to use context from text given to answer the user's requests. For summaries, Your job is to provide a neat summary of key points and information from the text. please format the response using bullet points for each key point. If the user is asking about the content, prioritise answering with information given. respond using markdown syntax";

    const [pageText, setPageText] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [userMessage, setUserMessage] = useState("");
    const [openaiChatHistory, setOpenaiChatHistory] = useState([
        {role: 'system', content: guidance}
    ]);
    const [usePageText, setUsePageText] = useState(true);
    const messageRef = useRef(null);

    const handleGenerate = async () => {
        openaiChatHistory.push({role: 'user', content: `Summarise ${props.text}`});
        setChatHistory(chatHistory.concat(<Message 
            isBot={true}
            messageHistory={[{role: 'system', content: guidance}, {role: 'user', content: `Summarise ${props.text}`}]}
            setMessageHistory={setOpenaiChatHistory}
            setIsGenerating={setIsGenerating}
            openai={openai}
            text={pageText}
        />));
    };

    const handleSendMessage = (event) => {
        // TODO: Send message to chat history
        // if there is no chat history, add the pdf page as context

        const updatedChatHistory = usePageText? openaiChatHistory.concat({ role: 'user', content: `from: ${pageText}. ${userMessage}` }) : openaiChatHistory.concat({ role: 'user', content: userMessage });
    
        setUserMessage("");
    
        setChatHistory(chatHistory.concat([
            <Message
                isBot={false}
                text={userMessage}
                scrollToBottom={scrollToBottom}
            />,
            <Message
                isBot={true}
                messageHistory={updatedChatHistory}
                setMessageHistory={setOpenaiChatHistory}
                setIsGenerating={setIsGenerating}
                openai={openai}
                text={pageText}
                scrollToBottom={scrollToBottom}
            /> 
            
            ]));
    
        setOpenaiChatHistory(updatedChatHistory);

    };

    const scrollToBottom = () => {
        if (messageRef.current) {
            messageRef.current.scrollTop = messageRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        if (props.scrollRef && props.scrollRef.current) {
            props.scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
        setPageText(props.text);
        scrollToBottom(); // Scroll to bottom when page text changes
    }, [props.text, props.scrollRef]);

    return (
        <div className="chat">
            <button
                className="generate"
                id="hoverable"
                disabled={!props.text || isGenerating}
                onClick={handleGenerate}
            >
                Generate
            </button>
            <div className="messages" ref={messageRef}>
                {chatHistory.map((message, index) => (
                    <div key={index}>
                        {message}
                    </div>
                ))}
            </div>
            <div className="chat-elements">
                <input
                    type="text"
                    value={userMessage}
                    onChange={(event) => setUserMessage(event.target.value)}
                    placeholder="Ask about content"
                    id="hoverable"
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            handleSendMessage(event);
                        }
                    }}
                    disabled={!props.text || isGenerating}
                />
                <button
                    id="hoverable"
                    disabled={!props.text || isGenerating}
                    onClick={() => {
                        setUsePageText(!usePageText);
                    }}
                    className={usePageText ? "" : "no-context"}
                >
                    Context?
                </button>
                <button
                    id="hoverable"
                    disabled={!props.text || isGenerating}
                    onClick={handleSendMessage}
                >
                    Send
                </button>
                <button
                    id="hoverable"
                    disabled={chatHistory.length === 0}
                    onClick={() => {
                        setChatHistory([]);
                        setOpenaiChatHistory([{ role: 'system', content: guidance }]);
                    }}
                >
                    Clear
                </button>

            </div>
        </div>
    );
}