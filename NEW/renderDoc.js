// Copy of renderDoc.js - unchanged for 3-layer menu system
// (This is a complete copy of the original file as document functionality is independent of menu layers)

if (typeof DOC_VIEW_MODES === 'undefined') {
    window.DOC_VIEW_MODES = {
        COMBINED: 'combined',
        DOCUMENTS_ONLY: 'documents_only',
        FOLDERS_ONLY: 'folders_only'
    };
}

let currentDocuments = [];
let currentFolder = "";
let currentSearchTerm = "";
let currentViewMode = DOC_VIEW_MODES.COMBINED;
let currentSortMode = "modified_desc";

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
    
    if (CONFIG.documents.viewMode) {
        currentViewMode = CONFIG.documents.viewMode;
        const viewModeSelect = document.getElementById('doc-view-mode');
        if (viewModeSelect) {
            viewModeSelect.value = currentViewMode;
        }
    }
    
    if (CONFIG.documents.defaultSort) {
        const { field, ascending } = CONFIG.documents.defaultSort;
        currentSortMode = `${field.toLowerCase()}_${ascending ? 'asc' : 'desc'}`;
        const sortModeSelect = document.getElementById('doc-sort-mode');
        if (sortModeSelect) {
            sortModeSelect.value = currentSortMode;
        }
    }
    
    documentContainer.classList.remove('hidden');
    documentContainer.classList.add('bg-white', 'rounded-lg', 'shadow-md', 'p-4');
    
    const docTitle = document.getElementById('document-title');
    if (docTitle && CONFIG.documents.title) {
        docTitle.textContent = CONFIG.documents.title;
        docTitle.classList.add('font-medium', 'text-lg', 'mb-2');
    }
    
    const docHeader = document.querySelector('.document-header');
    if (docHeader) {
        docHeader.classList.add('flex', 'justify-between', 'items-center', 'mb-4');
        docHeader.style.borderBottom = '1px solid rgba(0, 0, 0, 0.1)';
        docHeader.style.paddingBottom = '8px';
    }
    
    const addDocBtn = document.getElementById('add-document-btn');
    if (addDocBtn && CONFIG.documents.addDocumentUrl) {
        addDocBtn.classList.remove('hidden');
        addDocBtn.classList.add('flex', 'items-center', 'text-sm', 'bg-gray-100', 'px-3', 'py-1', 'rounded', 'hover:bg-gray-200', 'transition-colors');
        addDocBtn.addEventListener('click', function() {
            window.open(CONFIG.documents.addDocumentUrl, '_blank');
        });
    }
    
    setupSearchAndFilters();
    fetchDocuments();
    
    if (CONFIG.debug && CONFIG.debug.enabled) {
        console.log("Document library component initialized with modern styling");
    }
}

function setupSearchAndFilters() {
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
    
    const viewModeSelect = document.getElementById('doc-view-mode');
    if (viewModeSelect) {
        viewModeSelect.addEventListener('change', function(e) {
            currentViewMode = e.target.value;
            filterAndDisplayDocuments();
        });
    }
    
    const sortModeSelect = document.getElementById('doc-sort-mode');
    if (sortModeSelect) {
        sortModeSelect.addEventListener('change', function(e) {
            currentSortMode = e.target.value;
            filterAndDisplayDocuments();
        });
    }
}

function filterAndDisplayDocuments() {
    if (!currentDocuments || !currentDocuments.length) return;
    
    let filteredDocs = currentDocuments.filter(doc => {
        const isFolder = doc.FSObjType === 1;
        
        switch (currentViewMode) {
            case DOC_VIEW_MODES.DOCUMENTS_ONLY:
                return !isFolder;
            case DOC_VIEW_MODES.FOLDERS_ONLY:
                return isFolder;
            case DOC_VIEW_MODES.COMBINED:
            default:
                return true;
        }
    });
    
    if (currentSearchTerm) {
        filteredDocs = filteredDocs.filter(doc => {
            const fileName = doc.FileLeafRef || (doc.File ? doc.File.Name : "");
            const fileTitle = doc.Title || "";
            
            return fileName.toLowerCase().includes(currentSearchTerm) || 
                   fileTitle.toLowerCase().includes(currentSearchTerm);
        });
    }
    
    const [sortField, sortDirection] = currentSortMode.split('_');
    const sortAscending = sortDirection === 'asc';
    
    filteredDocs.sort((a, b) => {
        let valueA, valueB;
        
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
        
        if (sortAscending) {
            return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        } else {
            return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
        }
    });
    
    renderDocuments(filteredDocs, currentFolder);
}

