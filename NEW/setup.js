// setup.js - Enhanced for 3-Layer Menu System

// Global configuration object - enhanced for 3-layer menu
window.CONFIG = {
    navigation: {
        container: "#menu",
        listGuid: null, // Will be set from data attributes
        forceClickBehavior: false,
        hoverDelay: 250,
        maxDepth: 3, // NEW: Maximum menu depth
        editButton: {
            enabled: true,
            url: "https://som.org.om.local/sites/MulderT/Lists/NavBar/AllItems.aspx",
            allowedRoles: ["1.1. Teamleiders", "1. Sharepoint beheer"],
            showForCurrentUser: false
        },
        disableParentItemLinks: false
    },
    calendar: {
        enabled: true,
        container: "#calendar-container",
        listGuid: null, // Will be set from data attributes
        title: "Planning",
        itemCount: 4,
        showPagination: true,
        addEventUrl: null,
        editEventUrl: null,
        baseUrl: null
    },
    documents: {
        enabled: false, // Can be enabled if needed
        container: "#document-container",
        listGuid: null,
        title: "Documenten",
        viewMode: "combined",
        viewStyle: "rows",
        defaultSort: { field: "Modified", ascending: false }
    },
    branding: {
        theme: "blue",
        customHeader: null,
        applyToHeader: true
    },
    site: {
        root: window.location.origin,
        detectSubsites: true
    },
    debug: {
        enabled: true // Enable for development
    }
};

// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function() {
    if (CONFIG.debug.enabled) {
        console.log("3-Layer Menu System: DOM loaded, initializing navigation system");
    }
    
    // Extract configuration from body data attributes
    extractConfigFromBody();
    
    // Apply header theme and title
    setupHeader();
    
    // Initialize 3-layer navigation
    initNavigation();
    
    // Initialize calendar if enabled
    if (CONFIG.calendar.enabled) {
        initCalendar();
    }
});

// NEW: Extract configuration from body data attributes
function extractConfigFromBody() {
    const body = document.body;
    
    // Extract theme
    const themeClasses = body.className.split(' ').filter(cls => cls.startsWith('theme-'));
    if (themeClasses.length > 0) {
        CONFIG.branding.theme = themeClasses[0].replace('theme-', '');
    }
    
    // Extract data attributes
    CONFIG.navigation.listGuid = body.getAttribute('data-listguid');
    CONFIG.calendar.listGuid = body.getAttribute('data-listguid'); // Same list for now
    CONFIG.calendar.itemCount = parseInt(body.getAttribute('data-page-size')) || 4;
    
    // NEW: Extract max menu depth if specified
    const maxDepth = body.getAttribute('data-max-menu-depth');
    if (maxDepth) {
        CONFIG.navigation.maxDepth = parseInt(maxDepth);
        console.log(`3-Layer Menu: Maximum depth set to ${CONFIG.navigation.maxDepth}`);
    }
    
    // Extract URLs
    const calendarUrl = body.getAttribute('data-calendar-url');
    if (calendarUrl) {
        CONFIG.calendar.baseUrl = calendarUrl.split('/_api/')[0];
    }
    
    const buttonUrl = body.getAttribute('data-button-url');
    if (buttonUrl) {
        CONFIG.navigation.editButton.url = buttonUrl;
    }
    
    const allEventsUrl = body.getAttribute('data-all-events-base-url');
    if (allEventsUrl) {
        CONFIG.calendar.editEventUrl = allEventsUrl;
    }
    
    // Extract allowed groups
    const allowedGroups = body.getAttribute('data-allowed-groups');
    if (allowedGroups) {
        try {
            CONFIG.navigation.editButton.allowedRoles = JSON.parse(allowedGroups);
        } catch (e) {
            console.warn("Could not parse allowed groups:", e);
        }
    }
    
    if (CONFIG.debug.enabled) {
        console.log("3-Layer Menu: Configuration extracted:", CONFIG);
    }
}

// Setup the header based on theme configuration
function setupHeader() {
    const header = document.getElementById('page-header');
    const headerTitle = document.getElementById('header-title');
    const theme = CONFIG.branding.theme || "blue";
    
    if (!header || !headerTitle) {
        console.warn("Header elements not found");
        return;
    }
    
    // Apply custom header text if specified
    if (CONFIG.branding.customHeader) {
        headerTitle.textContent = CONFIG.branding.customHeader;
    }
    
    // Apply dynamic theme to header
    if (CONFIG.branding.applyToHeader) {
        header.style.background = `linear-gradient(90deg, var(--color-header-start), var(--color-header-end))`;
    }
    
    // Set the title color to white for better contrast
    headerTitle.style.color = "white";
    
    if (CONFIG.debug.enabled) {
        console.log(`3-Layer Menu: Header setup complete with theme: ${theme}`);
    }
}

