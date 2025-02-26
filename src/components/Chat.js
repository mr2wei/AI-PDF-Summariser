import React, { useState, useEffect, useRef } from "react";
import Message from './Message.js';
import '../styles/Chat.css';
import GPT from '../utils/GPT.js';
import TextareaAutosize from 'react-textarea-autosize';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faTrash, faStop, faFileExport, faFileCircleXmark, faFileCircleMinus, faFileCirclePlus } from '@fortawesome/free-solid-svg-icons';


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
    const [isAtBottom, setIsAtBottom] = useState(true); // track if user is at bottom of chat

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
     * Scroll to the bottom of the chat only if user was already near the bottom
     */
    const scrollToBottom = () => {
        if (messageRef.current && isAtBottom) {
            messageRef.current.scrollTop = messageRef.current.scrollHeight;
        }
    };

    /**
     * Check if the user is currently near the bottom of the chat
     */
    const checkIfAtBottom = () => {
        if (messageRef.current) {
            // console.log("checking if at bottom");
            const { scrollTop, scrollHeight, clientHeight } = messageRef.current;
            // Consider "at bottom" if user is within 30px of the bottom
            const atBottom = scrollHeight - scrollTop - clientHeight < 30;
            setIsAtBottom(atBottom);
        }
    };

    // Setup scroll event listener
    useEffect(() => {
        const messagesContainer = messageRef.current;
        if (messagesContainer) {
            messagesContainer.addEventListener('scroll', checkIfAtBottom);
            return () => {
                messagesContainer.removeEventListener('scroll', checkIfAtBottom);
            };
        }
    }, []);

    /**
     * Handle regenerating an AI response
     * @param {number} messageKey - The key of the message to regenerate
     */
    const handleRegenerate = async (messageKey) => {
        // Find the preceding user message
        let userMessageIndex = -1;
        for (let i = messageKey - 1; i >= 0; i--) {
            // Access the component's props directly from chatHistory
            if (!chatHistory[i].props.isBot) {
                userMessageIndex = i;
                break;
            }
        }

        if (userMessageIndex === -1) return; // No user message found

        // Get the user message text
        const userText = chatHistory[userMessageIndex].props.text;

        // Remove all messages after and including the messageKey
        setChatHistory(chatHistory.slice(0, messageKey));

        // Keep openAI history up to userMessageIndex
        const newOpenAIHistory = openaiChatHistory.slice(0, userMessageIndex * 2 + 1);
        setOpenaiChatHistory(newOpenAIHistory);

        // Re-send the user message
        setIsGenerating(true);

        const pageContext = usePageText !== "x" ? pageText : "";
        const useFunctionCalling = usePageText === "+";

        if (useFunctionCalling) {
            addLoadingChatBox();
        }

        const { message, updatedChatHistory, stream } = await gptUtils.current.fetchChatCompletions(
            newOpenAIHistory,
            pageContext,
            props.pageNumber,
            userText,
            useFunctionCalling,
            addPageCallChatBox
        );

        setOpenaiChatHistory(updatedChatHistory);

        setChatHistory(prevChatHistory => prevChatHistory.concat(
            <Message
                isBot={true}
                stream={stream}
                text={message}
                openaiChatHistory={updatedChatHistory}
                setOpenaiChatHistory={setOpenaiChatHistory}
                setIsGenerating={setIsGenerating}
                scrollToBottom={scrollToBottom}
                messageKey={prevChatHistory.length}
                model={model}
                onRegenerate={handleRegenerate}
                onEdit={handleEdit}
            />
        ));
    };

    /**
     * Handle editing a user message
     * @param {number} messageKey - The key of the message to edit
     * @param {string} messageText - The text of the message to edit
     */
    const handleEdit = (messageKey, messageText) => {
        // Set the user message to the message being edited
        setUserMessage(messageText);

        // Remove all messages after and including the messageKey
        setChatHistory(chatHistory.slice(0, messageKey));
        setOpenaiChatHistory(openaiChatHistory.slice(0, messageKey));

        // Focus the textarea
        document.getElementById('userMessageTextarea').focus();
    };

    /**
     * Generate a summary of the page text
     */
    const handleGenerate = async () => {
        setIsGenerating(true);
        const { message, updatedChatHistory, stream } = await gptUtils.current.generateSummary(pageText);

        setOpenaiChatHistory(updatedChatHistory);

        setChatHistory(chatHistory.concat(<Message
            isBot={true}
            stream={stream}
            text={message}
            openaiChatHistory={updatedChatHistory}
            setOpenaiChatHistory={setOpenaiChatHistory}
            setIsGenerating={setIsGenerating}
            scrollToBottom={scrollToBottom}
            messageKey={chatHistory.length}
            model={model}
            onEdit={handleEdit}
            onRegenerate={handleRegenerate}
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
                onEdit={handleEdit}
                onRegenerate={handleRegenerate}
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
                onEdit={handleEdit}
                onRegenerate={handleRegenerate}
            />
        ));
    }

    /**
     * Handle sending a message to the chat
     */
    const handleSendMessage = async () => {
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
                onEdit={handleEdit}
                onRegenerate={handleRegenerate}
            />
        ));

        const pageContext = usePageText !== "x" ? pageText : "";

        setIsGenerating(true);

        const useFunctionCalling = usePageText === "+";

        if (useFunctionCalling) {
            addLoadingChatBox();
        }

        const { message, updatedChatHistory, stream } = await gptUtils.current.fetchChatCompletions(
            openaiChatHistory,
            pageContext,
            props.pageNumber,
            userText,
            useFunctionCalling,
            addPageCallChatBox
        );

        setOpenaiChatHistory(updatedChatHistory);

        setChatHistory(prevChatHistory => prevChatHistory.concat([
            <Message
                isBot={true}
                stream={stream}
                text={message}
                openaiChatHistory={updatedChatHistory}
                setOpenaiChatHistory={setOpenaiChatHistory}
                setIsGenerating={setIsGenerating}
                scrollToBottom={scrollToBottom}
                messageKey={chatHistory.length}
                model={model}
                onEdit={handleEdit}
                onRegenerate={handleRegenerate}
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

        // Commenting out the forced scroll to bottom
        // // Force scroll to bottom when page text changes, regardless of isAtBottom
        // // Force scroll to bottom when page text changes, regardless of isAtBottom
        // if (messageRef.current) {
        //     messageRef.current.scrollTop = messageRef.current.scrollHeight;
        // }
    }, [props.text, props.scrollRef]);

    /**
     * Convert the chat history to Markdown format
     * @returns {string} Markdown representation of the chat
     */
    const convertChatToMarkdown = () => {
        let markdown = `# Chat Export - ${new Date().toLocaleString()}\n\n`;

        openaiChatHistory.forEach(message => {
            const sender = message.role === "assistant" ? `**AI (${model})**` : "**User**";
            const text = message.content;

            markdown += `${sender}:\n\n${text}\n\n---\n\n`;
        });

        return markdown;
    };

    /**
     * Download the chat history as a Markdown file
     */
    const handleDownloadChat = () => {
        if (openaiChatHistory.length === 0) return;

        const markdown = convertChatToMarkdown();
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.md`;
        document.body.appendChild(a);
        a.click();

        // Clean up
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        handleIconClick('download');
    };

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

                <button
                    className="download"
                    id="hoverable"
                    disabled={openaiChatHistory.length === 0}
                    onClick={handleDownloadChat}
                    title="Download chat as Markdown"
                >
                    <FontAwesomeIcon icon={faFileExport} />
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