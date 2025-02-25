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
            const topLevelOutline = await pdf.getOutline();

            // Process outline items and their children
            const processedOutline = [];

            const processItems = async (items, level = 0) => {
                for (let item of items) {
                    let pageNumber = null;

                    // Try to resolve the destination to find the page number
                    if (item.dest) {
                        try {
                            if (typeof item.dest === 'string') {
                                const destination = await pdf.getDestination(item.dest);
                                if (destination && Array.isArray(destination) && destination.length > 0) {
                                    const pageRef = destination[0];
                                    pageNumber = await pdf.getPageIndex(pageRef) + 1;
                                }
                            } else if (Array.isArray(item.dest) && item.dest.length > 0) {
                                const pageRef = item.dest[0];
                                if (pageRef && typeof pageRef === 'object' && 'num' in pageRef) {
                                    pageNumber = await pdf.getPageIndex(pageRef) + 1;
                                }
                            }
                        } catch (error) {
                            console.error('Error resolving destination for:', item.title, error);
                        }
                    }

                    processedOutline.push({
                        title: item.title,
                        pageNumber: pageNumber,
                        level: level
                    });

                    // Process children recursively if they exist
                    if (item.items && item.items.length > 0) {
                        await processItems(item.items, level + 1);
                    }
                }
            };

            await processItems(topLevelOutline);
            setOutline(processedOutline);

        } catch (error) {
            console.error('Error loading PDF:', error);
        }
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
        extractPageText(page).then(text => {
            props.setPageText(text);
        }).catch(error => {
            console.error('Error extracting text:', error);
            props.setPageText('');
        });
    };

    const extractPageText = async (page) => {
        try {
            const textContent = await page.getTextContent();
            
            // Group text items by their y-position to identify lines
            const textItems = textContent.items;
            const lines = {};
            
            textItems.forEach(item => {
                // Round the y-position to account for slight variations
                const yPos = Math.round(item.transform[5]);
                
                if (!lines[yPos]) {
                    lines[yPos] = [];
                }
                
                // Sort by x-position to maintain word order
                lines[yPos].push({
                    text: item.str,
                    x: item.transform[4]
                });
            });
            
            // Sort lines by y-position (top to bottom)
            const sortedYPositions = Object.keys(lines).map(Number).sort((a, b) => b - a);
            
            // Build the final text
            let extractedText = '';
            sortedYPositions.forEach(yPos => {
                // Sort words in a line by x-position (left to right)
                const lineItems = lines[yPos].sort((a, b) => a.x - b.x);
                
                // Join all words in this line
                const lineText = lineItems.map(item => item.text).join(' ');
                extractedText += lineText + '\n';
            });
            
            return extractedText;
        } catch (error) {
            console.error('Error in text extraction:', error);
            return '';
        }
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
                                style={{ paddingLeft: `${item.level * 15 + 10}px` }} // Add indentation based on level
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