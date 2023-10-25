import React, { useState, useEffect, useCallback } from "react";
import ReactMarkdown from 'react-markdown';
import * as Tiktoken from 'js-tiktoken';


export default function Message(props){ 
    const [textContent, setTextContent] = useState("");
    const [completed, setCompleted] = useState(false);
    const delay = ms => new Promise(res => setTimeout(res, ms));

    /**
     * This function calculates the total number of tokens in the chat history.
     * It uses the Tiktoken library to encode each message in the chat history into tokens.
     * The tokens are then concatenated into a total_tokens array.
     * The function returns the length of the total_tokens array, which represents the total number of tokens.
     *
     * @param {Array} chatHistory - The chat history to be tokenized.
     * @return {Number} The total number of tokens in the chat history.
     */
     const getMessageTokens = async (chatHistory) => {
        // Initialize the encoder for the "gpt-3.5-turbo" model.
        const encoder = Tiktoken.encodingForModel("gpt-3.5-turbo");
        // Initialize an empty array to store the tokens.
        let total_tokens = [];
        // Iterate over each message in the chat history.
        chatHistory.forEach((message) => {
            // Encode the content of the message into tokens.
            const tokens = encoder.encode(message.content);
            // Concatenate the tokens into the total_tokens array.
            total_tokens = total_tokens.concat(tokens);
        });

        // Return the total number of tokens.
        return total_tokens.length;
    }

    const fetchChatCompletions = useCallback(async () => {
        let openaiChatHistory = props.messageHistory;
        let tokens;

        do {
            tokens = await getMessageTokens(openaiChatHistory);
            // remove the second message from the chat history (because the first is the guidance message)
            if (openaiChatHistory.length > 2 && tokens > 4096){
                openaiChatHistory.splice(1, 1);
            } else if (openaiChatHistory.length === 2 && tokens > 4096){
                setTextContent("Sorry, this page is too long to read.");
                return;
            }
        } while (tokens > 4096);

        while(true) {
            try {
                const stream = await props.openai.chat.completions.create({
                    model: 'gpt-3.5-turbo',
                    messages: openaiChatHistory,
                    stream: true,
                });

                let result = '';
                
                props.setIsGenerating(true);

                for await (const part of stream) {
                    const deltaContent = part.choices[0]?.delta?.content || '';
                    result += deltaContent;
                    setTextContent(result);
                    // setTextContent(<ul className="list-container">
                    // {result.split('\n').map((point, index) => (
                    //     <li key={index}>{point}</li>
                    // ))}
                    // </ul>);
                    props.scrollToBottom();
                }
                
                props.setIsGenerating(false);
                break;

            } catch (error) {
                if (error.type && error.type === "invalid_request_error"){
                    if (props.messageHistory.length > 2){
                        let newMessageHistory = [...props.messageHistory];
                        newMessageHistory.splice(1, 1);
                        props.setMessageHistory(newMessageHistory);   
                        openaiChatHistory = newMessageHistory;
                    } else {
                        setTextContent("Sorry, this page is too long to read.");
                        break;
                    }
                } else if (error.type && error.type === "rate_limit_exceeded"){
                    setTextContent("Rate limit exceeded. Please try again later.");
                    break;
                } else {
                    throw error;
                }
            }
        }
    }, [props]);

    
    useEffect(() => {
        if (props.isBot && !completed) {
            console.log("fetching completions");
            setCompleted(true);
            delay(1000).then(() => {
                fetchChatCompletions();
            });
        } else if (!props.isBot && !completed) {
            setTextContent(props.text);
            setCompleted(true);
            props.scrollToBottom();
        }
    }, [fetchChatCompletions, completed, props.isBot, props.text]);

    return (
        <div className={props.isBot? "bot-message-container" : "user-message-container"}>
            <div className={props.isBot? "bot-message" : "user-message"} id = "message">
                <div className="author">
                    {props.isBot? "AI ✨" : "User"}
                </div>
                <ReactMarkdown>
                    {textContent}
                </ReactMarkdown>
            </div>
        </div>
    );
}
