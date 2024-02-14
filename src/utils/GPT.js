import { OpenAI } from "openai";
import Cookies from 'js-cookie';
import * as Tiktoken from 'js-tiktoken';
import { pdfjs } from 'react-pdf';


export default class GPT {
    constructor(file, model) {
        this.openai = new OpenAI({ apiKey: Cookies.get('apiKey'), dangerouslyAllowBrowser: true });
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
            { role: 'user', content: `Summarise "${text}" and format response in markdown.` }
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
    
    smarterFetchChatCompletions = async (openaiChatHistory, pageText, pageNumber, userMessage, addPageCallChatBox) => {
        
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
    

        // add guidance message to the start of chat history
        if (pageText) {
            console.log(pageNumber)
            openaiChatHistory.unshift({ role: 'system', content: `${this.guidance}. The user is on page ${pageNumber} of ${this.file.numPages}. Get text from other pages if more context is needed${pageText ? ', do not get the text content from the current page' : ''}.` });
            openaiChatHistory = openaiChatHistory.concat({ role: 'user', content: `From page ${pageNumber}: ${pageText}. ${userMessage}.` });
        } else {
            openaiChatHistory.unshift({ role: 'system', content: `${this.guidance}. The user is on page ${pageNumber} of ${this.file.numPages}. Get text from other pages if more context is needed.` });
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
            // console.log(getPageTextFromPageNumber(57))
            let response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo-1106',
                messages: openaiChatHistory,
                tools: tools,
            })

            while (response.choices[0].finish_reason === "tool_calls"){

                const assistant_message = response.choices[0].message;
                assistant_message.content = JSON.stringify(assistant_message.tool_calls[0].function);
                openaiChatHistory.push(assistant_message);

                console.log(assistant_message)

                for (const toolCall of response.choices[0].message.tool_calls) {
                    if (toolCall.function.name === "getPageTextFromPageNumber") {
                        const toolArgs = JSON.parse(toolCall.function.arguments);
                        const pageText = await getPageTextFromPageNumber(toolArgs.pageNumber);
                        addPageCallChatBox(toolArgs.pageNumber);
                        openaiChatHistory.push({ role: 'tool', 'tool_call_id': toolCall.id, 'name': toolCall.function.name, 'content': pageText });
                    } else {
                        console.error("Unknown tool call");
                        openaiChatHistory.pop();
                        return { message: "Unknown tool called by assistant.", openaiChatHistory, stream: null };
                    }
                }

                // 2nd API call
                response = await this.openai.chat.completions.create({
                    model: this.model,
                    messages: openaiChatHistory,
                    tools: tools,
                })

            } 

            openaiChatHistory.push({ role: 'assistant', content: response.choices[0].message.content});

            console.log(response);
            // throw new Error("test");
            return { message: response.choices[0].message.content, openaiChatHistory, stream: null };
        } catch (error) {
            console.error(error);
            const message = `Sorry, I couldn't generate a response at the moment. \`\`\`${error}\`\`\``
            return { message, openaiChatHistory, stream: null };
        }
    }

    /**
     * This function generates a response to the user's message.
     *  
     * @param {String} openaiChatHistory
     * 
     * @returns {Object} The response to the user's message, openaiChatHistory, and stream if available.
     */
    fetchChatCompletions = async (openaiChatHistory, pageText, pageNumber, userMessage, useFunctionCalling, addPageCallChatBox) => {
        if (useFunctionCalling) {
            return this.smarterFetchChatCompletions(openaiChatHistory, pageText, pageNumber, userMessage, addPageCallChatBox);
        }

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
            const message = `Sorry, I couldn't generate a response at the moment. \`\`\`${error}\`\`\``
            return { message, openaiChatHistory, stream: null };
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
            "gpt-3.5-turbo",
            "gpt-4",
            "gpt-4-1106-preview",
        ];
    }

}

