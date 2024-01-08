# AI PDF Summariser

![Future of taking notes, with a box showing the PDF document and the navigation buttons and another box showing the AI generated content](images/Site.png)

![Image showing more examples of the ai generated explanations and summarise and bold text "Learn Concepts Faster" and "Get Questions Answered"](images/Generation.png)


## Website
<a href="https://mr2wei.github.io/AI-PDF-Summariser">mr2wei.github.io/AI-PDF-Summariser</a>

## Introduction
Using openAI API, this web app will be able to summarise and respond to questions about a given PDF file. Easily create notes from the textbook by letting the AI summarise and explain the content to you. If you're still confused, simply ask the AI questions regarding the text and it will answer using the information from the PDF.

## How to use
1. Upload a PDF file
2. Select Generate to summarise the text of the displayed page or simply type in the chat box to ask questions about the text.

Note: The context button simply toggles between adding the context of the page on each message or not.

## Limitations
- It only has context of the current page, so it will not be able to answer questions about the entire PDF.
- It doesn't handle math problems well since I haven't implemented any way for the AI to run equations.

## Current Progress
- Using function calling to allow the AI to get text from any page in the PDF.

## Issues
- Rendering latex is very finicky and doesn't always work.
