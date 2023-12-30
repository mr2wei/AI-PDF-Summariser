import { OpenAI } from "openai";
import Cookies from 'js-cookie';
import * as Tiktoken from 'js-tiktoken';


export default class GPT {
    constructor(model) {
        this.openai = new OpenAI({ apiKey: Cookies.get('apiKey'), dangerouslyAllowBrowser: true });
        this.guidance = "Your job is to use context from text given to answer the user's requests. For summaries, Your job is to provide a neat summary of key points and information from the text. please format the response using bullet points for each key point. If the user is asking about the content, prioritise answering with information given. Format response in HTML, HTML formatting is allowed. Always use LaTeX for math.";
        this.model = model;
    }

    /**
     * This function calculates the total number of tokens in the chat history.
     * It uses the Tiktoken library to encode each message in the chat history into tokens.
     * The tokens are then concatenated into a total_tokens array.
     * The function returns the length of the total_tokens array, which represents the total number of tokens.
     *
     * @param {Array} chatHistory - The chat history to be tokenized.
     * @return {Number} The total number of tokens in the chat history.
     */
    getMessageTokens = async (chatHistory) => {
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

    /**
     * This function generates a summary of the given text.
     * 
     * @param {String} text
     * @returns 
     */
    generateSummary = async (text) => {
        const openaiChatHistory = [
            { role: 'system', content: this.guidance },
            { role: 'user', content: `Summarise "${text}" and format response in HTML, HTML formatting is allowed.` }
        ];
        try {
            const stream = await this.openai.chat.completions.create({
                model: this.model,
                messages: openaiChatHistory,
                stream: true,
            });

            return { message: "", openaiChatHistory, stream };
        } catch (error) {
            console.error(error);
            const message = `Sorry, I couldn't generate a summary at the moment.<br><code>{error}</code>`
            return { message, openaiChatHistory, stream: null };
        };
    }


    /**
     * This function generates a response to the user's message.
     *  
     * @param {String} openaiChatHistory
     * 
     * @returns {String} The response to the user's message.
     */
    fetchChatCompletions = async (openaiChatHistory, pageText, userMessage) => {
        // add guidance message to the start of chat history
        openaiChatHistory.unshift({ role: 'system', content: this.guidance });

        if (pageText){
            openaiChatHistory = openaiChatHistory.concat({ role: 'user', content: `from: ${pageText}. ${userMessage}.` })
        } else {
            openaiChatHistory = openaiChatHistory.concat({ role: 'user', content: userMessage });
        }
        let tokens;

        do {
            tokens = await this.getMessageTokens(openaiChatHistory);
            // remove the second message from the chat history (because the first is the guidance message)
            if (openaiChatHistory.length > 2 && tokens > 4096) {
                openaiChatHistory.splice(1, 1);
            } else if (openaiChatHistory.length === 2 && tokens > 4096) {
                return false;
            }
        } while (tokens > 4096);

        try {
            const stream = await this.openai.chat.completions.create({
                model: this.model,
                messages: openaiChatHistory,
                stream: true,
            });

            return { message: "", openaiChatHistory, stream };
        } catch (error) {
            console.error(error);
            const message = `Sorry, I couldn't generate a response at the moment.<br><code>{error}</code>`
            return { message, openaiChatHistory, stream: null };
        }
    }
    /**
     * 
     * @param {*} model - The model to be used for generating responses.
     */
    setModel = (newModel) => {
        this.model = newModel;
    }

    getSupportedModels = () => {
        return [
            "gpt-3.5-turbo",
            "gpt-4",
            "gpt-4-1106-preview"
        ];
    }

}

