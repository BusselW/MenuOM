// Only declare DOC_VIEW_MODES if it doesn't already exist
if (typeof DOC_VIEW_MODES === 'undefined') {
    window.DOC_VIEW_MODES = {
        COMBINED: 'combined',
        DOCUMENTS_ONLY: 'documents_only',
        FOLDERS_ONLY: 'folders_only'
    };
}

// Global variables to store the current state
let currentDocuments = []; // Store all documents for filtering/sorting
let currentFolder = ""; // Current folder path
let currentSearchTerm = ""; // Current search term
let currentViewMode = DOC_VIEW_MODES.COMBINED; // Current view mode
let currentSortMode = "modified_desc"; // Current sort mode

// Initialize document library component
function initDocumentLibrary() {
    if (!CONFIG.documents || !CONFIG.documents.enabled || !CONFIG.documents.listGuid) {
        if (CONFIG.debug && CONFIG.debug.enabled) {
            console.log("Document library component not configured or disabled");
        }
        return;
    }
    
    const documentContainer = document.querySelector(CONFIG.documents.container);
    if (!documentContainer) {
        console.error("Document container not found:", CONFIG.documents.container);
        return;
    }
    
    if (CONFIG.debug && CONFIG.debug.enabled) {
        console.log("Initializing document library with GUID:", CONFIG.documents.listGuid);
        console.log("Using container:", CONFIG.documents.container);
    }
    
    // Set initial view mode from config
    if (CONFIG.documents.viewMode) {
        currentViewMode = CONFIG.documents.viewMode;
        const viewModeSelect = document.getElementById('doc-view-mode');
        if (viewModeSelect) {
            viewModeSelect.value = currentViewMode;
        }
    }
    
    // Set initial sort mode from config
    if (CONFIG.documents.defaultSort) {
        const { field, ascending } = CONFIG.documents.defaultSort;
        currentSortMode = `${field.toLowerCase()}_${ascending ? 'asc' : 'desc'}`;
        const sortModeSelect = document.getElementById('doc-sort-mode');
        if (sortModeSelect) {
            sortModeSelect.value = currentSortMode;
        }
    }
    
    // Remove hidden class to show container
    documentContainer.classList.remove('hidden');
    
    // Apply modern styling
    documentContainer.classList.add('bg-white', 'rounded-lg', 'shadow-md', 'p-4');
    
    // Update title
    const docTitle = document.getElementById('document-title');
    if (docTitle && CONFIG.documents.title) {
        docTitle.textContent = CONFIG.documents.title;
        docTitle.classList.add('font-medium', 'text-lg', 'mb-2');
    }
    
    // Style the header
    const docHeader = document.querySelector('.document-header');
    if (docHeader) {
        docHeader.classList.add('flex', 'justify-between', 'items-center', 'mb-4');
        docHeader.style.borderBottom = '1px solid rgba(0, 0, 0, 0.1)';
        docHeader.style.paddingBottom = '8px';
    }
    
    // Style add document button if enabled
    const addDocBtn = document.getElementById('add-document-btn');
    if (addDocBtn && CONFIG.documents.addDocumentUrl) {
        addDocBtn.classList.remove('hidden');
        addDocBtn.classList.add('flex', 'items-center', 'text-sm', 'bg-gray-100', 'px-3', 'py-1', 'rounded', 'hover:bg-gray-200', 'transition-colors');
        addDocBtn.addEventListener('click', function() {
            window.open(CONFIG.documents.addDocumentUrl, '_blank');
        });
    }
    
    // Set up search and filter listeners
    setupSearchAndFilters();
    
    // Fetch documents
    fetchDocuments();
    
    if (CONFIG.debug && CONFIG.debug.enabled) {
        console.log("Document library component initialized with modern styling");
    }
}

