import React, { useState, useEffect, useRef } from "react";
import Message from './Message.js';
import '../styles/Chat.css';
import GPT from '../utils/GPT.js';
import TextareaAutosize from 'react-textarea-autosize';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faTrash, faStop, faFileExport, faFileCircleXmark, faFileCircleMinus, faFileCirclePlus, faSave, faFolderOpen, faImage } from '@fortawesome/free-solid-svg-icons';


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
    const [savedChats, setSavedChats] = useState([]); // list of saved chats
    const [showSavedChats, setShowSavedChats] = useState(false); // whether to show the saved chats dropdown
    const [activeChatId, setActiveChatId] = useState(null); // ID of the currently active saved chat
    const [previousModel, setPreviousModel] = useState(""); // the model previously used before context was changed

    const pageContextCycles = ["-", "+", "x", "i"]; // the possible values for usePageText

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
            setPreviousModel(model);
            setModel("meta-llama/Llama-3.3-70B-Instruct-Turbo");
        }
        if (usePageText === "i") {
            setPreviousModel(model);
            setModel("Qwen/Qwen2-VL-72B-Instruct");
        }
    }, [usePageText]);

    useEffect(() => {
        // if current pageContextCycle is + and user changes the model, set pageContextCycle to -
        if (usePageText === "+" && model !== "meta-llama/Llama-3.3-70B-Instruct-Turbo") {
            setUsePageText("-");
        }
        if (usePageText === "i" && model !== "Qwen/Qwen2-VL-72B-Instruct") {
            setUsePageText("-");
        }
    }, [model]);

    useEffect(() => {
        // Load saved chats from localStorage on component mount
        const loadedChats = localStorage.getItem('savedChats');
        if (loadedChats) {
            setSavedChats(JSON.parse(loadedChats));
        }
    }, []);

    useEffect(() => {
        if (props.scrollRef && props.scrollRef.current) {
            props.scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
        setPageText(props.text);
    }, [props.text, props.scrollRef]);

    const getActiveChatName = () => {
        if (!activeChatId) return null;
        const activeChat = savedChats.find(chat => chat.id === activeChatId);
        return activeChat ? activeChat.name : null;
    };

    const clearChat = () => {
        setChatHistory([]);
        setOpenaiChatHistory([]);
        setIsGenerating(false);
        setActiveChatId(null); // Clear the active chat
    };

    if (loading) {
        return (
            <div>Loading</div>
        );
    }

    /**
     * Scroll to the bottom of the chat only if user was already near the bottom
     */
    const scrollToBottom = () => {
        if (messageRef.current) {
            // Check if user is at bottom directly when function is called
            const { scrollTop, scrollHeight, clientHeight } = messageRef.current;
            const atBottom = scrollHeight - scrollTop - clientHeight < 50;

            if (atBottom) {
                messageRef.current.scrollTop = messageRef.current.scrollHeight;
            }
        }
    };

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
        const useImage = usePageText === "i";
        if (useFunctionCalling) {
            addLoadingChatBox();
        }

        const { message, updatedChatHistory, stream } = await gptUtils.current.fetchChatCompletions(
            newOpenAIHistory,
            pageContext,
            props.pageNumber,
            userText,
            useFunctionCalling,
            addPageCallChatBox,
            useImage,
            useImage ? props.pageImage : null
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
        const useImage = usePageText === "i";

        if (useFunctionCalling) {
            addLoadingChatBox();
        }

        try {
            const { message, updatedChatHistory, stream } = await gptUtils.current.fetchChatCompletions(
                openaiChatHistory,
                pageContext,
                props.pageNumber,
                userText,
                useFunctionCalling,
                addPageCallChatBox,
                useImage,
                useImage ? props.pageImage : null
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
        } catch (error) {
            console.error("Error in chat completion:", error);
            setChatHistory(prevChatHistory => prevChatHistory.concat([
                <Message
                    isBot={true}
                    text={"Sorry, an error occurred while processing your request. Please try again."}
                    scrollToBottom={scrollToBottom}
                    messageKey={chatHistory.length}
                    model={model}
                    onEdit={handleEdit}
                    onRegenerate={handleRegenerate}
                />
            ]));
            setIsGenerating(false);
        }
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
     * Convert the chat history to Markdown format
     * @returns {string} Markdown representation of the chat
     */
    const convertChatToMarkdown = () => {
        let markdown = `# Chat Export - ${new Date().toLocaleString()}\n\n`;

        openaiChatHistory.forEach(message => {
            const sender = message.role === "assistant" ? `**AI (${model})**` : "**User**";
            let text = message.content;

            // Replace <think> tags with <details> tags and add summary
            text = text.replace(/<think>/g, '<details>\n<summary>Reasoning</summary>\n\n');
            text = text.replace(/<\/think>/g, '\n</details>');

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
     * Save the current chat to localStorage
     */
    const saveCurrentChat = () => {
        if (openaiChatHistory.length === 0) return;

        // If updating an existing chat
        if (activeChatId) {
            const existingChat = savedChats.find(chat => chat.id === activeChatId);
            if (existingChat && window.confirm(`Update existing chat "${existingChat.name}"?`)) {
                const updatedChat = {
                    ...existingChat,
                    openaiChatHistory: openaiChatHistory,
                    model: model,
                    date: new Date().toISOString(),
                    fileInfo: props.file ? { name: props.file.name } : null
                };

                const updatedSavedChats = savedChats.map(chat =>
                    chat.id === activeChatId ? updatedChat : chat
                );
                setSavedChats(updatedSavedChats);
                localStorage.setItem('savedChats', JSON.stringify(updatedSavedChats));
                handleIconClick('save');
                return;
            }
        }

        // Create a new chat
        const chatName = prompt('Enter a name for this chat:', `Chat ${new Date().toLocaleString()}`);
        if (!chatName) return; // User canceled

        const newChatId = Date.now();
        const chatToSave = {
            id: newChatId,
            name: chatName,
            date: new Date().toISOString(),
            openaiChatHistory: openaiChatHistory,
            model: model,
            fileInfo: props.file ? { name: props.file.name } : null
        };

        const updatedSavedChats = [...savedChats, chatToSave];
        setSavedChats(updatedSavedChats);
        localStorage.setItem('savedChats', JSON.stringify(updatedSavedChats));
        setActiveChatId(newChatId); // Set this as the active chat
        handleIconClick('save');
    };

    /**
     * Load a saved chat from localStorage
     * @param {Object} savedChat - The saved chat to load
     */
    const loadSavedChat = (savedChat) => {
        if (!window.confirm(`Load chat "${savedChat.name}"? Current chat will be replaced.`)) return;

        setOpenaiChatHistory(savedChat.openaiChatHistory);

        // Recreate Message components from saved history
        const newChatHistory = [];
        let messageIndex = 0;

        // Skip system message (index 0) when recreating UI components
        savedChat.openaiChatHistory.slice(1).forEach((msg) => {
            // Skip messages with image content when recreating the UI
            // Check if content is an array and contains image data
            if (Array.isArray(msg.content) && msg.content.some(item => item.type === 'image_url')) {
                // For image messages, create a simple text message noting the image was in the conversation
                if (msg.role === 'user') {
                    newChatHistory.push(
                        <Message
                            isBot={false}
                            text="[Image shared with AI]"
                            scrollToBottom={scrollToBottom}
                            messageKey={messageIndex++}
                            model={savedChat.model || model}
                            onEdit={handleEdit}
                            onRegenerate={handleRegenerate}
                        />
                    );
                }
            } else {
                // For normal text messages
                newChatHistory.push(
                    <Message
                        isBot={msg.role === 'assistant'}
                        text={typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                        scrollToBottom={scrollToBottom}
                        messageKey={messageIndex++}
                        model={savedChat.model || model}
                        onEdit={handleEdit}
                        onRegenerate={handleRegenerate}
                    />
                );
            }
        });

        setChatHistory(newChatHistory);
        if (savedChat.model && supportedModels.current.includes(savedChat.model)) {
            setModel(savedChat.model);
            gptUtils.current.setModel(savedChat.model);
        }

        setActiveChatId(savedChat.id); // Set this as the active chat
        setShowSavedChats(false);
    };

    /**
     * Delete a saved chat
     * @param {Object} chatToDelete - The chat to delete
     * @param {Event} e - The event object
     */
    const deleteSavedChat = (chatToDelete, e) => {
        e.stopPropagation(); // Prevent triggering the parent click (loading the chat)

        if (!window.confirm(`Delete chat "${chatToDelete.name}"?`)) return;

        const updatedSavedChats = savedChats.filter(chat => chat.id !== chatToDelete.id);
        setSavedChats(updatedSavedChats);
        localStorage.setItem('savedChats', JSON.stringify(updatedSavedChats));
    };

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

                <button
                    className="save"
                    id="hoverable"
                    disabled={openaiChatHistory.length === 0}
                    onClick={saveCurrentChat}
                    title="Save chat"
                >
                    <FontAwesomeIcon icon={faSave} className={animatingButton === 'save' ? 'pulse-animation' : ''} />
                </button>

                <div className="saved-chats-container">
                    <button
                        className="load"
                        id="hoverable"
                        disabled={savedChats.length === 0}
                        onClick={() => setShowSavedChats(!showSavedChats)}
                        title="Load saved chat"
                    >
                        <FontAwesomeIcon icon={faFolderOpen} className={animatingButton === 'load' ? 'pulse-animation' : ''} />
                    </button>

                    {showSavedChats && savedChats.length > 0 && (
                        <div className="saved-chats-dropdown">
                            {savedChats.map(chat => (
                                <div
                                    key={chat.id}
                                    className="saved-chat-item"
                                    onClick={() => loadSavedChat(chat)}
                                >
                                    <div className="saved-chat-details">
                                        <div className="saved-chat-name">{chat.name}</div>
                                        <div className="saved-chat-date">{new Date(chat.date).toLocaleString()}</div>
                                        {chat.fileInfo && <div className="saved-chat-file">{chat.fileInfo.name}</div>}
                                    </div>
                                    <button
                                        className="delete-saved-chat"
                                        onClick={(e) => deleteSavedChat(chat, e)}
                                        title="Delete this saved chat"
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
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
                        setUsePageText(pageContextCycles[(pageContextCycles.indexOf(usePageText) + 1) % 4]);
                    }}
                    title={usePageText === "-" ? "Use page text as context" : usePageText === "+" ? "Use multiple pages as context" : usePageText === "x" ? "Do not use page text as context" : "Use image as context"}
                >
                    <FontAwesomeIcon
                        icon={usePageText === "-" ? faFileCircleMinus : usePageText === "+" ? faFileCirclePlus : usePageText === "x" ? faFileCircleXmark : faImage}
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
                        clearChat();
                    }}
                    title={isGenerating ? "Stop generating" : "Clear chat"}
                >
                    <FontAwesomeIcon icon={isGenerating ? faStop : faTrash} className={animatingButton === 'clear' ? 'pulse-animation' : ''} />
                </button>
            </div>
            <div className="additional-chat-elements">
                {activeChatId && (
                    <div className="alert">
                        Working on: {getActiveChatName()}
                    </div>
                )}
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