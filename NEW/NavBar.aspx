<%@ Register Tagprefix="SharePoint" Namespace="Microsoft.SharePoint.WebControls" Assembly="Microsoft.SharePoint, Version=16.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<!DOCTYPE html>
<html lang="nl">
<head>
	<meta charset="UTF-8"
		  name="viewport" 
		  content="width=device-width, initial-scale=1.0">
    
	<title>Navigatie Plus Agenda - 3 Layer Menu</title>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
    <link rel="stylesheet" href="navigation-styles.css" />
    <link rel="stylesheet" href="fix-theming.css" />
    <script src="iconMapping.js"></script>
    <script src="setup.js" defer></script>
    <script src="renderNav.js" defer></script>
    <script src="renderCal.js" defer></script>
    <script src="renderDoc.js" defer></script>
    <script src="tailwind-configuration.js" defer></script>
</head>
	

<!--opties:
	class: theme-blue; theme-orange; theme-purple; theme-green; theme-red; theme-turquoise  
	data-api-url: https://som.org.om.local/sites/MulderT/@SUBSITE/_api/web/lists(guid'@GUID') 
	data-listguid="@GUID" 
	
	NEW: Supports 3-layer menu structure
	Level 1: Main navigation items
	Level 2: Sub-items 
	Level 3: Sub-sub-items (max depth)
	-->	
	
<body 
		class="theme-blue"
		data-api-url="https://som.org.om.local/sites/MulderT/_api/web/lists(guid'fc8d9297-dcf5-44ef-8db2-5a38a226e394')/items"
		data-listguid="e57d552c-a51d-4f2b-9fff-a7de1252fb5d"
		data-calendar-url="https://som.org.om.local/sites/MulderT/_api/web/lists(guid'e57d552c-a51d-4f2b-9fff-a7de1252fb5d')/items"
		data-all-events-base-url="https://som.org.om.local/sites/MulderT/_layouts/15/Events.aspx?"
		data-button-url="https://som.org.om.local/sites/MulderT/Lists/NavBar/AllItems.aspx"
		data-page-size="4"
		data-allowed-groups='["1.1. Teamleiders","1. Sharepoint beheer"]'
		data-max-menu-depth="3">


    <!-- Header -->
    <div class="header" id="page-header">
        <div class="header__title" id="header-title">3-Layer Navigation</div>
        <div id="header-actions">
            <button class="header__icon-button">
                <span class="material-icons">edit</span>
            </button>
        </div>
    </div>

    <div class="nav">
        <ul class="nav__list" id="menu"></ul>
    </div>

    <div class="agenda-container">
        <div class="agenda-header">
            <h2>Planning</h2>
            <a id="all-events-link" target="_blank">Alles weergeven</a>
        </div>

        <div id="agenda-items">
            <p class="loading-message">Gegevens laden...</p>
        </div>

        <div id="pagination-controls" style="text-align: center; margin-top: 10px;">
            <button id="prevButton" style="display: none;">&larr; Vorige</button>
            <button id="nextButton" style="display: none;">Volgende &rarr;</button>
        </div>

        <a href="#" class="add-event" target="_blank">+ Gebeurtenis toevoegen</a>
    </div>
</body>
</html>