// Set up search and filtering functionality
function setupSearchAndFilters() {
    // Search input
    const searchInput = document.getElementById('doc-search-input');
    const searchClear = document.getElementById('doc-search-clear');
    
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            currentSearchTerm = e.target.value.trim().toLowerCase();
            if (currentSearchTerm) {
                searchClear.classList.remove('hidden');
            } else {
                searchClear.classList.add('hidden');
            }
            filterAndDisplayDocuments();
        });
    }
    
    if (searchClear) {
        searchClear.addEventListener('click', function() {
            searchInput.value = '';
            currentSearchTerm = '';
            searchClear.classList.add('hidden');
            filterAndDisplayDocuments();
        });
    }
    
    // View mode selector
    const viewModeSelect = document.getElementById('doc-view-mode');
    if (viewModeSelect) {
        viewModeSelect.addEventListener('change', function(e) {
            currentViewMode = e.target.value;
            filterAndDisplayDocuments();
        });
    }
    
    // Sort mode selector
    const sortModeSelect = document.getElementById('doc-sort-mode');
    if (sortModeSelect) {
        sortModeSelect.addEventListener('change', function(e) {
            currentSortMode = e.target.value;
            filterAndDisplayDocuments();
        });
    }
}

// Function to filter and display documents based on current criteria
function filterAndDisplayDocuments() {
    if (!currentDocuments || !currentDocuments.length) return;
    
    // First filter by view mode
    let filteredDocs = currentDocuments.filter(doc => {
        const isFolder = doc.FSObjType === 1;
        
        switch (currentViewMode) {
            case DOC_VIEW_MODES.DOCUMENTS_ONLY:
                return !isFolder;
            case DOC_VIEW_MODES.FOLDERS_ONLY:
                // This is a bit tricky - we want to show documents only in folders
                // For now, just return folders
                return isFolder;
            case DOC_VIEW_MODES.COMBINED:
            default:
                return true;
        }
    });
    
    // Then filter by search term
    if (currentSearchTerm) {
        filteredDocs = filteredDocs.filter(doc => {
            const fileName = doc.FileLeafRef || (doc.File ? doc.File.Name : "");
            const fileTitle = doc.Title || "";
            
            return fileName.toLowerCase().includes(currentSearchTerm) || 
                   fileTitle.toLowerCase().includes(currentSearchTerm);
        });
    }
    
    // Apply sorting
    const [sortField, sortDirection] = currentSortMode.split('_');
    const sortAscending = sortDirection === 'asc';
    
    filteredDocs.sort((a, b) => {
        let valueA, valueB;
        
        // Extract values based on sort field
        switch (sortField) {
            case 'name':
                valueA = (a.FileLeafRef || (a.File ? a.File.Name : "")).toLowerCase();
                valueB = (b.FileLeafRef || (b.File ? b.File.Name : "")).toLowerCase();
                break;
            case 'modified':
                valueA = new Date(a.Modified || (a.File ? a.File.TimeLastModified : 0)).getTime();
                valueB = new Date(b.Modified || (b.File ? b.File.TimeLastModified : 0)).getTime();
                break;
            case 'type':
                const fileExtA = (a.FileLeafRef || "").split('.').pop().toLowerCase();
                const fileExtB = (b.FileLeafRef || "").split('.').pop().toLowerCase();
                valueA = a.FSObjType === 1 ? "folder" : fileExtA || "";
                valueB = b.FSObjType === 1 ? "folder" : fileExtB || "";
                break;
            default:
                valueA = a.Modified;
                valueB = b.Modified;
        }
        
        // Compare values in the appropriate direction
        if (sortAscending) {
            return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        } else {
            return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
        }
    });
    
    // Render the filtered and sorted documents
    renderDocuments(filteredDocs, currentFolder);
}

