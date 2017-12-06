/**********************************************************
OBJECT: BUILDERS
***********************************************************/

/***
* @project: K-Spec Inspections iPad App
* @author: SIMB Dev3
* @copyright: SIMB Pty Ltd 2017
*/

var Builders = function()
{
	var self = this;	// Store a reference to this object for use during callback methods

	// Declare popselectors
	this.objPopState = null;
	this.objPopCountry = null;
	this.sortBy = "name";
	this.sortDir = "ASC";	
    this.scroller = null;		
	
	/***
	* setupbuilders clears the main stage and then shows a listing of builders.
	*/
	this.setupBuilders = function()
	{
		objApp.clearMain();
		objApp.callbackMethod = null;	// Reset callback method.		
		
		// Set the main heading
		objApp.setHeading("K-Spec Inspections");
		objApp.setSubHeading("Builder Listing");
		objApp.setSubExtraHeading('', false);
		objApp.setNavActive("#navBuilders");

		// Show the inspectionListing screen
		$("#buildersList").removeClass("hidden");

		// Initialise filters
		objFilters.filterScreen = "builders";
		
		// Setup the status filter to show the correct options for the builder screen
		//removePopOptions("#frmFilters #filterStatus", 1, "", "View All");
		//objFilters.objPopStatus.addOption("0", "Active Builders");
		//objFilters.objPopStatus.addOption("1", "Not Active Builders");
		
		objFilters.clearFilters();  
		objFilters.restoreDefaults();
		
		// Show only the filters we want
	    objFilters.hideAllFilters();
	    objFilters.showHideFilter("#filterName", true);
	    objFilters.showHideFilter("#filterPeriod", true);
	    objFilters.showHideFilter("#filterDateFrom", true);
	    objFilters.showHideFilter("#filterDateTo", true);
	    objFilters.showHideFilter("#filterRecordLimit", true);
		
		// Set the filters search method
		objFilters.searchMethod = objApp.objBuilders.doBuilderSearch;
		
	    //objFilters.show();
		
		// Do the builder search
		self.doBuilderSearch();
		
		$("#buildersList #btnAddBuilder").unbind();
		
		$("#buildersList #btnAddBuilder").bind(objApp.touchEvent, function()
		{
			self.setupAddNewBuilder();
			return false;
		});

        
        $("#doSearch").bind(objApp.touchEvent, function() {
            self.doBuilderSearch();    
        });

		objApp.setBodyClass('builder');
	}

	/***
	* doBuilderSearch searches the builders database
	* using the user entered search term.  The builder name
	* is used to match the builder record.
	*/
	this.doBuilderSearch = function()
	{
        objApp.showHideSpinner(true, "#buildersList");        
                    
		// Remove the triangle from the table header cells
		$("#tblBuilderListingHeader th .triangle").remove();
		
		// Unbind events
		$("#tblBuilderListingHeader th").unbind();
		$("#tblBuilderListingHeader tr").unbind();
		
		// Inject the triangle
		$("#tblBuilderListingHeader th[class='" + self.sortBy + "']").append('<span class="triangle ' + self.sortDir + '"></span>');
        
        // Remove previously bound events
        $("#builderScrollWrapper").unbind();
        
        // Kill iScroll if it already exists
        if(this.scroller) {
            this.scroller.destroy();
            this.scroller = null;
        }        
        
        // Remove any existing items in the list.
        $("#builderScrollWrapper").html("");                
		
		// If the user has entered a value into the Name filter,
		// use that to match against the builder name or contact names.
	    //var searchText = objFilters.name;  
        var searchText = $("#builderSearch").val();
		
		var sql = "SELECT * FROM builders WHERE deleted = 0 ";
			
		if(searchText != "")
		{
			sql += "AND ((name LIKE '%" + searchText + "%') " +
				            "OR (address LIKE '%" + searchText + "%') " +
				            "OR (city LIKE '%" + searchText + "%') " +
				            "OR (state LIKE '%" + searchText + "%') " +
				            ") ";			
		}			
			
		// Apply any additional search filters 
		var values = new Array();    	                      
	    if (objApp.IS_STATE_FILTERED == 1){
	        sql += "  AND state = '" + objApp.FILTERED_STATE_CODE + "' ";
        }
	    sql += "ORDER BY " + self.sortBy + " " + self.sortDir + " ";
		
	    
	    if((objFilters.recordLimit != "") && (objFilters.recordLimit != "all"))
	    {            
	    	sql += "LIMIT ?";
	    	values.push(objFilters.recordLimit);
	    }		    
	    
	    blockElement('body');
	    objDBUtils.loadRecordsSQL(sql, values, function(param, items)
	    {
		    // Remove any element block
		    unblockElement('body');
            
            if(!items)
            {
                objApp.showHideSpinner(false, "#buildersList");                
                return;
            }
		    
		    // Build the HTML for the builder listing table
			var html = '<table id="tblBuilderListing" class="listing">';
			
			var maxLoop = items.rows.length;
			var r = 0;
			
			// Loop through all of the builders in the recordset.
			for(r = 0; r < maxLoop; r++)
			{
				// Get the current row
			    var row = items.rows.item(r);
				
			    // Derive the location of the builder.
			    var location = (row.address?row.address +", ":"")+ (row.city?row.city +", ":"") + row.state;
			    html += '<tr rel="' + row.id + '">';
			    html += '<td rel="' + row.id + '"><div rel="' + row.id + '" class="delete"></div><span class="view">' + row.name + '</span></td>';
			    html += '<td rel="' + row.id + '">' + location + '</td>';
			    html += '<td rel="' + row.id + '">' + row.phone + '</td>';
			    html += '</tr>';
			}
			
			html += '</table>';
			
			// Insert the HTML into the scrolling wrapper.
			$("#builderScrollWrapper").html(html);
            
            self.setTableWidths();
            
            setTimeout(function()
            {
                objApp.showHideSpinner(false, "#buildersList");        
			
			    if(objUtils.isMobileDevice())	    
		        {
                    self.scroller = new IScroll('#builderScrollWrapper', { hScrollbar: false, vScrollbar: false, scrollbarClass: 'myScrollbar', click: true });
			    }
            }, 1000);
			
			$("#tblBuilderListingHeader th").bind(objApp.touchEvent, function(e)
			{
				e.preventDefault();

				var newSortBy = $(this).attr("class");
				
				if(self.sortBy == newSortBy)
				{
					if(self.sortDir == "ASC")
					{
						self.sortDir = "DESC";
					}
					else
					{
						self.sortDir = "ASC";
					}
				}
				else
				{
					self.sortDir = "ASC";	
				}
				
				self.sortBy = newSortBy;
				
				self.doBuilderSearch();
			});			
			
		    
			// Bind click/touch event to buttons in the listing.
			$("#tblBuilderListing tr td span.view").bind(objApp.touchEvent, function(e)
			{
				e.preventDefault();
				
			    // Remove any active states of the list items
			    $(this).parent().parent().find("td").removeClass("active");
			    
			    // Set the active state
			    $(this).parent().addClass("active");
			    
			    // Get the id of the selected builder
			    var builder_id = $(this).parent().attr("rel");
			    
			    // Show the loading indicator
			    blockElement('body');
			    
			    // Load the inspection in question
			    objDBUtils.loadRecord("builders", builder_id, function(builder_id, row)
			    {
			    	unblockElement('body');
			    	
					if(row)
					{
						// Show the edit builder screen.
						objApp.objBuilders.editBuilder(row);	
					}
					
			    }, builder_id);
				
			    return true; 
			});			

			$("#tblBuilderListing tr td div.delete").bind(objApp.touchEvent, function(e)
			{	
				e.preventDefault();
				
				if(confirm("Are you sure you want to Delete this Builder?"))
				{
					var builder_id = $(this).attr("rel");
					
					objDBUtils.deleteRecord("builders", builder_id, function()
					{
						self.setupBuilders();
					});
				}
				
				return true;				
			});


	    }, "");
	}
    

    /***
    * Sets the listing table column widths (headers and cells)
    * as required.
    */
    this.setTableWidths = function()
    {
        // Setup table column widths
        var orientation = objApp.getOrientation();
        var screenWidth = screen.width;
        
        if(orientation == "landscape") {
            screenWidth = screen.width > screen.height?screen.width:screen.height;
        }
        
        var tableWidth = screenWidth - 50;
        $(".scrollWrapper").css("width", tableWidth + 20 + "px");    

        
        var tableHeader = $("#tblBuilderListingHeader");
        var tableBody = $("#tblBuilderListing");

        $(tableHeader).css("width", tableWidth + "px");
        $(tableBody).css("width", tableWidth + "px");
        
        var width_col1 = Math.floor(tableWidth / 3);
        var width_col2 = Math.floor(tableWidth / 3);
        var width_col3 = tableWidth - width_col1 - width_col2;
        
        $(tableHeader).find("th:eq(0)").css("width", width_col1 + "px");  
        $(tableHeader).find("th:eq(1)").css("width", width_col2 + "px");
        $(tableHeader).find("th:eq(2)").css("width", width_col3 + "px"); 
        
        $(tableBody).find("tr td:eq(0)").css("width", width_col1 + "px");  
        $(tableBody).find("tr td:eq(1)").css("width", width_col2 + "px");
        $(tableBody).find("tr td:eq(2)").css("width", width_col3 + "px"); 
    }


	/***
	* Setup the screen to add new builder
	*/
	this.setupAddNewBuilder= function()
	{	
		// Clear any keys and the main screen area
		objApp.clearKeys();
		objApp.clearMain();
		
		// Make sure user logged in
		var user_id = localStorage.getItem("user_id"); 
		if(user_id == "")
		{
			objApp.objLogin.logout();
			return;
		}
		
		// Hide the filters panel
		objFilters.hide();		
		
		$("#builderDetails #created_by").val(user_id);
		
		// Set the main heading
		objApp.setHeading("Builder Details");
		
		// Set the builders nav option to be active.
		objApp.setNavActive("#navBuilders");

		// Setup number modals
		initNumberModals("#main #frmBuilderDetails");
		    
		// Initalise all the relevant fields (set them to blank in the UI)
		var fields = new Array("name","contact", "phone", "mobile", "email", "address", "city", "postcode");
		
		for(var f in fields) 
		{
		    var field_name = fields[f];
		    $("#main #frmBuilderDetails #" + field_name).val(""); 
		    
			$("#main #frmBuilderDetails #" + field_name).unbind();
			
			// If the ipad has scrolled up to show the keyboard when the user touches in a field,
			// make sure we scroll back down after the user has finished typing.
			$("#main #frmBuilderDetails #" + field_name).bind("blur", function()
			{
				objApp.scrollTop();
			});		       
		}        
		
		self.setupPopselectors(null);  
		
		// Show the builder details screen.
		$("#builderDetails").removeClass("hidden");
		
		// Bind events to UI objects
		this.bindEvents();		
					
	}
	
	/***
	* Setup the screen to edit a selected builder
	*/
	this.editBuilder = function(builder)
	{    		
		// Clear all keys
		objApp.clearKeys();
		
		// Set the builder id into the global keys array.
		objApp.keys.builder_id = builder.id;
		
		// If there no valid builder id set, break.
		if(objApp.keys.builder_id == "")
			return;
			
		// Hide the filters panel
		objFilters.hide();
			
		// Clear the main screen area
		objApp.clearMain();
		
		// Set the main heading
		objApp.setHeading("Builder Details");

        objApp.setSubHeading('', false);
		
		// Set the builders nav option to be active.
		objApp.setNavActive("#navBuilders");

		// Setup number modals
		initNumberModals("#main #frmBuilderDetails");
		    
		// Set the field values that we want to show from the builder recordset
		var fields = new Array("name","contact", "phone", "mobile", "email", "address", "city", "postcode", "created_by");
		
		for(var f in fields) 
		{
		    var field_name = fields[f];
		    $("#main #frmBuilderDetails #" + field_name).val(builder[field_name]); 
		    
			$("#main #frmBuilderDetails #" + field_name).unbind();
			
			// If the ipad has scrolled to show the notes field,
			// make sure we scroll back down after the user has finished typing.
			$("#main #frmBuilderDetails #" + field_name).bind("blur", function()
			{
				objApp.scrollTop();
			});			       
		}    

		// Initalise all the pop selects and set their states.
		self.setupPopselectors(builder);  
		
		// Show the builder details screen.
		$("#builderDetails").removeClass("hidden");
		
		// Bind events to UI objects
		this.bindEvents();	
	  
	}
	
	/***
	* Initialises and loads the popselectors
	*/
	this.setupPopselectors = function(builder)
	{
		if(self.objPopState == null)
		{
			//self.objPopState = new popselector("#builderDetails #state", "Choose a state");
			/*
			$("#builderDetails #state").select2({
                minimumResultsForSearch: -1
            });
            */
		}
		
		if(self.objPopCountry == null)
		{	
			self.objPopCountry = new popselector("#builderDetails #country", "Choose a country");		
		} 
		
		// Preselect state and country
		if(builder == null)
		{
			//self.objPopState.preselect("VIC");
            if (objApp.IS_STATE_FILTERED == 1)
                $("#builderDetails #state").val(objApp.FILTERED_STATE_CODE);
            else
                $("#builderDetails #state").val("VIC");
            $("#builderDetails #state").trigger('change');
			self.objPopCountry.preselect("Australia");							
		}
		else
		{
            $("#builderDetails #state").val(builder.state);
            $("#builderDetails #state").trigger('change');
			//self.objPopState.preselect(builder.state);
			self.objPopCountry.preselect(builder.country);										
		}
	}
	
	this.bindEvents = function()
	{
		// Unbind previously bound events
		$("#builderDetails #btnSaveBuilder").unbind();
		
		// Bind new events
		$("#builderDetails #btnSaveBuilder").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
			
			// Invoke the saveBuilder method.
			self.saveBuilder();

			return false;
		});
	}	
	
	
	/***
	* saveBuilder
	* The saveBuilder method is invoked when the user taps the save button
	* The form is validated and if successful, the data is saved to the database.
	*/	
	this.saveBuilder= function()
	{
	    // Validate the form
	    if(!$("#frmBuilderDetails").validate().form())
	    {
	        alert("Please fill in all required fields and enter valid values");
	        return;
	    }
	    
	    $("#frmBuilderDetails input").blur();
	    
	    blockElement('body');
	    
	    // Invoke the autoSave method after a short delay.
	    setTimeout(function()
	    {
            // Determine if we are adding a brand new builder.
            var new_builder = false;
            if(objApp.keys.builder_id == "") {
                // The user is adding a new builder.
                new_builder = true;    
            }
			
			objDBUtils.autoSave("builders", objApp.keys.builder_id, "frmBuilderDetails", function()
			{
			    // If the id was not set and we just did an update, get the id
			    if(objApp.keys.builder_id == "")
			    {
                    objDBUtils.setKeyFromLastInsertID("builder_id");
			    }
			    
			    unblockElement('body');
			    
                if (objApp.objInspection.getStep() == 1)
                {
                    objApp.objInspection.backFromAddBuilder();
					
                } else if(new_builder) {
                    self.handleNewBuilder();
                }				
			});
			
			unblockElement('body');
			
			if(new_builder==false){
				if(confirm("Changes Saved! do you want to go back to the Builders List?"))
				{
					
					self.setupBuilders();
				}
			}
			
	    }, 250)
	}
    
    /***
    * Handle what happens after a new builder is added
    */
    this.handleNewBuilder= function() {
     	alert("Builder Succesfully Added!");
		self.setupBuilders();
    }
	
	/***
	* showBuilderOptions is fired after a builder has been added / saved.
	* The options modal will show allowing the user to perform a quick action
	* relating to this builder. 
	*/
	this.showBuilderOptions = function()
	{
		if(objApp.keys.builder_id == "")
		{
			setTimeout('showBuilderOptions()', 200);
			return;
		}
		else
		{
			optionModalCloseMethod = objApp.objBuilders.setupBuilders;
			showOptionModal(objApp.keys.builder_id, "builder", $("#main #name").val());
		}
	}				
};
