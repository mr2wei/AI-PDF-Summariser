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
        if (props.pageNumber > 1) {
            props.setPageNumber(props.pageNumber - 1);
        }
    };

    const goToNextPage = (event) => {
        event.preventDefault();
        if (props.pageNumber < numPages) {
            props.setPageNumber(props.pageNumber + 1);
        }
    };

    const handleJumpToPage = (event) => {
        event.preventDefault();
        const page = parseInt(jumpToPage);
        if (!isNaN(page) && page >= 1 && page <= numPages) {
            props.setPageNumber(page);
        }
        setJumpToPage("");
    };

    return (
        <div className="pdf-container">
            <div className="pdf-controls">
                <div className="page-indicator">
                    Page 
                    <input
                        className="input-page"
                        type="text"
                        value={jumpToPage}
                        onChange={(e) => setJumpToPage(e.target.value)}
                        placeholder={props.pageNumber}
                        id="hoverable"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleJumpToPage(e);
                            }
                        }}
                    /> of {numPages}</div>
                <button onClick={goToPreviousPage} id="hoverable" disabled={props.pageNumber === 1} className="page-control">
                    <FontAwesomeIcon icon={faCaretLeft} />
                </button>
                <button onClick={goToNextPage} id="hoverable" disabled={props.pageNumber === numPages} className="page-control">
                    <FontAwesomeIcon icon={faCaretRight} />
                </button>
                
                <div className="control-padding">

                </div>
            </div>
            <div className="pdf">
                <ReactResizeDetector handleWidth handleHeight>
                    {({ width, height, targetRef }) => (
                        <div ref={targetRef}>
                            <Document file={props.file} onLoadSuccess={onDocumentLoadSuccess} ref={pdfRef}>
                                <Page pageNumber={props.pageNumber} width={width} height={height} onLoadSuccess={onPageLoadSuccess} />
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