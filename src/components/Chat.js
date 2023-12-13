import React, { useState, useEffect, useRef } from "react";
import Message from './Message.js';
import '../styles/Chat.css';
import GPT from '../utils/GPT.js';


export default function Chat(props){

    const [model, setModel] = useState("gpt-3.5-turbo");

    const gptUtils = new GPT(model);
   
    const [pageText, setPageText] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [userMessage, setUserMessage] = useState("");
    const [openaiChatHistory,setOpenaiChatHistory] = useState([]);
    const [usePageText, setUsePageText] = useState(true);
    const messageRef = useRef(null);


    const scrollToBottom = () => {
        if (messageRef.current) {
            messageRef.current.scrollTop = messageRef.current.scrollHeight;
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        const { message, updatedChatHistory, stream } = await gptUtils.generateSummary(pageText);

        setOpenaiChatHistory(openaiChatHistory.concat(updatedChatHistory));

        setChatHistory(chatHistory.concat(<Message
            isBot={true}
            stream={stream}
            text={message}
            openaiChatHistory={openaiChatHistory}
            setOpenaiChatHistory={setOpenaiChatHistory}
            setIsGenerating={setIsGenerating}
            scrollToBottom={scrollToBottom}
        />));
        
    };

    const handleSendMessage = async (event) => {
        // TODO: Send message to chat history
        // if there is no chat history, add the pdf page as context

        const userText = userMessage;
    
        setUserMessage("");

        const pageContext = usePageText ? pageText : "";

        setIsGenerating(true);

        const { message, updatedChatHistory, stream } = await gptUtils.fetchChatCompletions(openaiChatHistory, pageContext, userText);

        setOpenaiChatHistory(updatedChatHistory);
    
        setChatHistory(chatHistory.concat([
            <Message
                isBot={false}
                text={userText}
                scrollToBottom={scrollToBottom}
            />,
            <Message
                isBot={true}
                stream={stream}
                text={message}
                openaiChatHistory={openaiChatHistory}
                setOpenaiChatHistory={setOpenaiChatHistory}
                setIsGenerating={setIsGenerating}
                scrollToBottom={scrollToBottom}
            />
        ]));

    };

   
    useEffect(() => {
        if (props.scrollRef && props.scrollRef.current) {
            props.scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
        setPageText(props.text);
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
                        setOpenaiChatHistory([]);}
                    }
                >
                    Clear
                </button>

            </div>
        </div>
    );
}