// Initialize calendar component
function initCalendar() {
    if (!CONFIG.calendar.enabled || !CONFIG.calendar.listGuid) {
        return;
    }
    const calendarContainer = document.querySelector(CONFIG.calendar.container);
    if (!calendarContainer) {
        console.error("Calendar container not found:", CONFIG.calendar.container);
        return;
    }
    calendarContainer.classList.remove('hidden');
    
    // Apply modern styling to the calendar container
    calendarContainer.classList.add('bg-white', 'rounded-lg', 'shadow-md', 'p-4');
    
    // Update calendar title
    const calendarTitle = document.getElementById('calendar-title');
    if (calendarTitle && CONFIG.calendar.title) {
        calendarTitle.textContent = CONFIG.calendar.title;
        calendarTitle.classList.add('font-medium', 'text-lg', 'mb-2');
    }
    
    // Style the calendar header
    const calendarHeader = document.querySelector('.calendar-header');
    if (calendarHeader) {
        calendarHeader.classList.add('flex', 'justify-between', 'items-center', 'mb-4');
        calendarHeader.style.borderBottom = '1px solid rgba(0, 0, 0, 0.1)';
        calendarHeader.style.paddingBottom = '8px';
    }
    
    // Style add event button
    const addEventBtn = document.getElementById('add-event-btn');
    if (addEventBtn && CONFIG.calendar.addEventUrl) {
        addEventBtn.classList.remove('hidden');
        addEventBtn.classList.add('flex', 'items-center', 'text-sm', 'bg-gray-100', 'px-3', 'py-1', 'rounded', 'hover:bg-gray-200', 'transition-colors');
        addEventBtn.addEventListener('click', function() {
            window.open(CONFIG.calendar.addEventUrl, '_blank');
        });
    }
    
    // Set up pagination
    if (CONFIG.calendar.showPagination) {
        const paginationContainer = document.getElementById('calendar-pagination');
        if (paginationContainer) {
            paginationContainer.classList.remove('hidden');
            paginationContainer.classList.add('mt-4', 'flex', 'justify-center', 'space-x-2');
            
            // Style pagination buttons
            const prevButton = document.getElementById('prev-page');
            const nextButton = document.getElementById('next-page');
            if (prevButton) {
                prevButton.classList.add('text-sm', 'px-3', 'py-1', 'bg-gray-100', 'hover:bg-gray-200', 'rounded', 'transition-colors');
            }
            if (nextButton) {
                nextButton.classList.add('text-sm', 'px-3', 'py-1', 'bg-gray-100', 'hover:bg-gray-200', 'rounded', 'transition-colors');
            }
        }
    }
    
    fetchCalendarEvents();
    if (CONFIG.debug.enabled) {
        console.log("Calendar component initialized with modern styling");
    }
}

// Function to fetch calendar events
function fetchCalendarEvents(page = 1) {
    if (!CONFIG.calendar.enabled || !CONFIG.calendar.listGuid) return;
    const itemCount = CONFIG.calendar.itemCount || 5;
    const skip = (page - 1) * itemCount;
    let baseUrl;
    try {
        baseUrl = _spPageContextInfo.webAbsoluteUrl;
    } catch (e) {
        baseUrl = CONFIG.calendar.baseUrl || window.location.origin;
    }
    console.log("Using base URL:", baseUrl);
    const today = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(today.getMonth() + 3);
    const todayFormatted = today.toISOString().split('.')[0] + 'Z';
    const threeMonthsLaterFormatted = threeMonthsLater.toISOString().split('.')[0] + 'Z';
    let filterQuery = `EventDate ge datetime'${todayFormatted}' and EventDate le datetime'${threeMonthsLaterFormatted}'`;
    let apiUrl = `${baseUrl}/_api/web/lists(guid'${CONFIG.calendar.listGuid}')/items?$orderby=EventDate asc&$top=${itemCount}&$skip=${skip}`;
    apiUrl += `&$filter=${encodeURIComponent(filterQuery)}`;
    console.log("Final API URL:", apiUrl);
    let testUrl = `${baseUrl}/_api/web/lists(guid'${CONFIG.calendar.listGuid}')/items?$top=1`;
    console.log("Testing with simplified URL:", testUrl);

    fetch(testUrl, {
        method: 'GET',
        headers: {
            'Accept': 'application/json;odata=verbose',
            'Content-Type': 'application/json;odata=verbose'
        }
    })
    .then(response => {
        console.log("Response status:", response.status, response.statusText);
        if (!response.ok) {
            return response.text().then(text => {
                console.error("Error response text:", text.substring(0, 500) + "...");
                throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
            });
        }
        return response.json();
    })
    .then(() => {
        return fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json;odata=verbose',
                'Content-Type': 'application/json;odata=verbose'
            }
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
        const events = data.d.results;
        console.log("Retrieved events:", events.length);
        renderModernCalendarEvents(events);
        updatePagination(events.length, page);
    })
    .catch(error => {
        console.error('Error fetching calendar events:', error);
        const eventsContainer = document.getElementById('calendar-events');
        if (eventsContainer) {
            eventsContainer.innerHTML = `
                <li class="p-3 bg-red-50 text-red-600 rounded-md border border-red-200 text-center">
                    <div class="font-medium">Fout bij laden</div>
                    <div class="text-sm">${error.message}</div>
                    <button onclick="location.reload()" class="mt-2 px-2 py-1 bg-red-100 hover:bg-red-200 rounded text-sm">
                        Probeer opnieuw
                    </button>
                </li>
            `;
        }
    });
}