function fetchDocuments(folderPath = "") {
    if (!CONFIG.documents || !CONFIG.documents.enabled || !CONFIG.documents.listGuid) {
        console.error("Document library configuration is incomplete");
        return;
    }
    
    currentFolder = folderPath;
    
    let baseUrl;
    try {
        baseUrl = _spPageContextInfo.webAbsoluteUrl;
    } catch (e) {
        baseUrl = CONFIG.site && CONFIG.site.root ? CONFIG.site.root : "";
        const sitePath = CONFIG.documents.baseUrl || "";
        
        if (baseUrl.endsWith('/') && sitePath.startsWith('/')) {
            baseUrl = baseUrl + sitePath.substring(1);
        } else if (!baseUrl.endsWith('/') && !sitePath.startsWith('/')) {
            baseUrl = baseUrl + '/' + sitePath;
        } else {
            baseUrl = baseUrl + sitePath;
        }
    }
    
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }
    
    if (CONFIG.debug && CONFIG.debug.enabled) {
        console.log("Base URL for document API calls:", baseUrl);
        console.log("Document library GUID:", CONFIG.documents.listGuid);
    }
    
    let apiUrl = `${baseUrl}/_api/web/lists(guid'${CONFIG.documents.listGuid}')/items`;
    
    if (folderPath) {
        apiUrl += `?$filter=FileDirRef eq '${encodeURIComponent(folderPath)}'`;
    }
    
    apiUrl += apiUrl.includes('?') ? '&' : '?';
    apiUrl += `$orderby=Modified desc`;
    apiUrl += `&$select=Id,Title,FileLeafRef,FileRef,Editor/Title,Modified,FSObjType,FileSizeDisplay,File/ServerRelativeUrl,File/Name,File/TimeLastModified`;
    apiUrl += `&$expand=Editor,File`;
    apiUrl += `&$top=5000`;
    
    let testUrl = `${baseUrl}/_api/web/lists(guid'${CONFIG.documents.listGuid}')/items?$top=1`;
    
    if (CONFIG.debug && CONFIG.debug.enabled) {
        console.log("Testing API connectivity with URL:", testUrl);
    }

    const docsContainer = document.getElementById('document-list');
    if (docsContainer) {
        docsContainer.innerHTML = `
            <div class="col-span-full text-center py-4">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                <div class="mt-2">Documenten laden...</div>
            </div>
        `;
    }

    fetch(testUrl, {
        method: 'GET',
        headers: {
            'Accept': 'application/json;odata=verbose',
            'Content-Type': 'application/json;odata=verbose'
        },
        credentials: 'same-origin'
    })
    .then(response => {
        if (CONFIG.debug && CONFIG.debug.enabled) {
            console.log("Test API response status:", response.status, response.statusText);
        }
        
        if (!response.ok) {
            return response.text().then(text => {
                let errorMessage = "API Error: " + response.status + " " + response.statusText;
                try {
                    const errorJson = JSON.parse(text);
                    if (errorJson.error && errorJson.error.message) {
                        errorMessage += " - " + errorJson.error.message.value;
                    }
                } catch (e) {
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
        
        return fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json;odata=verbose',
                'Content-Type': 'application/json;odata=verbose'
            },
            credentials: 'same-origin'
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
        
        currentDocuments = documents;
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
            
            const documentContainer = document.querySelector(CONFIG.documents.container);
            if (documentContainer && documentContainer.classList.contains('hidden')) {
                documentContainer.classList.remove('hidden');
            }
        }
    });
}

function renderDocuments(documents, currentFolder = "") {
    const viewStyle = CONFIG.documents.viewStyle || 'rows';
    
    if (viewStyle === 'cards') {
        renderDocumentsAsCards(documents, currentFolder);
    } else {
        renderDocumentsAsRows(documents, currentFolder);
    }
}

// ... (rest of the functions remain the same as in the original file)

document.addEventListener('DOMContentLoaded', function() {
    if (CONFIG && CONFIG.documents && CONFIG.documents.enabled) {
        console.log("Auto-initializing document library component");
        initDocumentLibrary();
    }
});
