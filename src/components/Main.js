
import React, { useRef, useState } from "react";
import Chat from './Chat.js';
import PDFViewer from './PDFViewer.js';
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import '../styles/PDFViewer.css';

export default function Main(props) {
    const [pageText, setPageText] = useState("");
    const textContainerRef = useRef(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageImage, setPageImage] = useState(null);

    return (
        <div>
            <div className="container">
                <PDFViewer file={props.file} setPageText={setPageText} pageNumber={pageNumber} setPageNumber={setPageNumber} setPageImage={setPageImage} />

                <div className="text-container" ref={textContainerRef}>
                    <Chat file={props.file} text={pageText} pageNumber={pageNumber} pageImage={pageImage} />
                </div>
            </div>
        </div>
    );
}