// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function() {
    if (CONFIG.debug.enabled) {
        console.log("DOM loaded, initializing navigation system");
    }
    
    // Apply header theme and title
    setupHeader();
    
    // Initialize navigation
    initNavigation();
    
    // Initialize calendar if enabled
    if (CONFIG.calendar.enabled) {
        initCalendar();
    }
});

// Setup the header based on theme configuration
function setupHeader() {
    const header = document.getElementById('page-header');
    const headerTitle = document.getElementById('header-title');
    const theme = CONFIG.branding.theme || "orange";
    
    // Apply custom header text if specified
    if (CONFIG.branding.customHeader) {
        headerTitle.textContent = CONFIG.branding.customHeader;
    }
    
    // Apply dynamic theme to header
    if (CONFIG.branding.applyToHeader) {
        header.style.background = `linear-gradient(90deg, var(--color-header-start), var(--color-header-end))`;
    }
    
    if (CONFIG.debug.enabled) {
        console.log("Header setup complete");
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
                        console.log(`User permission check: ${hasPermission}`);
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
            editBtn.title = 'Edit Navigation';
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
                window.open(editorUrl, '_blank');
            };
            headerActions.appendChild(editBtn);
            
            if (CONFIG.debug.enabled) {
                console.log("Edit button added to header");
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

// Initialize navigation system
function initNavigation() {
    const menuContainer = document.querySelector(CONFIG.navigation.container);
    try {
        if (window.self !== window.top) {
            document.body.classList.add('iframe-mode');
            CONFIG.navigation.forceClickBehavior = true;
            console.log("Detected iframe environment - forcing click behavior");
        }
    } catch (e) {
        document.body.classList.add('iframe-mode');
        CONFIG.navigation.forceClickBehavior = true;
        console.log("Detected iframe environment (access error) - forcing click behavior");
    }
    if (!menuContainer) {
        console.error("Menu container not found:", CONFIG.navigation.container);
        return;
    }
    menuContainer.style.display = "block";
    menuContainer.style.visibility = "visible";
    menuContainer.style.opacity = "1";

    setupEditButton();

    const siteUrl = detectSiteUrl();
    const apiUrl = `${siteUrl}/_api/web/lists(guid'${CONFIG.navigation.listGuid}')/items?$orderby=VolgordeID asc`;
    if (CONFIG.debug.enabled) {
        console.log("Detected site URL:", siteUrl);
        console.log("Menu API URL:", apiUrl);
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
            console.log("Fetched menu items:", items.length);
        }
        renderMenuItems(items);
    })
    .catch(err => {
        console.error("Error fetching menu data:", err);
        const menu = document.querySelector(CONFIG.navigation.container);
        if (menu) {
            menu.innerHTML = `
            <li style="color: red; list-style: none;">
                Error loading menu: ${err.message}
                <button onclick="location.reload()">Retry</button>
            </li>
            `;
        }
        setTimeout(() => {
            setupFallbackNavigation();
        }, 3000);
    });
}

// Fallback navigation
function setupFallbackNavigation() {
    if (CONFIG.debug.enabled) {
        console.log("Setting up fallback navigation");
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
            children: []
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

// Build hierarchical menu
function buildMenu(items) {
    const menuMap = {};
    items.forEach(item => {
        menuMap[item.Id] = {...item, children: []};
    });
    const rootItems = [];
    items.forEach(item => {
        if (item.ParentID1) {
            if (menuMap[item.ParentID1]) {
                menuMap[item.ParentID1].children.push(menuMap[item.Id]);
            } else {
                console.warn(`Parent item ${item.ParentID1} not found for ${item.Title}`);
                rootItems.push(menuMap[item.Id]);
            }
        } else {
            rootItems.push(menuMap[item.Id]);
        }
    });
    rootItems.sort((a, b) => {
        if (a.VolgordeID && b.VolgordeID) return a.VolgordeID - b.VolgordeID;
        return 0;
    });
    return rootItems;
}

// Render menu items
function renderMenuItems(items) {
    const menuContainer = document.querySelector(CONFIG.navigation.container);
    if (!menuContainer) return;
    menuContainer.innerHTML = "";
    const menuItems = buildMenu(items);

    // ... zie renderNav.js (of inline) ...
    // Je kunt hier direct je 'renderItem' logic doen of de 'renderNav.js' aanroepen.
    // In deze codebase roepen we extern 'renderNav.js' aan. Als je de code inline hebt, roep je het direct aan.
    // Voorbeeld:
    menuItems.forEach(item => {
        // call a function like "renderItem(item, menuContainer)" 
        // or a similar approach to build the DOM
    });
}
