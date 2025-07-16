// renderNav.js - Enhanced for 3-Layer Menu Support

// 1. Detect iframe environment
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

// 2. Configuration object for menu depth control
const MENU_CONFIG = {
  maxDepth: 3, // Maximum menu depth (1 = main, 2 = sub, 3 = sub-sub)
  forceClickBehavior: false, // Will be set based on iframe detection
  hoverDelay: 250, // Delay for hover behavior in ms
  disableParentItemLinks: false // Whether parent items with children should have working links
};

// Initialize configuration
if (isInIframe) {
  MENU_CONFIG.forceClickBehavior = true;
  console.log("3-Layer Menu: Detected iframe environment - forcing click behavior");
}

// 3. Helper functions
function getItemUrl(item) {
    if (item.URL && typeof item.URL === 'object' && item.URL.Url) {
        return item.URL.Url;
    }
    if (item.URL && typeof item.URL === 'string' && item.URL.trim()) {
        return item.URL.trim();
    }
    if (item.Note && typeof item.Note === 'string' && item.Note.trim()) {
        return item.Note.trim();
    }
    return null;
}

function getMenuDepth(item, depth = 0) {
    if (depth >= MENU_CONFIG.maxDepth) return depth;
    if (item.children && item.children.length > 0) {
        return Math.max(...item.children.map(child => getMenuDepth(child, depth + 1))) + 1;
    }
    return depth + 1;
}

function buildMenu(items) {
    const menuMap = {};
    
    // Create map of all items
    items.forEach(item => {
        menuMap[item.Id] = {...item, children: []};
    });
    
    const rootItems = [];
    
    // Build hierarchy with depth limiting
    items.forEach(item => {
        if (item.ParentID1) {
            const parent = menuMap[item.ParentID1];
            if (parent) {
                // Check depth before adding
                const currentDepth = getMenuDepth(parent, 0);
                if (currentDepth < MENU_CONFIG.maxDepth) {
                    parent.children.push(menuMap[item.Id]);
                } else {
                    console.warn(`Menu item "${item.Title}" exceeds maximum depth of ${MENU_CONFIG.maxDepth} and will be ignored`);
                }
            } else {
                console.warn(`Parent item ${item.ParentID1} not found for ${item.Title}`);
                rootItems.push(menuMap[item.Id]);
            }
        } else {
            rootItems.push(menuMap[item.Id]);
        }
    });
    
    // Sort root items and their children recursively
    function sortItems(items) {
        items.sort((a, b) => {
            if (a.VolgordeID && b.VolgordeID) return a.VolgordeID - b.VolgordeID;
            return 0;
        });
        items.forEach(item => {
            if (item.children && item.children.length > 0) {
                sortItems(item.children);
            }
        });
    }
    
    sortItems(rootItems);
    return rootItems;
}