// Function to fetch documents from SharePoint
function fetchDocuments(folderPath = "") {
    if (!CONFIG.documents || !CONFIG.documents.enabled || !CONFIG.documents.listGuid) {
        console.error("Document library configuration is incomplete");
        return;
    }
    
    // Store current folder
    currentFolder = folderPath;
    
    // Get base URL, handling various sources to ensure robustness
    let baseUrl;
    try {
        // First try the SharePoint context
        baseUrl = _spPageContextInfo.webAbsoluteUrl;
    } catch (e) {
        // Fall back to configured URL
        baseUrl = CONFIG.site && CONFIG.site.root ? CONFIG.site.root : "";
        const sitePath = CONFIG.documents.baseUrl || "";
        
        // Handle trailing slash to avoid double slashes
        if (baseUrl.endsWith('/') && sitePath.startsWith('/')) {
            baseUrl = baseUrl + sitePath.substring(1);
        } else if (!baseUrl.endsWith('/') && !sitePath.startsWith('/')) {
            baseUrl = baseUrl + '/' + sitePath;
        } else {
            baseUrl = baseUrl + sitePath;
        }
    }
    
    // Remove trailing slash if present to prevent double slashes in API URL
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }
    
    if (CONFIG.debug && CONFIG.debug.enabled) {
        console.log("Base URL for document API calls:", baseUrl);
        console.log("Document library GUID:", CONFIG.documents.listGuid);
    }
    
    // Build API URL for document library
    let apiUrl = `${baseUrl}/_api/web/lists(guid'${CONFIG.documents.listGuid}')/items`;
    
    // Add folder filtering if specified
    if (folderPath) {
        apiUrl += `?$filter=FileDirRef eq '${encodeURIComponent(folderPath)}'`;
    }
    
    // Add sorting
    apiUrl += apiUrl.includes('?') ? '&' : '?';
    apiUrl += `$orderby=Modified desc`;
    
    // Add selection fields for efficiency
    apiUrl += `&$select=Id,Title,FileLeafRef,FileRef,Editor/Title,Modified,FSObjType,FileSizeDisplay,File/ServerRelativeUrl,File/Name,File/TimeLastModified`;
    apiUrl += `&$expand=Editor,File`;
    
    // Increase item limit to get all documents
    apiUrl += `&$top=5000`;
    
    // Use a simpler test URL first to check connectivity
    let testUrl = `${baseUrl}/_api/web/lists(guid'${CONFIG.documents.listGuid}')/items?$top=1`;
    
    if (CONFIG.debug && CONFIG.debug.enabled) {
        console.log("Testing API connectivity with URL:", testUrl);
    }

    // Show loading indicator
    const docsContainer = document.getElementById('document-list');
    if (docsContainer) {
        docsContainer.innerHTML = `
            <div class="col-span-full text-center py-4">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                <div class="mt-2">Documenten laden...</div>
            </div>
        `;
    }

    // First check if we can access the list
    fetch(testUrl, {
        method: 'GET',
        headers: {
            'Accept': 'application/json;odata=verbose',
            'Content-Type': 'application/json;odata=verbose'
        },
        credentials: 'same-origin' // Include credentials for SharePoint authentication
    })
    .then(response => {
        if (CONFIG.debug && CONFIG.debug.enabled) {
            console.log("Test API response status:", response.status, response.statusText);
        }
        
        if (!response.ok) {
            return response.text().then(text => {
                let errorMessage = "API Error: " + response.status + " " + response.statusText;
                try {
                    // Try to parse the error as JSON for better diagnostics
                    const errorJson = JSON.parse(text);
                    if (errorJson.error && errorJson.error.message) {
                        errorMessage += " - " + errorJson.error.message.value;
                    }
                } catch (e) {
                    // If not JSON, just use the text
                    errorMessage += " - " + text.substring(0, 200);
                }
                console.error("Error response text:", text.substring(0, 500) + "...");
                throw new Error(errorMessage);
            });
        }
        return response.json();
    })
    .then(data => {
        if (CONFIG.debug && CONFIG.debug.enabled) {
            console.log("Test API call successful, proceeding with main API call");
            console.log("Full API URL:", apiUrl);
        }
        
        // Now fetch the actual documents
        return fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json;odata=verbose',
                'Content-Type': 'application/json;odata=verbose'
            },
            credentials: 'same-origin' // Include credentials for SharePoint authentication
        });
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                console.error("Error response text:", text.substring(0, 500) + "...");
                throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
            });
        }
        return response.json();
    })
    .then(data => {
        const documents = data.d.results;
        if (CONFIG.debug && CONFIG.debug.enabled) {
            console.log("Retrieved documents:", documents.length);
        }
        
        // Store documents for filtering
        currentDocuments = documents;
        
        // Apply current filters and sort
        filterAndDisplayDocuments();
    })
    .catch(error => {
        console.error('Error fetching documents:', error);
        console.error('Document library GUID used:', CONFIG.documents.listGuid);
        console.error('Base URL used:', baseUrl);
        
        const docsContainer = document.getElementById('document-list');
        if (docsContainer) {
            docsContainer.innerHTML = `
                <div class="col-span-full p-3 bg-red-50 text-red-600 rounded-md border border-red-200">
                    <div class="font-medium">Fout bij laden van documenten</div>
                    <div class="text-sm">${error.message}</div>
                    <div class="text-xs mt-2">
                        <strong>GUID:</strong> ${CONFIG.documents.listGuid}<br>
                        <strong>URL:</strong> ${baseUrl}
                    </div>
                    <button onclick="location.reload()" class="mt-2 px-2 py-1 bg-red-100 hover:bg-red-200 rounded text-sm">
                        Probeer opnieuw
                    </button>
                </div>
            `;
            
            // Always show the document container even on error
            const documentContainer = document.querySelector(CONFIG.documents.container);
            if (documentContainer && documentContainer.classList.contains('hidden')) {
                documentContainer.classList.remove('hidden');
            }
        }
    });
}

