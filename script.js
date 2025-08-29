        // Set the PDF.js worker source
        pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';
        
        // DOM elements
        const fileInput = document.getElementById('file-input');
        const selectedFile = document.getElementById('selected-file');
        const formatSelect = document.getElementById('format-select');
        const qualityInput = document.getElementById('quality-input');
        const qualityControl = document.getElementById('quality-control');
        const scaleSelect = document.getElementById('scale-select');
        const convertBtn = document.getElementById('convert-btn');
        const downloadBtn = document.getElementById('download-btn');
        const previewPlaceholder = document.getElementById('preview-placeholder');
        const imagePreview = document.getElementById('image-preview');
        const status = document.getElementById('status');
        const pageControls = document.getElementById('page-controls');
        const prevPageBtn = document.getElementById('prev-page');
        const nextPageBtn = document.getElementById('next-page');
        const pageInfo = document.getElementById('page-info');
        
        // State variables
        let currentPdf = null;
        let currentPage = 1;
        let totalPages = 0;
        let convertedImages = [];
        
        // Event listeners
        fileInput.addEventListener('change', handleFileSelect);
        formatSelect.addEventListener('change', toggleQualityControl);
        convertBtn.addEventListener('click', convertPdfToImage);
        downloadBtn.addEventListener('click', downloadImage);
        prevPageBtn.addEventListener('click', showPrevPage);
        nextPageBtn.addEventListener('click', showNextPage);
        
        // Initialize
        toggleQualityControl();
        
        // Functions
        function handleFileSelect(event) {
            const file = event.target.files[0];
            if (file && file.type === 'application/pdf') {
                selectedFile.textContent = `Selected: ${file.name}`;
                status.textContent = 'File selected. Click "Convert to Image" to proceed.';
                convertBtn.disabled = false;
                
                // Load the PDF for page information
                const fileReader = new FileReader();
                fileReader.onload = function() {
                    const typedarray = new Uint8Array(this.result);
                    
                    pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                        currentPdf = pdf;
                        totalPages = pdf.numPages;
                        currentPage = 1;
                        
                        if (totalPages > 1) {
                            pageInfo.textContent = `Page 1 of ${totalPages}`;
                            pageControls.classList.remove('hidden');
                        } else {
                            pageControls.classList.add('hidden');
                        }
                    }).catch(error => {
                        status.textContent = `Error loading PDF: ${error.message}`;
                    });
                };
                fileReader.readAsArrayBuffer(file);
            } else {
                selectedFile.textContent = 'No file selected';
                status.textContent = 'Please select a valid PDF file.';
                convertBtn.disabled = true;
                downloadBtn.disabled = true;
            }
        }
        
        function toggleQualityControl() {
            if (formatSelect.value === 'image/jpeg') {
                qualityControl.classList.remove('hidden');
            } else {
                qualityControl.classList.add('hidden');
            }
        }
        
        function convertPdfToImage() {
            if (!fileInput.files[0]) {
                status.textContent = 'Please select a PDF file first.';
                return;
            }
            
            status.textContent = 'Converting...';
            convertBtn.disabled = true;
            
            const file = fileInput.files[0];
            const format = formatSelect.value;
            const quality = format === 'image/jpeg' ? parseFloat(qualityInput.value) : 1;
            const scale = parseFloat(scaleSelect.value);
            
            const fileReader = new FileReader();
            fileReader.onload = function() {
                const typedarray = new Uint8Array(this.result);
                
                pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                    totalPages = pdf.numPages;
                    convertedImages = [];
                    
                    // Convert all pages
                    const convertPage = (pageNum) => {
                        if (pageNum > totalPages) {
                            // All pages converted
                            status.textContent = `Conversion complete! Converted ${totalPages} page(s).`;
                            convertBtn.disabled = false;
                            downloadBtn.disabled = false;
                            showPage(1);
                            return;
                        }
                        
                        status.textContent = `Converting page ${pageNum} of ${totalPages}...`;
                        
                        pdf.getPage(pageNum).then(page => {
                            const viewport = page.getViewport({ scale: scale });
                            
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
                            
                            const renderContext = {
                                canvasContext: context,
                                viewport: viewport
                            };
                            
                            page.render(renderContext).promise.then(() => {
                                const imageData = canvas.toDataURL(format, quality);
                                convertedImages.push(imageData);
                                
                                // Convert next page
                                convertPage(pageNum + 1);
                            });
                        });
                    };
                    
                    // Start conversion from first page
                    convertPage(1);
                }).catch(error => {
                    status.textContent = `Error: ${error.message}`;
                    convertBtn.disabled = false;
                });
            };
            
            fileReader.readAsArrayBuffer(file);
        }
        
        function showPage(pageNum) {
            if (convertedImages.length === 0 || pageNum < 1 || pageNum > convertedImages.length) {
                return;
            }
            
            currentPage = pageNum;
            previewPlaceholder.classList.add('hidden');
            imagePreview.classList.remove('hidden');
            imagePreview.src = convertedImages[pageNum - 1];
            
            pageInfo.textContent = `Page ${pageNum} of ${convertedImages.length}`;
            
            prevPageBtn.disabled = (pageNum === 1);
            nextPageBtn.disabled = (pageNum === convertedImages.length);
            
            if (convertedImages.length > 1) {
                pageControls.classList.remove('hidden');
            }
        }
        
        function showPrevPage() {
            if (currentPage > 1) {
                showPage(currentPage - 1);
            }
        }
        
        function showNextPage() {
            if (currentPage < convertedImages.length) {
                showPage(currentPage + 1);
            }
        }
        
        function downloadImage() {
            if (convertedImages.length === 0) {
                return;
            }
            
            const format = formatSelect.value;
            const extension = format === 'image/jpeg' ? 'jpg' : 'png';
            const currentImage = convertedImages[currentPage - 1];
            
            const link = document.createElement('a');
            link.href = currentImage;
            link.download = `converted-page-${currentPage}.${extension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