// Function to detect current site URL
function detectSiteUrl() {
    if (!CONFIG.site.detectSubsites) {
        return CONFIG.site.root;
    }
    
    try {
        const fullPath = window.location.pathname;
        const sitesIndex = fullPath.indexOf('/sites/');
        
        if (sitesIndex !== -1) {
            const nonSitePatterns = [
                '/SitePages/', '/Lists/', '/SiteAssets/', 
                '/Shared%20Documents/', '/Forms/', '/_layouts/',
                '/CPW/', '/Documents/'
            ];
            let siteEndIndex = fullPath.length;
            
            for (const pattern of nonSitePatterns) {
                const patternIndex = fullPath.indexOf(pattern, sitesIndex);
                if (patternIndex !== -1 && patternIndex < siteEndIndex) {
                    siteEndIndex = patternIndex;
                }
            }
            
            const sitePath = fullPath.substring(sitesIndex, siteEndIndex);
            return window.location.origin + sitePath;
        }
    } catch (error) {
        console.warn("Site detection failed, using default", error);
    }
    
    return CONFIG.site.root;
}

// Check if user has edit permissions
async function checkUserPermissions() {
    if (CONFIG.navigation.editButton.showForCurrentUser) {
        return true;
    }
    if (!CONFIG.navigation.editButton.enabled) {
        return false;
    }
    
    try {
        if (typeof SP === 'undefined' || typeof SP.ClientContext === 'undefined') {
            console.warn("SharePoint client context not available");
            return false;
        }
        
        const ctx = new SP.ClientContext.get_current();
        const web = ctx.get_web();
        const currentUser = web.get_currentUser();
        ctx.load(currentUser);
        
        // Get user groups
        const userGroups = currentUser.get_groups();
        ctx.load(userGroups);
        
        return new Promise((resolve) => {
            ctx.executeQueryAsync(
                function() {
                    const allowedRoles = CONFIG.navigation.editButton.allowedRoles;
                    let hasPermission = false;
                    
                    const groupEnumerator = userGroups.getEnumerator();
                    while (groupEnumerator.moveNext()) {
                        const group = groupEnumerator.get_current();
                        const groupName = group.get_title();
                        if (allowedRoles.includes(groupName)) {
                            hasPermission = true;
                            break;
                        }
                    }
                    
                    if (CONFIG.debug.enabled) {
                        console.log(`3-Layer Menu: User permission check: ${hasPermission}`);
                    }
                    resolve(hasPermission);
                },
                function(sender, args) {
                    console.error("Error checking permissions: " + args.get_message());
                    resolve(false);
                }
            );
        });
    } catch (error) {
        console.error("Error in permission check:", error);
        return false;
    }
}

// Setup edit button if user has permissions
async function setupEditButton() {
    try {
        if (!CONFIG.navigation.editButton.enabled) {
            return;
        }
        
        const headerActions = document.getElementById('header-actions');
        if (!headerActions) {
            console.error("Header actions container not found");
            return;
        }
        
        const hasPermission = await checkUserPermissions();
        
        if (hasPermission) {
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-nav-btn';
            editBtn.title = 'Edit 3-Layer Navigation';
            editBtn.innerHTML = '<span class="material-icons">edit</span>';
            editBtn.style.cssText = `
                background-color: rgba(255, 255, 255, 0.2);
                border: none;
                border-radius: 50%;
                color: white;
                width: 36px;
                height: 36px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background-color 0.3s;
                margin-left: 8px;
            `;
            
            editBtn.onmouseover = function() {
                this.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            };
            editBtn.onmouseout = function() {
                this.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            };
            editBtn.onclick = function() {
                const siteUrl = detectSiteUrl();
                let editorUrl = CONFIG.navigation.editButton.url;
                if (CONFIG.navigation.listGuid) {
                    editorUrl = appendQueryParam(editorUrl, 'listGuid', CONFIG.navigation.listGuid);
                }
                editorUrl = appendQueryParam(editorUrl, 'siteUrl', encodeURIComponent(siteUrl));
                editorUrl = appendQueryParam(editorUrl, 'maxDepth', CONFIG.navigation.maxDepth);
                window.open(editorUrl, '_blank');
            };
            
            headerActions.appendChild(editBtn);
            
            if (CONFIG.debug.enabled) {
                console.log("3-Layer Menu: Edit button added to header");
            }
        }
    } catch (error) {
        console.error("Error setting up edit button:", error);
    }
}