// Function to render documents with modern styling as cards
function renderDocumentsAsCards(documents, currentFolder = "") {
    const docsContainer = document.getElementById('document-list');
    if (!docsContainer) return;
    
    // Clear current content
    docsContainer.innerHTML = '';
    docsContainer.className = 'document-list grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3';
    
    // Get theme color for styling
    const theme = CONFIG.branding && CONFIG.branding.theme ? CONFIG.branding.theme : "blue";
    
    // Show breadcrumb if we're in a folder
    const breadcrumbContainer = document.getElementById('document-breadcrumb');
    if (breadcrumbContainer) {
        if (currentFolder) {
            breadcrumbContainer.classList.remove('hidden');
            renderBreadcrumb(breadcrumbContainer, currentFolder);
        } else {
            breadcrumbContainer.classList.add('hidden');
        }
    }
    
    // If no documents found
    if (!documents || documents.length === 0) {
        docsContainer.innerHTML = `
            <div class="col-span-full p-3 bg-gray-50 text-gray-500 rounded-md border border-gray-200 text-center">
                Geen documenten gevonden
            </div>
        `;
        return;
    }
    
    // Create document cards with modern design
    documents.forEach(doc => {
        // Determine document type and color based on file extension
        const fileName = doc.FileLeafRef || (doc.File ? doc.File.Name : "Unknown");
        const fileExt = fileName.split('.').pop().toLowerCase();
        const fileUrl = doc.FileRef || (doc.File ? doc.File.ServerRelativeUrl : "#");
        const modified = new Date(doc.Modified || (doc.File ? doc.File.TimeLastModified : new Date()));
        const editor = doc.Editor ? doc.Editor.Title : "Unknown";
        
        // Pastel colors for different file types
        const fileTypeColors = {
            pdf: { bg: 'bg-red-50', border: 'border-red-200', icon: 'picture_as_pdf', color: 'text-red-500' },
            doc: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'description', color: 'text-blue-500' },
            docx: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'description', color: 'text-blue-500' },
            xls: { bg: 'bg-green-50', border: 'border-green-200', icon: 'table_chart', color: 'text-green-500' },
            xlsx: { bg: 'bg-green-50', border: 'border-green-200', icon: 'table_chart', color: 'text-green-500' },
            ppt: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'slideshow', color: 'text-orange-500' },
            pptx: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'slideshow', color: 'text-orange-500' },
            txt: { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'text_snippet', color: 'text-gray-500' },
            jpg: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'image', color: 'text-purple-500' },
            jpeg: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'image', color: 'text-purple-500' },
            png: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'image', color: 'text-purple-500' },
            gif: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'image', color: 'text-purple-500' },
            zip: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'folder_zip', color: 'text-yellow-600' },
            folder: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'folder', color: 'text-amber-500' }
        };
        
        // Check if this is a folder
        const isFolder = doc.FSObjType === 1;
        
        // Default style if file type not in our map
        let fileStyle = fileTypeColors[fileExt] || { 
            bg: `bg-${theme}-50`, 
            border: `border-${theme}-200`, 
            icon: 'insert_drive_file', 
            color: `text-${theme}-500` 
        };
        
        // Override style for folders
        if (isFolder) {
            fileStyle = fileTypeColors.folder;
        }
        
        // Create document card
        const card = document.createElement('div');
        card.className = `document-card ${fileStyle.bg} border ${fileStyle.border} rounded-lg p-3 flex flex-col transition-all hover:shadow-md`;
        card.style.cursor = 'pointer'; // Add pointer cursor to indicate clickable
        
        // Format date to Dutch locale
        let formattedDate;
        try {
            formattedDate = modified.toLocaleDateString('nl-NL', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        } catch (e) {
            formattedDate = "Onbekende datum";
        }
        
        card.innerHTML = `
            <div class="flex items-start mb-2">
                <span class="material-icons ${fileStyle.color} text-2xl mr-2">${fileStyle.icon}</span>
                <div class="flex-grow min-w-0">
                    <div class="font-medium text-gray-800 truncate" title="${fileName}">${fileName}</div>
                    <div class="text-xs text-gray-500">
                        ${formattedDate} • ${editor}
                    </div>
                </div>
            </div>
            <div class="mt-auto pt-2 border-t border-gray-100 flex justify-between items-center">
                <span class="text-xs text-gray-400">${isFolder ? 'MAP' : fileExt.toUpperCase()}</span>
                <button class="view-doc-btn p-1 rounded-full hover:bg-white">
                    <span class="material-icons text-sm ${fileStyle.color}">
                        ${isFolder ? 'folder_open' : 'open_in_new'}
                    </span>
                </button>
            </div>
        `;
        
        // Add click handler
        card.addEventListener('click', (e) => {
            if (isFolder) {
                // If it's a folder, navigate into it
                if (CONFIG.debug && CONFIG.debug.enabled) {
                    console.log("Navigating to folder:", doc.FileRef);
                }
                fetchDocuments(doc.FileRef);
            } else {
                // If it's a file, open it
                if (CONFIG.debug && CONFIG.debug.enabled) {
                    console.log("Opening file:", fileUrl);
                }
                window.open(fileUrl, '_blank');
            }
        });
        
        docsContainer.appendChild(card);
    });
}

