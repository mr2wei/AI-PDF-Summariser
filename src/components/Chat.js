import React, { useState, useEffect, useRef } from "react";
import Message from './Message.js';
import '../styles/Chat.css';
import GPT from '../utils/GPT.js';
import TextareaAutosize from 'react-textarea-autosize';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faTrash, faStop, faExclamationCircle, faFileCircleXmark, faFileCircleMinus, faFileCirclePlus } from '@fortawesome/free-solid-svg-icons';


export default function Chat(props) {

    const [model, setModel] = useState(""); // the model to use for generating completions
    const [pageText, setPageText] = useState(""); // the text of the current pdf page
    const [chatHistory, setChatHistory] = useState([]); // the chat history to be shown. This is an array of Message components.
    const [isGenerating, setIsGenerating] = useState(true); // whether the model is currently generating completions
    const [userMessage, setUserMessage] = useState(""); // the message the user is currently typing
    const [openaiChatHistory, setOpenaiChatHistory] = useState([]); // the chat history to be sent to OpenAI. This is an array of objects with role and content keys.
    const [usePageText, setUsePageText] = useState("-"); // whether to use the page text as context. "-" means use current page as context, "+" means use multiple pages as context, "x" means don't use page text as context
    const [animatingButton, setAnimatingButton] = useState(null); // the button that is currently animating
    const [loading, setLoading] = useState(true); // whether the page is currently loading (initialising the GPT object)

    const pageContextCycles = ["-", "+", "x"]; // the possible values for usePageText

    const messageRef = useRef(null); // reference to the message container div. Used to scroll to the bottom of the chat
    const gptUtils = useRef(null); // reference to the GPT object
    const supportedModels = useRef(null); // reference to the supported models for the GPT object

    useEffect(() => {
        // console.log("useEffect");
        // initialise the GPT object
        gptUtils.current = new GPT(model);
        gptUtils.current.setActivePDF(props.file);
        gptUtils.current.setModel(model);
        supportedModels.current = gptUtils.current.getSupportedModels();
        // if the model is not set, set it to the first supported model.
        (model === "" && setModel(supportedModels.current[0]));
        setIsGenerating(false);
        setLoading(false);
    }, [props.file, model]);

    useEffect(() => {
        // if the current pageContextCycle is +, set the model to meta-llama/Llama-3.3-70B-Instruct-Turbo
        if (usePageText === "+") {
            setModel("meta-llama/Llama-3.3-70B-Instruct-Turbo");
        }
    }, [usePageText]);

    useEffect(() => {
        // if current pageContextCycle is + and user changes the model, set pageContextCycle to -
        if (usePageText === "+" && model !== "meta-llama/Llama-3.3-70B-Instruct-Turbo") {
            setUsePageText("-");
        }
    }, [model]);

    /**
     * Scroll to the bottom of the chat
     */
    const scrollToBottom = () => {
        if (messageRef.current) {
            messageRef.current.scrollTop = messageRef.current.scrollHeight;
        }
    };

    /**
     * Generate a summary of the page text
     */
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
            messageKey={chatHistory.length}
            model={model}
        />));

    };

    /**
     * Add a loading chat box to the chat history
     */
    const addLoadingChatBox = () => {
        setChatHistory(prevChatHistory => prevChatHistory.concat(
            <Message
                isBot={true}
                text="Reading the PDF page"
                scrollToBottom={scrollToBottom}
                messageKey={chatHistory.length}
                thought={true}
                model={model}
            />
        ));
    }

    /**
     * Create a "thought" chat message that says which page is being read by the ai
     * 
     * @param {*} page the page number being read
     */
    const addPageCallChatBox = (page) => {
        setChatHistory(prevChatHistory => prevChatHistory.concat(
            <Message
                isBot={true}
                text={`Reading from page ${page} of the PDF`}
                scrollToBottom={scrollToBottom}
                messageKey={chatHistory.length}
                thought={true}
                model={model}
            />
        ));
    }

    /**
     * Handle sending a message to the chat
     */
    const handleSendMessage = async () => {
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
                messageKey={chatHistory.length}
                model={model}
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
                messageKey={chatHistory.length}
                model={model}
            />
        ]));
    };

    /**
     * Handle clicking an icon button
     * 
     * @param {*} buttonId the id of the button that was clicked
     */
    const handleIconClick = (buttonId) => {
        setAnimatingButton(buttonId);
        setTimeout(() => setAnimatingButton(null), 300); // Reset after animation duration
    };

    /**
     * Scroll to the bottom of the chat when the page text changes
     */
    useEffect(() => {
        if (props.scrollRef && props.scrollRef.current) {
            props.scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
        setPageText(props.text);
        scrollToBottom(); // Scroll to bottom when page text changes
    }, [props.text, props.scrollRef]);

    /**
     * Shows a loading message while the page is loading
     */
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
                            handleSendMessage();
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
                    title={isGenerating ? "Stop generating" : "Clear chat"}
                >
                    <FontAwesomeIcon icon={isGenerating ? faStop : faTrash} className={animatingButton === 'clear' ? 'pulse-animation' : ''} />
                </button>
            </div>
            <div className="additional-chat-elements">
                <select
                    className="model-selector"
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
                {/* <div className="alert">
                    {(model === "gpt-4-1106-preview" || model === "gpt-4") && (
                        <FontAwesomeIcon icon={faExclamationCircle} className="alert-icon" />
                    )}
                    {model === "gpt-4-1106-preview" && " certain features may not work with the selected model"}
                    {model === "gpt-4" && " while smarter, the usage cost for this model is expensive. use with caution"}
                </div> */}
            </div>
        </div>
    );
}