// Modern calendar event rendering
function renderModernCalendarEvents(events) {
    const eventsContainer = document.getElementById('calendar-events');
    if (!eventsContainer) return;
    eventsContainer.innerHTML = '';
    eventsContainer.className = 'space-y-2'; // Add spacing between events
    
    // Get the theme color for styling
    const theme = CONFIG.branding.theme || "blue";
    
    // Event colors based on categories or random selection
    const colorClasses = {
        default: { border: `border-${theme}-500`, bg: `bg-${theme}-50` },
        meeting: { border: 'border-blue-500', bg: 'bg-blue-50' },
        training: { border: 'border-green-500', bg: 'bg-green-50' },
        deadline: { border: 'border-red-500', bg: 'bg-red-50' },
        presentation: { border: 'border-purple-500', bg: 'bg-purple-50' },
        travel: { border: 'border-yellow-500', bg: 'bg-yellow-50' }
    };
    
    // If no events found
    if (events.length === 0) {
        eventsContainer.innerHTML = `
            <li class="p-3 bg-gray-50 text-gray-500 rounded-md border border-gray-200 text-center">
                Geen aankomende gebeurtenissen gevonden
            </li>
        `;
        return;
    }
    
    // Create event items with modern design
    events.forEach((event, index) => {
        // Determine event type and color (this is a simplified logic - 
        // in real app you might want to use Category field or other logic)
        let eventType = 'default';
        if (event.Category) {
            // Convert category to a key in our colorClasses if possible
            const category = event.Category.toLowerCase();
            if (category.includes('meeting') || category.includes('vergadering')) eventType = 'meeting';
            else if (category.includes('training') || category.includes('workshop')) eventType = 'training';
            else if (category.includes('deadline')) eventType = 'deadline';
            else if (category.includes('presentation') || category.includes('presentatie')) eventType = 'presentation';
            else if (category.includes('travel') || category.includes('reis')) eventType = 'travel';
        } else {
            // Randomly assign a color for demo purposes
            const types = Object.keys(colorClasses);
            eventType = types[index % types.length];
        }
        
        const colorClass = colorClasses[eventType] || colorClasses.default;
        
        // Parse dates
        const startDate = new Date(event.EventDate || event.Start || event.StartDate);
        const endDate = new Date(event.EndDate || event.End || event.EndTime);
        
        // Create the event list item
        const li = document.createElement('li');
        li.className = `p-2 border-l-2 ${colorClass.border} ${colorClass.bg} rounded-r`;
        li.innerHTML = `
            <div class="font-medium">${event.Title}</div>
            <div class="text-gray-600 text-sm">${formatDate(startDate)} • ${formatTime(startDate)}${endDate ? '-' + formatTime(endDate) : ''}</div>
            ${event.Location ? `<div class="text-gray-500 text-xs">${event.Location}</div>` : ''}
        `;
        
        // Add click handler to view details if applicable
        if (CONFIG.calendar.editEventUrl) {
            li.style.cursor = 'pointer';
            li.addEventListener('click', () => {
                const url = CONFIG.calendar.editEventUrl + event.ID;
                window.open(url, '_blank');
            });
        }
        
        eventsContainer.appendChild(li);
    });
}

// Helpers
function formatDate(d) {
    if (!(d instanceof Date)) return '';
    // Get short day and month in Dutch, e.g. "21 jan" for January 21
    const str = d.toLocaleString('nl-NL', { day: 'numeric', month: 'short' });
    // Remove period (e.g. "jan." -> "jan")
    return str.replace(/\.$/, '');
}

function formatTime(d) {
    if (!(d instanceof Date)) return '';
    return d.toLocaleTimeString('nl-NL', {hour: '2-digit', minute:'2-digit'});
}

function updatePagination(count, page) {
    if (!CONFIG.calendar.showPagination) return;
    
    const itemCount = CONFIG.calendar.itemCount || 5;
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    
    if (!prevButton || !nextButton) return;
    
    // Enable/disable previous button
    if (page <= 1) {
        prevButton.setAttribute('disabled', 'disabled');
        prevButton.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        prevButton.removeAttribute('disabled');
        prevButton.classList.remove('opacity-50', 'cursor-not-allowed');
        prevButton.onclick = () => fetchCalendarEvents(page - 1);
    }
    
    // Enable/disable next button based on if there are more events
    if (count < itemCount) {
        nextButton.setAttribute('disabled', 'disabled');
        nextButton.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        nextButton.removeAttribute('disabled');
        nextButton.classList.remove('opacity-50', 'cursor-not-allowed');
        nextButton.onclick = () => fetchCalendarEvents(page + 1);
    }
}