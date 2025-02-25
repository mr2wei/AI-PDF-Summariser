import ReactResizeDetector from "react-resize-detector";
import React, { useRef, useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faCaretRight, faCaretLeft } from '@fortawesome/free-solid-svg-icons';
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import '../styles/PDFViewer.css'


export default function PDFViewer(props) {
    const [numPages, setNumPages] = useState(null);
    const [jumpToPage, setJumpToPage] = useState("");
    const [outline, setOutline] = useState([]);
    const [showTableOfContents, setShowTableOfContents] = useState(false);
    const [showPDF, setShowPDF] = useState(true);
    const [currentSection, setCurrentSection] = useState("");
    const pdfRef = useRef(null);

    useEffect(() => {
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;
    }, []);

    const loadPDFOutline = async (fileData) => {
        setOutline([]);
        try {
            const loadingTask = pdfjs.getDocument({ data: fileData });
            const pdf = await loadingTask.promise;
            const outline = await pdf.getOutline();
            setOutline(outline.map(item => ({ title: item.title, pageNumber: null })));

            // Resolve each destination to find the page numbers
            for (let item of outline) {
                if (item.dest && Array.isArray(item.dest) && item.dest.length > 0) {
                    try {
                        // The first element often contains a reference to the page object
                        const pageRef = item.dest[0];
                        if (pageRef && typeof pageRef === 'object' && 'num' in pageRef) {
                            const pageNumber = await pdf.getPageIndex(pageRef) + 1;
                            // console.log(`Chapter '${item.title}' starts on page: ${pageNumber}`);

                            setOutline(prevOutline => prevOutline.map(ot =>
                                ot.title === item.title ? { ...ot, pageNumber } : ot
                            ));
                        }
                    } catch (error) {
                        console.error('Error resolving destination for:', item.title, error);
                    }
                }
            }

        } catch (error) {
            console.error('Error loading PDF:', error);
        }
        console.log(outline)
    };

    useEffect(() => {
        props.setPageNumber(1);
        if (props.file && props.file instanceof File) {
            const reader = new FileReader();
            reader.onload = (e) => {
                loadPDFOutline(e.target.result);
            };
            reader.onerror = (e) => {
                console.error('Error reading file:', e);
            };
            reader.readAsArrayBuffer(props.file);
        }
    }, [props.file]);

    const toggleTableOfContents = () => {
        setShowTableOfContents(!showTableOfContents);
    };


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

    const getCurrentSection = () => {
        const possibleSections = outline.filter(item => item.pageNumber && props.pageNumber >= item.pageNumber);
        for (let i = possibleSections.length - 1; i >= 0; i--) {
            if (possibleSections[i].pageNumber && props.pageNumber >= possibleSections[i].pageNumber) {
                setCurrentSection(possibleSections[i].title);
                break;
            }
        }
    }

    useEffect(() => {
        getCurrentSection();
    }, [props.pageNumber]);

    return (
        <div className="pdf-container">
            <div className="pdf-controls">
                <button
                    className="page-control"
                    id="hoverable"
                    onClick={() => toggleTableOfContents()}
                    disabled={outline.length === 0}
                >
                    <FontAwesomeIcon icon={faBars} />
                </button>
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

                <div className="control-padding"></div>
            </div>
            <div className={`table-of-contents ${showTableOfContents ? "visible" : ""}`}>
                <div className="toc-container">
                    {outline.map((item, index) => {
                        return (
                            <div
                                key={index}
                                className={`toc-item ${item.pageNumber ? "" : "toc-section-header"} ${currentSection === item.title ? "toc-highlight" : ""}`}
                                id={`${item.pageNumber ? "hoverable" : ""}`}
                                onClick={() => item.pageNumber && props.setPageNumber(item.pageNumber) && toggleTableOfContents()}
                            >
                                {item.title}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className={`pdf ${showPDF ? "" : "hidden"}`}>
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

        </div>
    );
}