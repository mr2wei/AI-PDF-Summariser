import React, { useState, useEffect } from "react";
import { OpenAI } from "openai";
import '../styles/GPT.css';

export default function GPT(props){
    const openai = new OpenAI({ apiKey: process.env.REACT_APP_OPENAI_API_KEY, dangerouslyAllowBrowser: true })

    const [response, setResponse] = useState("");
    const [generateClicked, setGenerateClicked] = useState(false);
    const [userMessage, setUserMessage] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    const guidance = "Your job is to provide concise responses and answers to what the user asks. If the user is asking about the summary or content, prioritise answering with information given. Format responses to be as readible as possible, if there are sub topics/topics bold the name of the sub topic/topic";

    const fetchChatCompletions = async () => {
        const stream = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {role: 'system', content: guidance}, 
                {role: 'user', content: `Create a concise summary of ${props.text}. format your response in the most readable way possible.`}
            ],
            stream: true,
        });

        let result = '';
        
        setIsGenerating(true);

        for await (const part of stream) {
            const deltaContent = part.choices[0]?.delta?.content || '';
            result += deltaContent;
            setResponse(result);
        }

        setIsGenerating(false);
    };

    const handleGenerate = async () => {
        await fetchChatCompletions();
        setGenerateClicked(true);
    };

    useEffect(() => {
        setGenerateClicked(false);
    }, [props.text]);

    return (
        <div className="response">
            <button className="generate" id="hoverable" disabled={!props.text} onClick={handleGenerate}>
                Generate
            </button>
            <ul className="list-container">
                {response.split('\n').map((point, index) => (
                    <li key={index}>{point}</li>
                ))}
            </ul>
            <div className="chat-elements">
                <input
                    type="text"
                    value={userMessage}
                    onChange={(e) => setUserMessage(e.target.value)}
                    placeholder="Ask about it"
                    id="hoverable"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            // handleJumpToPage(e);
                        }
                    }}
                    disabled={!generateClicked || isGenerating}
                />
                <button 
                    id="hoverable"
                    disabled={!generateClicked || isGenerating}
                >
                    Send
                </button>
            </div>
        </div>
    );
}