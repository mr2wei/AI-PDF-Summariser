import ReactResizeDetector from "react-resize-detector";
import React, { useRef, useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faForward, faCaretRight, faCaretLeft } from '@fortawesome/free-solid-svg-icons';
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import '../styles/PDFViewer.css'


export default function PDFViewer(props) {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [jumpToPage, setJumpToPage] = useState("");
    const pdfRef = useRef(null);

    useEffect(() => {
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;
    }, []);

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    const onPageLoadSuccess = (page) => {
        page.getTextContent().then((textContent) => {
            let text = "";
            textContent.items.forEach((item) => {
                text += item.str + " ";
            });
            props.setPageText(text);

            // if (textContainerRef.current) {
            //     textContainerRef.current.scrollIntoView();
            // }
            // if (textContainerRef.current) {
            //     const containerHeight = textContainerRef.current.offsetHeight;
            //     const pageHeight = page.view[3];
            //     if (pageHeight !== containerHeight * 0.9) {
            //         const scale = containerHeight*0.9 / pageHeight;
            //         document.getElementsByClassName("pdf")[0].style.transform = `scale(${scale})`;
            //     }

            // }
        });
    };

    const goToPreviousPage = (event) => {
        event.preventDefault();
        if (pageNumber > 1) {
            setPageNumber(pageNumber - 1);
        }
    };

    const goToNextPage = (event) => {
        event.preventDefault();
        if (pageNumber < numPages) {
            setPageNumber(pageNumber + 1);
        }
    };

    const handleJumpToPage = (event) => {
        event.preventDefault();
        const page = parseInt(jumpToPage);
        if (!isNaN(page) && page >= 1 && page <= numPages) {
            setPageNumber(page);
        }
        setJumpToPage("");
    };

    return (
        <div className="pdf-container">
            <div className="pdf-controls">
                <button className="page-indicator">Page {pageNumber} of {numPages}</button>
                <button onClick={goToPreviousPage} id="hoverable" disabled={pageNumber === 1} className="page-control">
                    <FontAwesomeIcon icon={faCaretLeft} />
                </button>
                <button onClick={goToNextPage} id="hoverable" disabled={pageNumber === numPages} className="page-control">
                    <FontAwesomeIcon icon={faCaretRight} />
                </button>
                <input
                    className="input-page"
                    type="text"
                    value={jumpToPage}
                    onChange={(e) => setJumpToPage(e.target.value)}
                    placeholder="Jump"
                    id="hoverable"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleJumpToPage(e);
                        }
                    }}
                />
                <button id="hoverable" onClick={handleJumpToPage}>
                    <FontAwesomeIcon icon={faForward} />
                </button>
            </div>
            <div className="pdf">
                <ReactResizeDetector handleWidth handleHeight>
                    {({ width, height, targetRef }) => (
                        <div ref={targetRef}>
                            <Document file={props.file} onLoadSuccess={onDocumentLoadSuccess} ref={pdfRef}>
                                <Page pageNumber={pageNumber} width={width} height={height} onLoadSuccess={onPageLoadSuccess} />
                            </Document>
                        </div>
                    )}
                </ReactResizeDetector>
            </div>


            {/* <Document
                        className="pdf"
                        file={props.file}
                        onLoadSuccess={onDocumentLoadSuccess}
                        ref={pdfRef}
                    >
                        <Page
                            pageNumber={pageNumber}
                            onLoadSuccess={onPageLoadSuccess}
                        />
                    </Document> */}
        </div>
    );
}