// 4. Main rendering function
function renderMenuItems(items) {
    const menuContainer = document.querySelector(CONFIG.navigation.container);
    if (!menuContainer) return;
    
    menuContainer.innerHTML = "";
    const menuItems = buildMenu(items);
    
    // Object for hover timeouts - organized by menu ID
    const hoverTimeouts = {};

    function renderItem(item, container, level = 1) {
        // Ensure we don't exceed maximum depth
        if (level > MENU_CONFIG.maxDepth) {
            console.warn(`Skipping menu item "${item.Title}" - exceeds maximum depth of ${MENU_CONFIG.maxDepth}`);
            return;
        }

        const li = document.createElement("li");
        const menuId = `menu-${item.Id || Math.random().toString(36).substr(2, 9)}`;
        
        // Apply appropriate classes based on level
        switch (level) {
            case 1:
                li.className = "nav__item mb-1 relative";
                break;
            case 2:
                li.className = "nav__sub-item relative";
                break;
            case 3:
                li.className = "nav__sub-sub-item relative";
                break;
        }

        li.setAttribute('data-menu-id', menuId);
        li.setAttribute('data-menu-level', level);

        const link = document.createElement("a");
        const theme = CONFIG.branding.theme || "blue";
        
        // Apply appropriate link classes based on level
        switch (level) {
            case 1:
                link.className = `nav__link flex items-center px-4 py-3 rounded-md hover:bg-white shadow-sm transition-all hover:shadow border border-brand-${theme}`;
                break;
            case 2:
                link.className = `nav__sub-link flex items-center pl-6 pr-4 py-2 hover:bg-gray-100 transition-all border border-brand-${theme} mt-1 rounded`;
                break;
            case 3:
                link.className = `nav__sub-sub-link flex items-center pl-8 pr-4 py-1 hover:bg-gray-50 transition-all border border-brand-${theme} mt-1 rounded text-sm`;
                break;
        }
        
        link.textContent = item.Title || "Untitled";

        // Add appropriate icon based on level
        const icon = document.createElement("span");
        let iconSize, iconClass;
        
        switch (level) {
            case 1:
                iconSize = "text-base";
                iconClass = `material-icons mr-3 text-brand-${theme}`;
                break;
            case 2:
                iconSize = "text-sm";
                iconClass = `material-icons mr-2 text-brand-${theme}`;
                break;
            case 3:
                iconSize = "text-xs";
                iconClass = `material-icons mr-2 text-brand-${theme}`;
                break;
        }
        
        icon.className = `${iconClass} ${iconSize}`;
        icon.textContent = getIcon(item.Icon);
        link.prepend(icon);

        const hasChildren = item.children && item.children.length > 0 && level < MENU_CONFIG.maxDepth;
        const itemUrl = getItemUrl(item);
        
        // Set up link behavior
        if (itemUrl) {
            link.href = itemUrl;
            if (isInIframe) {
                if (!hasChildren || !CONFIG.navigation.disableParentItemLinks) {
                    link.target = "_parent";
                    console.log(`Setting link target to _parent for: ${item.Title} (Level ${level})`);
                }
            }
        } else {
            link.href = "#";
            link.style.cursor = "pointer";
        }

        li.appendChild(link);

        // Handle children if they exist and we haven't reached max depth
        if (hasChildren) {
            const dropdownIcon = document.createElement("span");
            dropdownIcon.className = `nav__dropdown-icon nav__dropdown-icon--level-${level} material-icons ml-auto transition-transform duration-10 text-brand-${theme}`;
            
            // Use different icons for different levels
            switch (level) {
                case 1:
                    dropdownIcon.textContent = "expand_more";
                    dropdownIcon.style.fontSize = "16px";
                    break;
                case 2:
                    dropdownIcon.textContent = "keyboard_arrow_right";
                    dropdownIcon.style.fontSize = "14px";
                    break;
                case 3:
                    dropdownIcon.textContent = "fiber_manual_record";
                    dropdownIcon.style.fontSize = "8px";
                    break;
            }
            
            link.appendChild(dropdownIcon);

            const ul = document.createElement("ul");
            
            // Apply appropriate submenu classes based on level
            switch (level) {
                case 1:
                    ul.className = "nav__sub-list overflow-hidden transition-all duration-10 max-h-0 py-0 bg-white opacity-0";
                    break;
                case 2:
                    ul.className = "nav__sub-sub-list overflow-hidden transition-all duration-10 max-h-0 py-0 bg-white opacity-0";
                    break;
            }
            
            ul.style.maxHeight = "0";
            ul.style.opacity = "0";
            ul.style.visibility = "hidden";

            // Apply theming based on level
            const themeColor = getComputedStyle(document.documentElement).getPropertyValue(`--color-base`).trim();
            
            switch (level) {
                case 1:
                    ul.style.borderLeft = `3px solid ${themeColor}`;
                    ul.style.paddingLeft = "12px";
                    break;
                case 2:
                    ul.style.borderLeft = `2px solid ${themeColor}`;
                    ul.style.paddingLeft = "8px";
                    ul.style.marginLeft = "8px";
                    break;
            }
            
            ul.style.marginTop = "4px";
            ul.style.marginBottom = "4px";

            // Sort and render children
            item.children.sort((a, b) => {
                if (a.VolgordeID && b.VolgordeID) {
                    return a.VolgordeID - b.VolgordeID;
                }
                return 0;
            });
            
            item.children.forEach((child) => {
                renderItem(child, ul, level + 1);
            });
            
            li.appendChild(ul);

            // Decide interaction behavior (click vs hover)
            const useClickBehavior = MENU_CONFIG.forceClickBehavior || isInIframe;
            
            if (useClickBehavior) {
                // Click behavior for all levels
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const isExpanded = ul.classList.contains('expanded');
                    
                    if (!isExpanded) {
                        // Close other open submenus at the same level
                        const currentLevelMenus = level === 1 ? 
                            document.querySelectorAll('.nav__sub-list.expanded') :
                            document.querySelectorAll('.nav__sub-sub-list.expanded');
                            
                        currentLevelMenus.forEach(sublist => {
                            if (sublist !== ul) {
                                sublist.classList.remove('expanded');
                                sublist.style.maxHeight = "0";
                                sublist.style.opacity = "0";
                                const parentDropdownIcon = sublist.parentElement.querySelector('.nav__dropdown-icon');
                                if (parentDropdownIcon) {
                                    parentDropdownIcon.style.transform = 'rotate(0deg)';
                                }
                                setTimeout(() => {
                                    sublist.style.visibility = "hidden";
                                }, 300);
                            }
                        });
                        
                        // Open current submenu
                        ul.classList.add('expanded');
                        ul.style.visibility = "visible";
                        ul.style.maxHeight = level === 1 ? "800px" : "400px";
                        ul.style.opacity = "1";
                        
                        // Rotate dropdown icon
                        if (level === 1) {
                            dropdownIcon.style.transform = 'rotate(180deg)';
                        } else if (level === 2) {
                            dropdownIcon.style.transform = 'rotate(90deg)';
                        }
                    } else {
                        // Close current submenu
                        ul.classList.remove('expanded');
                        ul.style.maxHeight = "0";
                        ul.style.opacity = "0";
                        dropdownIcon.style.transform = 'rotate(0deg)';
                        setTimeout(() => {
                            ul.style.visibility = "hidden";
                        }, 150);
                    }
                });
            } else {
                // Hover behavior (for desktop non-iframe usage)
                const delay = CONFIG.navigation.hoverDelay || 250;
                
                link.addEventListener('mouseenter', () => {
                    clearTimeout(hoverTimeouts[menuId]);
                    hoverTimeouts[menuId] = setTimeout(() => {
                        ul.classList.add('expanded');
                        ul.style.visibility = "visible";
                        ul.style.maxHeight = level === 1 ? "800px" : "400px";
                        ul.style.opacity = "1";
                        
                        if (level === 1) {
                            dropdownIcon.style.transform = 'rotate(180deg)';
                        } else if (level === 2) {
                            dropdownIcon.style.transform = 'rotate(90deg)';
                        }
                    }, delay);
                });
                
                link.addEventListener('mouseleave', () => {
                    clearTimeout(hoverTimeouts[menuId]);
                    hoverTimeouts[menuId] = setTimeout(() => {
                        ul.classList.remove('expanded');
                        ul.style.maxHeight = "0";
                        ul.style.opacity = "0";
                        dropdownIcon.style.transform = 'rotate(0deg)';
                        setTimeout(() => {
                            if (!ul.classList.contains('expanded')) {
                                ul.style.visibility = "hidden";
                            }
                        }, 300);
                    }, delay);
                });
                
                ul.addEventListener('mouseenter', () => {
                    clearTimeout(hoverTimeouts[menuId]);
                });
                
                ul.addEventListener('mouseleave', () => {
                    clearTimeout(hoverTimeouts[menuId]);
                    hoverTimeouts[menuId] = setTimeout(() => {
                        ul.classList.remove('expanded');
                        ul.style.maxHeight = "0";
                        ul.style.opacity = "0";
                        setTimeout(() => {
                            if (!ul.classList.contains('expanded')) {
                                ul.style.visibility = "hidden";
                            }
                        }, 300);
                        dropdownIcon.style.transform = 'rotate(0deg)';
                    }, delay);
                });
            }
        }
        
        container.appendChild(li);
    }

    // Build the entire menu starting from level 1
    menuItems.forEach(item => {
        renderItem(item, menuContainer, 1);
    });
    
    console.log(`3-Layer Menu: Rendered ${menuItems.length} top-level items with max depth of ${MENU_CONFIG.maxDepth}`);
}
