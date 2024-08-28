import React, { useState, useEffect, useRef } from "react";
import Message from './Message.js';
import '../styles/Chat.css';
import GPT from '../utils/GPT.js';
import TextareaAutosize from 'react-textarea-autosize';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faTrash, faStop, faExclamationCircle, faFileCircleXmark, faFileCircleMinus, faFileCirclePlus } from '@fortawesome/free-solid-svg-icons';


export default function Chat(props){

    const [model, setModel] = useState("");

   
    const [pageText, setPageText] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [isGenerating, setIsGenerating] = useState(true);
    const [userMessage, setUserMessage] = useState("");
    const [openaiChatHistory,setOpenaiChatHistory] = useState([]);
    const [usePageText, setUsePageText] = useState("-");
    const [animatingButton, setAnimatingButton] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const pageContextCycles = ["-", "+", "x"];

    const messageRef = useRef(null);
    const gptUtils = useRef(null); 
    const supportedModels = useRef(null); 

    useEffect(() => {
        console.log("useEffect");
        gptUtils.current = new GPT(model);
        gptUtils.current.setActivePDF(props.file);
        gptUtils.current.setModel(model);
        supportedModels.current = gptUtils.current.getSupportedModels();
        setModel(supportedModels.current[0]);   
        setIsGenerating(false);
        setLoading(false);
    }, [props.file, model]);



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
            key={chatHistory.length}
        />));
        
    };

    const addLoadingChatBox = () => {
        setChatHistory(prevChatHistory => prevChatHistory.concat(
            <Message
                isBot={true}
                text="Reading the PDF page"
                scrollToBottom={scrollToBottom}
                key={chatHistory.length}
                thought = {true}
            />
        ));
    }

    const addPageCallChatBox = (page) => {
        setChatHistory(prevChatHistory => prevChatHistory.concat(
            <Message
                isBot={true}
                text={`Reading from page ${page} of the PDF`}
                scrollToBottom={scrollToBottom}
                key={chatHistory.length}
                thought = {true}
            />
        ));
    }

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
                key={chatHistory.length}
            />
        ));

        const pageContext = usePageText !== "x" ? pageText : "";

        setIsGenerating(true);

        const useFunctionCalling = usePageText === "+";

        if (useFunctionCalling) {
            addLoadingChatBox();
        }

        const { message, updatedChatHistory, stream } = await gptUtils.current.fetchChatCompletions(openaiChatHistory, pageContext, props.pageNumber, userText, useFunctionCalling, addPageCallChatBox);

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
                key={chatHistory.length}
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
                    Summarise
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
                        setUsePageText(pageContextCycles[(pageContextCycles.indexOf(usePageText) + 1) % 3]);
                    }}
                    title={usePageText === "-" ? "Use page text as context" : usePageText === "+" ? "Use multiple pages as context" : "Do not use page text as context"}
                >
                    <FontAwesomeIcon 
                        icon={usePageText === "-" ? faFileCircleMinus : usePageText === "+" ? faFileCirclePlus : faFileCircleXmark} 
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