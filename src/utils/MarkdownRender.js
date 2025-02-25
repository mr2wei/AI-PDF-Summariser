import React from 'react';
import ReactMarkdown from 'react-markdown';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import RemarkMathPlugin from 'remark-math';

function MarkdownRender(props) {
    const config = {
        // Add your MathJax configuration here
        tex: {
            inlineMath: [['$', '$'], ['\\(', '\\)']],
            displayMath: [['$$', '$$'], ['\\[', '\\]']],
            processEscapes: true,
            processEnvironments: true
        },
        options: {
            enableMenu: true,
            skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
        }
    };

    const newProps = {
        ...props,
        plugins: [
            RemarkMathPlugin,
        ],
        renderers: {
            ...props.renderers,
            math: ({ value }) => <MathJax inline={false}>{value}</MathJax>,
            inlineMath: ({ value }) => <MathJax inline={true}>{value}</MathJax>
        }
    };

    return (
        <MathJaxContext config={config}>
            <ReactMarkdown {...newProps} />
        </MathJaxContext>
    );
}

export default MarkdownRender;
