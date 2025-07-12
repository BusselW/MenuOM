// renderNav.js

// 1. Definieer isInIframe bovenin
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    // If we can't access parent window, definitely in an iframe
    return true;
  }
})();

// 2. (Eventueel) define-check fix. 
// Als je "splistreactcontrolsbeforeplt.resx.js" niet nodig hebt, verwijder hem of wrap hem in UMD.
// Pseudocode:
// if (typeof define === "function" && define.amd) { 
//    define( ... ) 
// } else {
//    // fallback
// }

// Overige code
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

function renderMenuItems(items) {
    const menuContainer = document.querySelector(CONFIG.navigation.container);
    if (!menuContainer) return;
    menuContainer.innerHTML = "";
    const menuItems = buildMenu(items);
    
    // local object for hover timeouts
    const hoverTimeouts = {};

    function renderItem(item, container, isSubmenu = false) {
        const li = document.createElement("li");
        li.className = isSubmenu 
            ? "nav__sub-item relative" 
            : "nav__item mb-1 relative";

        const menuId = `menu-${item.Id || Math.random().toString(36).substr(2, 9)}`;
        li.setAttribute('data-menu-id', menuId);

        const link = document.createElement("a");
        const theme = CONFIG.branding.theme || "blue";
        link.className = isSubmenu 
            ? `nav__sub-link flex items-center pl-6 pr-4 py-2 hover:bg-gray-100 transition-all border border-brand-${theme} mt-1 rounded` 
            : `nav__link flex items-center px-4 py-3 rounded-md hover:bg-white shadow-sm transition-all hover:shadow border border-brand-${theme}`;
        link.textContent = item.Title || "Untitled";

        const icon = document.createElement("span");
        icon.className = isSubmenu 
            ? `material-icons mr-2 text-base text-brand-${theme}` 
            : `material-icons mr-3 text-brand-${theme}`;
        icon.textContent = getIcon(item.Icon);
        link.prepend(icon);

        const hasChildren = item.children && item.children.length > 0;
        const itemUrl = getItemUrl(item);
        if (itemUrl) {
            link.href = itemUrl;
            // If we are in an iframe, open links in parent by default
            if (isInIframe) {
                if (!hasChildren || !CONFIG.navigation.disableParentItemLinks) {
                    link.target = "_parent";
                    console.log(`Setting link target to _parent for: ${item.Title}`);
                }
            }
        } else {
            link.href = "#";
            link.style.cursor = "pointer";
        }

        li.appendChild(link);

        if (hasChildren) {
            const dropdownIcon = document.createElement("span");
            dropdownIcon.className = `nav__dropdown-icon material-icons ml-auto transition-transform duration-10 text-brand-${theme}`;
            dropdownIcon.textContent = "expand_more";
            link.appendChild(dropdownIcon);

            const ul = document.createElement("ul");
            ul.className = "nav__sub-list overflow-hidden transition-all duration-10 max-h-0 py-0 bg-white opacity-0";
            ul.style.maxHeight = "0";
            ul.style.opacity = "0";
            ul.style.visibility = "hidden";

            // theming
            const themeColor = getComputedStyle(document.documentElement).getPropertyValue(`--color-base`).trim();
            ul.style.borderLeft = `3px solid ${themeColor}`;
            ul.style.paddingLeft = "12px";
            ul.style.marginTop = "4px";
            ul.style.marginBottom = "4px";

            item.children.sort((a, b) => {
                if (a.VolgordeID && b.VolgordeID) {
                    return a.VolgordeID - b.VolgordeID;
                }
                return 0;
            });
            item.children.forEach((child) => {
                renderItem(child, ul, true);
            });
            li.appendChild(ul);

            // Decide click or hover
            const useClickBehavior = CONFIG.navigation.forceClickBehavior || isInIframe;
            if (useClickBehavior) {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const isExpanded = ul.classList.contains('expanded');
                    if (!isExpanded) {
                        // close other open submenus
                        document.querySelectorAll('.nav__sub-list.expanded').forEach(sublist => {
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
                        });
                        // open
                        ul.classList.add('expanded');
                        ul.style.visibility = "visible";
                        ul.style.maxHeight = "800px";
                        ul.style.opacity = "1";
                        dropdownIcon.style.transform = 'rotate(180deg)';
                    } else {
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
                // hover
                link.addEventListener('mouseenter', () => {
                    clearTimeout(hoverTimeouts[menuId]);
                    hoverTimeouts[menuId] = setTimeout(() => {
                        ul.classList.add('expanded');
                        ul.style.visibility = "visible";
                        ul.style.maxHeight = "800px";
                        ul.style.opacity = "1";
                        dropdownIcon.style.transform = 'rotate(180deg)';
                    }, CONFIG.navigation.hoverDelay);
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
                    }, CONFIG.navigation.hoverDelay);
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
                    }, CONFIG.navigation.hoverDelay);
                });
            }
        }
        container.appendChild(li);
    }

    // Build the entire menu
    menuItems.forEach(item => {
        renderItem(item, menuContainer, false);
    });
}