// Function to render documents as rows (list view)
function renderDocumentsAsRows(documents, currentFolder = "") {
    const docsContainer = document.getElementById('document-list');
    if (!docsContainer) return;
    
    // Clear current content
    docsContainer.innerHTML = '';
    docsContainer.className = 'document-list w-full';
    
    // Get theme color for styling
    const theme = CONFIG.branding && CONFIG.branding.theme ? CONFIG.branding.theme : "blue";
    
    // Show breadcrumb if we're in a folder
    const breadcrumbContainer = document.getElementById('document-breadcrumb');
    if (breadcrumbContainer) {
        if (currentFolder) {
            breadcrumbContainer.classList.remove('hidden');
            renderBreadcrumb(breadcrumbContainer, currentFolder);
        } else {
            breadcrumbContainer.classList.add('hidden');
        }
    }
    
    // If no documents found
    if (!documents || documents.length === 0) {
        docsContainer.innerHTML = `
            <div class="p-3 bg-gray-50 text-gray-500 rounded-md border border-gray-200 text-center">
                Geen documenten gevonden
            </div>
        `;
        return;
    }
    
    // Create table for rows
    const table = document.createElement('table');
    table.className = 'w-full border-collapse';
    
    // Add table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr class="bg-gray-50 border-b border-gray-200">
            <th class="p-2 text-left">Naam</th>
            <th class="p-2 text-left hidden md:table-cell">Gewijzigd op</th>
            <th class="p-2 text-left hidden md:table-cell">Gewijzigd door</th>
            <th class="p-2 text-left w-16">Type</th>
            <th class="p-2 text-center w-16">Actie</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    // Add rows for each document
    documents.forEach(doc => {
        // Determine document type and color based on file extension
        const fileName = doc.FileLeafRef || (doc.File ? doc.File.Name : "Unknown");
        const fileExt = fileName.split('.').pop().toLowerCase();
        const fileUrl = doc.FileRef || (doc.File ? doc.File.ServerRelativeUrl : "#");
        const modified = new Date(doc.Modified || (doc.File ? doc.File.TimeLastModified : new Date()));
        const editor = doc.Editor ? doc.Editor.Title : "Unknown";
        
        // Pastel colors for different file types
        const fileTypeColors = {
            pdf: { bg: 'bg-red-50', border: 'border-red-200', icon: 'picture_as_pdf', color: 'text-red-500' },
            doc: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'description', color: 'text-blue-500' },
            docx: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'description', color: 'text-blue-500' },
            xls: { bg: 'bg-green-50', border: 'border-green-200', icon: 'table_chart', color: 'text-green-500' },
            xlsx: { bg: 'bg-green-50', border: 'border-green-200', icon: 'table_chart', color: 'text-green-500' },
            ppt: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'slideshow', color: 'text-orange-500' },
            pptx: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'slideshow', color: 'text-orange-500' },
            txt: { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'text_snippet', color: 'text-gray-500' },
            jpg: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'image', color: 'text-purple-500' },
            jpeg: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'image', color: 'text-purple-500' },
            png: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'image', color: 'text-purple-500' },
            gif: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'image', color: 'text-purple-500' },
            zip: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'folder_zip', color: 'text-yellow-600' },
            folder: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'folder', color: 'text-amber-500' }
        };
        
        // Check if this is a folder
        const isFolder = doc.FSObjType === 1;
        
        // Default style if file type not in our map
        let fileStyle = fileTypeColors[fileExt] || { 
            bg: `bg-${theme}-50`, 
            border: `border-${theme}-200`, 
            icon: 'insert_drive_file', 
            color: `text-${theme}-500` 
        };
        
        // Override style for folders
        if (isFolder) {
            fileStyle = fileTypeColors.folder;
        }
        
        // Format date to Dutch locale
        let formattedDate;
        try {
            formattedDate = modified.toLocaleDateString('nl-NL', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        } catch (e) {
            formattedDate = "Onbekende datum";
        }
        
        // Create row
        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-100 hover:bg-gray-50 transition-colors';
        tr.style.cursor = 'pointer';
        
        tr.innerHTML = `
            <td class="p-2">
                <div class="flex items-center">
                    <span class="material-icons ${fileStyle.color} text-xl mr-2">${fileStyle.icon}</span>
                    <span class="truncate max-w-xs" title="${fileName}">${fileName}</span>
                </div>
            </td>
            <td class="p-2 hidden md:table-cell">${formattedDate}</td>
            <td class="p-2 hidden md:table-cell">${editor}</td>
            <td class="p-2 uppercase text-xs text-gray-500">
                ${isFolder ? 'Map' : fileExt}
            </td>
            <td class="p-2 text-center">
                <button class="p-1 rounded-full hover:bg-gray-100 ${fileStyle.color}">
                    <span class="material-icons text-sm">
                        ${isFolder ? 'folder_open' : 'open_in_new'}
                    </span>
                </button>
            </td>
        `;
        
        // Add click handler
        tr.addEventListener('click', (e) => {
            // Ignore if clicking on the action button
            if (e.target.closest('button')) return;
            
            if (isFolder) {
                // If it's a folder, navigate into it
                fetchDocuments(doc.FileRef);
            } else {
                // If it's a file, open it
                window.open(fileUrl, '_blank');
            }
        });
        
        // Add button click handler
        const button = tr.querySelector('button');
        if (button) {
            button.addEventListener('click', () => {
                if (isFolder) {
                    fetchDocuments(doc.FileRef);
                } else {
                    window.open(fileUrl, '_blank');
                }
            });
        }
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    docsContainer.appendChild(table);
}

