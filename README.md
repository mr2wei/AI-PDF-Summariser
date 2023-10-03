# AI PDF Summariser

## Website
to be hosted

## Introduction
Using openAI API, this web app will be able to summarise and respond to questions about a given PDF file. Easily create notes from the textbook by letting the AI summarise and explain the content to you. If you're still confused, simply ask the AI questions regarding the text and it will answer using the information from the PDF.

## How to use
1. Upload a PDF file
2. Select Generate to summarise the text of the displayed page or simply type in the chat box to ask questions about the text.

Note: The context button simply toggles between adding the context of the page on each message or not.

## Limitations
- It only has context of the current page, so it will not be able to answer questions about the entire PDF.
- It doesn't handle math problems well since I haven't implemented any way for the AI to run equations.

## Known Issues
- I can't get the chat box to scroll to the bottom when a new message is added. 
- The size of the PDF might exceed its container
- Pressing enter while the chat box is empty will send a message (this should be easy to fix)
- I need to remove unused default stuff that came with create-react-app