// Helper function to append query parameters
function appendQueryParam(url, name, value) {
    if (!value) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${name}=${value}`;
}

// Initialize 3-layer navigation system
function initNavigation() {
    const menuContainer = document.querySelector(CONFIG.navigation.container);
    
    // Detect iframe environment
    try {
        if (window.self !== window.top) {
            document.body.classList.add('iframe-mode');
            CONFIG.navigation.forceClickBehavior = true;
            console.log("3-Layer Menu: Detected iframe environment - forcing click behavior");
        }
    } catch (e) {
        document.body.classList.add('iframe-mode');
        CONFIG.navigation.forceClickBehavior = true;
        console.log("3-Layer Menu: Detected iframe environment (access error) - forcing click behavior");
    }
    
    if (!menuContainer) {
        console.error("Menu container not found:", CONFIG.navigation.container);
        return;
    }
    
    // Ensure menu is visible
    menuContainer.style.display = "block";
    menuContainer.style.visibility = "visible";
    menuContainer.style.opacity = "1";

    // Setup edit button
    setupEditButton();

    const siteUrl = detectSiteUrl();
    const apiUrl = `${siteUrl}/_api/web/lists(guid'${CONFIG.navigation.listGuid}')/items?$orderby=VolgordeID asc`;
    
    if (CONFIG.debug.enabled) {
        console.log("3-Layer Menu: Detected site URL:", siteUrl);
        console.log("3-Layer Menu: Menu API URL:", apiUrl);
        console.log("3-Layer Menu: Maximum depth configured:", CONFIG.navigation.maxDepth);
    }
    
    fetch(apiUrl, {
        headers: {
            'Accept': 'application/json;odata=verbose',
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (!data || !data.d || !data.d.results) {
            throw new Error("Invalid data structure for menu items");
        }
        
        const items = data.d.results;
        if (CONFIG.debug.enabled) {
            console.log(`3-Layer Menu: Fetched ${items.length} menu items`);
        }
        
        // Validate menu structure for depth compliance
        validateMenuStructure(items);
        
        // Render the 3-layer menu
        renderMenuItems(items);
    })
    .catch(err => {
        console.error("Error fetching menu data:", err);
        const menu = document.querySelector(CONFIG.navigation.container);
        if (menu) {
            menu.innerHTML = `
            <li style="color: red; list-style: none;">
                Error loading 3-layer menu: ${err.message}
                <button onclick="location.reload()">Retry</button>
            </li>
            `;
        }
        
        // Setup fallback navigation after a delay
        setTimeout(() => {
            setupFallbackNavigation();
        }, 3000);
    });
}

// NEW: Validate menu structure for depth compliance
function validateMenuStructure(items) {
    const menuMap = {};
    items.forEach(item => {
        menuMap[item.Id] = {...item, children: []};
    });
    
    // Build hierarchy
    items.forEach(item => {
        if (item.ParentID1 && menuMap[item.ParentID1]) {
            menuMap[item.ParentID1].children.push(menuMap[item.Id]);
        }
    });
    
    // Check depth recursively
    function checkDepth(item, currentDepth = 1) {
        if (currentDepth > CONFIG.navigation.maxDepth) {
            console.warn(`Menu item "${item.Title}" exceeds maximum depth of ${CONFIG.navigation.maxDepth}`);
            return false;
        }
        
        if (item.children && item.children.length > 0) {
            return item.children.every(child => checkDepth(child, currentDepth + 1));
        }
        
        return true;
    }
    
    // Check all root items
    const rootItems = items.filter(item => !item.ParentID1);
    const validStructure = rootItems.every(item => checkDepth(menuMap[item.Id]));
    
    if (CONFIG.debug.enabled) {
        console.log(`3-Layer Menu: Menu structure validation ${validStructure ? 'passed' : 'failed'}`);
    }
    
    return validStructure;
}

// Fallback navigation for 3-layer menu
function setupFallbackNavigation() {
    if (CONFIG.debug.enabled) {
        console.log("3-Layer Menu: Setting up fallback navigation");
    }
    
    const siteUrl = detectSiteUrl();
    const fallbackItems = [
        {
            Id: 1,
            Title: "Home",
            URL: siteUrl,
            Icon: "home",
            VolgordeID: 1,
            ParentID1: null,
            children: []
        },
        {
            Id: 2,
            Title: "Documents",
            URL: `${siteUrl}/Shared%20Documents`,
            Icon: "description",
            VolgordeID: 2,
            ParentID1: null,
            children: [
                {
                    Id: 21,
                    Title: "Shared Files",
                    URL: `${siteUrl}/Shared%20Documents/Forms/AllItems.aspx`,
                    Icon: "folder_shared",
                    VolgordeID: 1,
                    ParentID1: 2,
                    children: [
                        {
                            Id: 211,
                            Title: "Recent",
                            URL: `${siteUrl}/Shared%20Documents`,
                            Icon: "schedule",
                            VolgordeID: 1,
                            ParentID1: 21,
                            children: []
                        }
                    ]
                }
            ]
        },
        {
            Id: 3,
            Title: "Lists",
            URL: `${siteUrl}/_layouts/15/viewlsts.aspx`,
            Icon: "format_list_bulleted",
            VolgordeID: 3,
            ParentID1: null,
            children: []
        }
    ];
    
    renderMenuItems(fallbackItems);
}