// Main render function that decides which view to use
function renderDocuments(documents, currentFolder = "") {
    // Default to card view, but you can change this based on a config setting or user preference
    const viewStyle = CONFIG.documents.viewStyle || 'rows'; // 'cards' or 'rows'
    
    if (viewStyle === 'cards') {
        renderDocumentsAsCards(documents, currentFolder);
    } else {
        renderDocumentsAsRows(documents, currentFolder);
    }
}

// Helper function to render breadcrumb navigation
function renderBreadcrumb(container, folderPath) {
    if (!container) return;
    
    // Clear current breadcrumb
    container.innerHTML = '';
    
    // Extract folder parts from path
    const parts = folderPath.split('/').filter(part => part);
    const rootLabel = 'Home';
    
    if (CONFIG.debug && CONFIG.debug.enabled) {
        console.log("Rendering breadcrumb for path:", folderPath);
        console.log("Path parts:", parts);
    }
    
    // Add root link
    const rootItem = document.createElement('span');
    rootItem.className = 'breadcrumb-item text-sm flex items-center';
    rootItem.innerHTML = `
        <span class="material-icons text-sm mr-1">home</span>
        <span>${rootLabel}</span>
    `;
    rootItem.style.cursor = 'pointer';
    rootItem.addEventListener('click', () => fetchDocuments(''));
    container.appendChild(rootItem);
    
    // Add separator
    container.appendChild(createBreadcrumbSeparator());
    
    // Add folder path items
    let currentPath = '';
    parts.forEach((part, index) => {
        currentPath += '/' + part;
        
        // If it's the last item, don't make it clickable
        if (index === parts.length - 1) {
            const lastItem = document.createElement('span');
            lastItem.className = 'breadcrumb-item text-sm font-medium';
            lastItem.textContent = part;
            container.appendChild(lastItem);
        } else {
            const pathItem = document.createElement('span');
            pathItem.className = 'breadcrumb-item text-sm';
            pathItem.textContent = part;
            pathItem.style.cursor = 'pointer';
            
            // Build path for navigation
            const navPath = parts.slice(0, index + 1).join('/');
            pathItem.addEventListener('click', () => fetchDocuments(navPath));
            container.appendChild(pathItem);
            
            // Add separator
            container.appendChild(createBreadcrumbSeparator());
        }
    });
}

// Helper to create breadcrumb separator
function createBreadcrumbSeparator() {
    const separator = document.createElement('span');
    separator.className = 'mx-2 text-gray-400';
    separator.innerHTML = `<span class="material-icons text-sm">chevron_right</span>`;
    return separator;
}

// Toggle view style between cards and rows
function toggleViewStyle() {
    if (CONFIG.documents.viewStyle === 'cards') {
        CONFIG.documents.viewStyle = 'rows';
    } else {
        CONFIG.documents.viewStyle = 'cards';
    }
    
    // Re-render with current documents
    if (currentDocuments && currentDocuments.length) {
        renderDocuments(currentDocuments, currentFolder);
    }
}

// Ensure initialization happens when the page loads
document.addEventListener('DOMContentLoaded', function() {
    if (CONFIG && CONFIG.documents && CONFIG.documents.enabled) {
        console.log("Auto-initializing document library component");
        initDocumentLibrary();
    }
});