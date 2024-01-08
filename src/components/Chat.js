import React, { useState, useEffect, useRef } from "react";
import Message from './Message.js';
import '../styles/Chat.css';
import GPT from '../utils/GPT.js';
import TextareaAutosize from 'react-textarea-autosize';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faFile as faFileSolid, faTrash, faStop, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { faFile as faFileReg } from '@fortawesome/free-regular-svg-icons';


export default function Chat(props){

    const [model, setModel] = useState("gpt-3.5-turbo");

   
    const [pageText, setPageText] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [isGenerating, setIsGenerating] = useState(true);
    const [userMessage, setUserMessage] = useState("");
    const [openaiChatHistory,setOpenaiChatHistory] = useState([]);
    const [usePageText, setUsePageText] = useState(true);
    const [animatingButton, setAnimatingButton] = useState(null);
    const [loading, setLoading] = useState(true);

    const messageRef = useRef(null);
    const gptUtils = useRef(null); 
    const supportedModels = useRef(null); 

    useEffect(() => {
        console.log("useEffect");
        gptUtils.current = new GPT(model);
        gptUtils.current.setActivePDF(props.file);
        supportedModels.current = gptUtils.current.getSupportedModels();   
        setIsGenerating(false);
        setLoading(false);
    }, [props.file]);



    const scrollToBottom = () => {
        if (messageRef.current) {
            messageRef.current.scrollTop = messageRef.current.scrollHeight;
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        const { message, updatedChatHistory, stream } = await gptUtils.current.generateSummary(pageText);

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

        if (userMessage === "\n") return;

        const userText = userMessage;
    
        setUserMessage("");

        setChatHistory(prevChatHistory => prevChatHistory.concat(
            <Message
                isBot={false}
                text={userText}
                scrollToBottom={scrollToBottom}
            />
        ));

        const pageContext = usePageText ? pageText : "";

        setIsGenerating(true);

        const { message, updatedChatHistory, stream } = await gptUtils.current.smarterFetchChatCompletions(openaiChatHistory, pageContext, props.pageNumber, userText);

        setOpenaiChatHistory(updatedChatHistory);
    
        setChatHistory(prevChatHistory => prevChatHistory.concat([
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

    const handleIconClick = (buttonId) => {
        setAnimatingButton(buttonId);
        setTimeout(() => setAnimatingButton(null), 300); // Reset after animation duration
    };

    useEffect(() => {
        if (props.scrollRef && props.scrollRef.current) {
            props.scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
        setPageText(props.text);
    }, [props.text, props.scrollRef]);

    if (loading) {
        return (
            <div>Loading</div>
        );
    }
        

    return (
        <div className="chat">
            <div className="top-chat-elements">
                
                <button
                    className="generate"
                    id="hoverable"
                    disabled={!props.text || isGenerating}
                    onClick={handleGenerate}
                >
                    Generate
                </button>
            </div>
            <div className="messages" ref={messageRef}>
                {chatHistory.map((message, index) => (
                    <div key={index}>
                        {message}
                    </div>
                ))}
            </div>
            <div className="chat-elements">
                <TextareaAutosize
                    id="userMessageTextarea"
                    placeholder="Ask about content"
                    value={userMessage}
                    onChange={(event) => setUserMessage(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey && userMessage) {
                            event.preventDefault(); // Prevents the default action of Enter key
                            handleSendMessage(event);
                        }
                    }}
                    disabled={!props.text || isGenerating}
                    style={{ resize: 'none', overflow: 'hidden' }} // Inline CSS to prevent resizing and hide overflow
                />

                <button
                    disabled={!props.text || isGenerating}
                    onClick={() => {
                        handleIconClick('context');
                        setUsePageText(!usePageText);
                    }}
                    title={usePageText? "Use page text as context" : "Use empty context"}
                >
                    <FontAwesomeIcon 
                        icon={usePageText? faFileSolid : faFileReg} 
                        className={animatingButton === 'context' ? 'pulse-animation' : ''}
                    />
                </button>
                <button
                    disabled={!props.text || isGenerating || !userMessage}
                    onClick={() => {
                        handleIconClick('send');
                        handleSendMessage();
                    }}
                    title="Send message"
                >
                    <FontAwesomeIcon icon={faPaperPlane} className={animatingButton === 'send' ? 'pulse-animation' : ''} />
                </button>
                <button
                    disabled={chatHistory.length === 0}
                    onClick={() => {
                        handleIconClick('clear');
                        setChatHistory([]);
                        setOpenaiChatHistory([]);
                        setIsGenerating(false);
                    }}
                    title = {isGenerating? "Stop generating" : "Clear chat"}
                >
                    <FontAwesomeIcon icon={isGenerating? faStop : faTrash} className={animatingButton === 'clear' ? 'pulse-animation' : ''} />
                </button>
            </div>
            <div className="additional-chat-elements">
                <select
                    className="mode-selector"
                    value={model}
                    onChange={(event) => {
                        setModel(event.target.value);
                        gptUtils.current.setModel(event.target.value);
                        console.log(event.target.value);
                    }}
                >
                    {supportedModels.current.map((model) => (
                        <option key={model} value={model}>
                            {model}
                        </option>
                    ))}
                </select>
                <div className="alert">
                    {(model === "gpt-4-1106-preview" || model === "gpt-4") && (
                        <FontAwesomeIcon icon={faExclamationCircle} className="alert-icon" />
                    )}
                    {model === "gpt-4-1106-preview" && " certain features may not work with the selected model"}
                    {model === "gpt-4" && " while smarter, the usage cost for this model is expensive. use with caution"}
                </div>
            </div>
        </div>
    );
}