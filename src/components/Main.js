
import React, { useRef, useState } from "react";
import Chat from './Chat.js';
import PDFViewer from './PDFViewer.js';
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import '../styles/PDFViewer.css';

export default function Main(props) {
    const [pageText, setPageText] = useState("");
    const textContainerRef = useRef(null);

    
    return (
        <div>
            <div className="container">
                <PDFViewer file={props.file} setPageText={setPageText} />

                <div className="text-container" ref={textContainerRef}>
                    <Chat text={pageText} />
                </div>
            </div>
        </div>
    );
}