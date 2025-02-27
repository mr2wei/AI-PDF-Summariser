import { OpenAI } from "openai";
import Cookies from 'js-cookie';
import * as Tiktoken from 'js-tiktoken';
import { pdfjs } from 'react-pdf';


export default class GPT {
    constructor(file, model) {
        this.openai = new OpenAI({ apiKey: Cookies.get('togetherApiKey'), dangerouslyAllowBrowser: true, baseURL: "https://api.together.xyz/v1" });
        this.guidance = "You are a PDF aid. Your job is to use context from text given to answer the user's requests. For summaries, Your job is to provide a neat summary of key points and information from the text. please format the response using bullet points for each key point. If the user is asking about the content, prioritise answering with information given. Always use LaTeX for math.";
        this.model = model;
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;
        this.file = null;
        // this.currentFile = file;
        // this.setActivePDF(file);
    }

    setActivePDF(file) {
        // if (this.currentFile === file) {
        //     return;
        // }
        console.log("setActivePDF");
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();

            fileReader.onload = () => {
                const arrayBuffer = fileReader.result;
                const uint8Array = new Uint8Array(arrayBuffer);
                const loadingTask = pdfjs.getDocument({ data: uint8Array });

                loadingTask.promise.then(pdf => {
                    this.file = pdf;
                    console.log(this.file);
                    resolve(this.file); // Resolve the promise with the loaded PDF
                }).catch(error => {
                    console.error("Error processing PDF", error);
                    reject(error); // Reject the promise with the error
                });
            };

            fileReader.onerror = () => {
                reject(fileReader.error);
            };

            fileReader.readAsArrayBuffer(file);
        });
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
            // Handle different content types (string vs array)
            if (typeof message.content === 'string') {
                // Encode the content of the message into tokens.
                const tokens = encoder.encode(message.content);
                // Concatenate the tokens into the total_tokens array.
                total_tokens = total_tokens.concat(tokens);
            } else if (Array.isArray(message.content)) {
                // For multimodal messages with content arrays
                message.content.forEach(item => {
                    if (item.type === 'text') {
                        const tokens = encoder.encode(item.text);
                        total_tokens = total_tokens.concat(tokens);
                    }
                    // Skip tokenizing image content
                });
            }
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
            { role: 'user', content: `Summarise "${text}" and format response in markdown. For mathematical expressions, notations or equations use LaTeX` }
        ];
        try {
            const stream = await this.openai.chat.completions.create({
                model: this.model,
                messages: openaiChatHistory,
                stream: true,
            });

            return { message: "", updatedChatHistory: openaiChatHistory, stream };
        } catch (error) {
            console.error(error);
            const message = `Sorry, I couldn't generate a summary at the moment.<br><code>{error}</code>`
            return { message, updatedChatHistory: openaiChatHistory, stream: null };
        };
    }

    /**
     * Allows AI to call a function to get text from a specific page in the PDF. This allows for multiple pages to be used as context.
     * 
     * @param {*} openaiChatHistory The chat history to be used for generating the response.
     * @param {*} pageText The text from the page to be used as context.
     * @param {*} pageNumber The page number to be used as context.
     * @param {*} userMessage The user's message.
     * @param {*} addPageCallChatBox A function to add a "thought" message to the chat history.
     * @returns 
     */
    smarterFetchChatCompletions = async (openaiChatHistory, pageText, pageNumber, userMessage, addPageCallChatBox) => {
        // Create a deep copy of the chat history to avoid mutating the original
        let chatHistory = JSON.parse(JSON.stringify(openaiChatHistory));

        const getPageTextFromPageNumber = async (pageNumber) => {
            // if pageNumber is out of range, return an error message
            if (pageNumber < 1 || pageNumber > this.file.numPages) {
                return `Page ${pageNumber} does not exist. The PDF has ${this.file.numPages} pages.`;
            }
            const page = await this.file.getPage(pageNumber);
            const textContent = await page.getTextContent();
            let text = "";
            textContent.items.forEach((item) => {
                text += item.str + " ";
            }
            );
            return `Page ${pageNumber}: ${text}`;
        }

        // Ensure we have a system message at the beginning, but don't add duplicates
        if (chatHistory.length === 0 || chatHistory[0].role !== 'system') {
            chatHistory.unshift({ role: 'system', content: `${this.guidance}. The user is on page ${pageNumber} of ${this.file.numPages}. Get text from other pages if more context is needed${pageText ? ', do not get the text content from the current page' : ''}.` });
        }

        // Add the user message
        if (pageText) {
            chatHistory.push({ role: 'user', content: `From page ${pageNumber}: ${pageText}. ${userMessage}.` });
        } else {
            chatHistory.push({ role: 'user', content: userMessage });
        }

        let tokens;
        do {
            tokens = await this.getMessageTokens(chatHistory);
            // remove the oldest non-system message if we exceed token limit
            if (chatHistory.length > 2 && tokens > 4096) {
                chatHistory.splice(1, 1);
            } else if (chatHistory.length === 2 && tokens > 4096) {
                return false;
            }
        } while (tokens > 4096);

        const tools = [
            {
                type: 'function',
                function: {
                    name: "getPageTextFromPageNumber",
                    description: "Retrieve text from a specific page in the user's PDF",
                    parameters: {
                        type: 'object',
                        properties: {
                            pageNumber: { type: 'integer', description: 'The page number to get text from' },
                        },
                        required: ['pageNumber']
                    }
                }
            }
        ];

        try {
            let response = await this.openai.chat.completions.create({
                model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
                messages: chatHistory,
                tools: tools,
            })

            while (response.choices[0].finish_reason === "tool_calls") {

                const assistant_message = response.choices[0].message;
                assistant_message.content = JSON.stringify(assistant_message.tool_calls[0].function);
                chatHistory.push(assistant_message);

                console.log(assistant_message)

                for (const toolCall of response.choices[0].message.tool_calls) {
                    if (toolCall.function.name === "getPageTextFromPageNumber") {
                        const toolArgs = JSON.parse(toolCall.function.arguments);
                        const pageText = await getPageTextFromPageNumber(toolArgs.pageNumber);
                        addPageCallChatBox(toolArgs.pageNumber);
                        chatHistory.push({ role: 'tool', 'tool_call_id': toolCall.id, 'name': toolCall.function.name, 'content': pageText });
                    } else {
                        console.error("Unknown tool call");
                        chatHistory.pop();
                        return { message: "Unknown tool called by assistant.", updatedChatHistory: chatHistory, stream: null };
                    }
                }

                // 2nd API call
                response = await this.openai.chat.completions.create({
                    model: this.model,
                    messages: chatHistory,
                    tools: tools,
                })

            }

            chatHistory.push({ role: 'assistant', content: response.choices[0].message.content });

            console.log(response);
            // throw new Error("test");
            return { message: response.choices[0].message.content, updatedChatHistory: chatHistory, stream: null };
        } catch (error) {
            console.error(error);
            const message = `Sorry, I couldn't generate a response at the moment. \`\`\`${error}\`\`\``
            return { message, updatedChatHistory: chatHistory, stream: null };
        }
    }

    /**
     * Handles chat completions when using the page as an image rather than text
     * 
     * @param {Array} openaiChatHistory The chat history to be used for generating the response
     * @param {String} pageText The text from the page (not used in this mode)
     * @param {Number} pageNumber The page number being viewed
     * @param {String} userMessage The user's message
     * @param {String} pageImage Base64 encoded image of the page
     * @returns {Object} The response with message, updatedChatHistory, and stream
     */
    imageBasedFetchChatCompletions = async (openaiChatHistory, pageText, pageNumber, userMessage, pageImage) => {
        // Create a deep copy of the chat history to avoid mutating the original
        let chatHistory = JSON.parse(JSON.stringify(openaiChatHistory));

        // Ensure we have a system message at the beginning
        if (chatHistory.length === 0 || chatHistory[0].role !== 'system') {
            chatHistory.unshift({ role: 'system', content: `${this.guidance}. The user is on page ${pageNumber} of ${this.file.numPages}. You can see an image of the PDF page.` });
        }

        // Create a message with the image
        const messageWithImage = {
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: `Here is page ${pageNumber} of the PDF. My query: ${userMessage}`
                },
                {
                    type: 'image_url',
                    image_url: {
                        url: pageImage
                    }
                }
            ]
        };

        // Add the user message with image
        chatHistory.push(messageWithImage);

        try {
            const response = await this.openai.chat.completions.create({
                model: 'Qwen/Qwen2-VL-72B-Instruct',
                messages: chatHistory,
            });

            // Ensure response content is always a string
            const messageContent = typeof response.choices[0].message.content === 'string'
                ? response.choices[0].message.content
                : JSON.stringify(response.choices[0].message.content);

            chatHistory.push({ role: 'assistant', content: messageContent });

            return { message: messageContent, updatedChatHistory: chatHistory, stream: null };
        } catch (error) {
            console.error(error);
            const message = `Sorry, I couldn't analyze the image at the moment. \`\`\`${error}\`\`\``
            return { message, updatedChatHistory: chatHistory, stream: null };
        }
    }

    /**
     * This function generates a response to the user's message.
     *  
     * @param {String} openaiChatHistory
     * 
     * @returns {Object} The response to the user's message, openaiChatHistory, and stream if available.
     */
    fetchChatCompletions = async (openaiChatHistory, pageText, pageNumber, userMessage, useFunctionCalling, addPageCallChatBox, useImage = false, pageImage = null) => {
        if (useImage && pageImage) {
            return this.imageBasedFetchChatCompletions(openaiChatHistory, pageText, pageNumber, userMessage, pageImage);
        }

        if (useFunctionCalling) {
            return this.smarterFetchChatCompletions(openaiChatHistory, pageText, pageNumber, userMessage, addPageCallChatBox);
        }

        // Create a deep copy of the chat history to avoid mutating the original
        let chatHistory = JSON.parse(JSON.stringify(openaiChatHistory));

        // Ensure we have a system message at the beginning, but don't add duplicates
        if (chatHistory.length === 0 || chatHistory[0].role !== 'system') {
            chatHistory.unshift({ role: 'system', content: this.guidance });
        }

        // Sanitize any potentially non-string content in chatHistory
        chatHistory.forEach(msg => {
            if (msg.content && typeof msg.content !== 'string') {
                msg.content = JSON.stringify(msg.content);
            }
        });

        // Add the user message
        if (pageText) {
            chatHistory.push({ role: 'user', content: `Below is an excerpt from the PDF:\n\n${pageText}\n\nMy Query is:\n${userMessage}.` });
        } else {
            chatHistory.push({ role: 'user', content: userMessage });
        }

        let tokens;
        do {
            tokens = await this.getMessageTokens(chatHistory);
            // remove the oldest non-system message if we exceed token limit
            if (chatHistory.length > 2 && tokens > 4096) {
                chatHistory.splice(1, 1);
            } else if (chatHistory.length === 2 && tokens > 4096) {
                return false;
            }
        } while (tokens > 4096);

        try {
            const stream = await this.openai.chat.completions.create({
                model: this.model,
                messages: chatHistory,
                stream: true,
            });

            return { message: "", updatedChatHistory: chatHistory, stream };
        } catch (error) {
            console.error(error);
            const message = `Sorry, I couldn't generate a response at the moment. \`\`\`${error}\`\`\``
            return { message, updatedChatHistory: chatHistory, stream: null };
        }
    }
    /**
     * 
     * @param {*} model - The model to be used for generating responses.
     */
    setModel = (newModel) => {
        this.model = newModel;
        console.log("set model to " + this.model)
    }

    getSupportedModels = () => {
        return [
            "deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free",
            "deepseek-ai/DeepSeek-R1-Distill-Qwen-14B",
            "deepseek-ai/DeepSeek-R1",
            "deepseek-ai/DeepSeek-V3",
            "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
            "meta-llama/Llama-3.3-70B-Instruct-Turbo",
            "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
            "Qwen/Qwen2-VL-72B-Instruct"
        ];
    }

}

