/**********************************************************
OBJECT: INSPECTIONS
***********************************************************/

/***
* @project: K-Spec Inspections iPad App
* @author: SIMB Dev3
*/
var selected_report_type = '';

var Inspections = function()                              
{
	// Inspection level pop selectors
	this.objPopBuilders = null;
	this.objPopState = null;
    this.doingSearch = false;
	
	// Defect level pop selectors.
	this.objPopLocation = null;
	this.objPopAction = null;
    this.observation = '';
	this.sortBy = "i.inspection_start";
	this.sortDir = "DESC";
	this.initials = "";
	this.restricted = false;
	this.finalised = 0;
	this.objToggleFailed = null;
	this.lastKeyPress = null;
	this.doingSave = false; 
    this.scroller = null;
    this.last_scroller_x = -1;
    this.last_scroller_y = -1;
    
    this.currentStep = 0;
    this.isEditing = 0;
    this.itemSortBy = 'seq_no';
    this.itemSortDir = 'DESC';
    this.numberOfIssues = 0;
    this.numberOfAcknowledgements = 0;
    this.historyPhotosHtml = '';
    this.glDatePicker = null;
    this.is_change_order = false;
	this.builder_id = "";
	this.inAudit = false;
    this.reinspectionItemRow;
    this.reinspectionNotes;
	this.numImgCurr = 0;
    this.reinspectionKey = null;
    this.inspection = false;
    this.keySortArray = false;
    this.MAX_REPORT_PHOTOS = 12;
    this.TOTAL_OMISSIONS_ITEMS = 34;
    this.YES_NO_FIELDS = ['reached_stage', 'is_tidy', 'setback_front_correct', 'setback_sides_correct', 'strip_footing_approx_position_correct', 'pad_footing_approx_position_correct', 'approx_room_sizes_correct', 'arranged_by_supervisor'];
	
	this.current_table = "inspectionitemphotos";
	this.current_key = "inspection_id";
	
	this.current_key = "inspection_id";
    
	this.default_notes =	"All exposed concrete will need cleaning & colour sealing prior to handover.\n"+
							"All appliances will need installing prior to handover.\n"+
							"All landscaping will need finishing prior to handover.\n"+
							"Please ensure all light globes are installed.\n"+
							"All window& door tracks will need cleaning & greasing.\n" +
                            "Ensure all fire rating items are complete, if required.\n" +
                            "Ensure council assets are cleaned prior to handover.";
    
	var self = this;
    var user_email = localStorage.getItem("email");
    var locations = {};
    var email_options = {};
    
	$(".inspectionDetails #btnCapturePhoto").append('<div class="numImgCurr">' + self.numImgCurr + '</div>');
    
	this.setupInspections = function()
	{
        // Clear the main screen area
		objApp.clearMain();
        this.doingSearch = false;
        this.lastKeyPress == null;
        
        // Ensure all keys are cleared
        objApp.clearKeys();
        self.inspection = false;
        
        objDBUtils.orderBy = "name";
        $("#inspectionList .bottomBtns").find("a").removeClass("active");
        var selected_il_builder_id = $("#inspectionList #il_builder_id").val();
        if(!self.doingSave)
        {
            $("#inspectionList #il_builder_id").empty();
            $("#inspectionList #il_builder_id").append('<option value="">Choose</option>');
            var filters = [];
            if (objApp.IS_STATE_FILTERED == 1)
                filters.push(new Array("state = '"+objApp.FILTERED_STATE_CODE+"'"));
            objDBUtils.loadSelect("builders", filters, "#inspectionList #il_builder_id", function(){
                self.doingSave = false;
                $("#inspectionList #il_builder_id").val(selected_il_builder_id);
                $("#inspectionList #il_builder_id").trigger('change');
            }, "option");
        }

        self.doingSave = true;
		objDBUtils.orderBy = "ABS(name) ASC";
		objApp.callbackMethod = null;	// Reset app callback.
		
		// Set the main heading
        objApp.setHeading("K-Spec Inspections");
		objApp.setSubHeading("Inspection Listing");
        objApp.setSubExtraHeading('', false);
		objApp.setNavActive("#navInspections");
		
		// Show the inspectionListing screen
		$("#inspectionList").removeClass("hidden");

	    // Initialise filters
		objFilters.filterScreen = "inspections";
		
		// Setup the status filter to show the correct options for the client screen
		//removePopOptions("#frmFilters #filterStatus", 1, "", "View All");
		//objFilters.objPopStatus.addOption("0", "Active Clients");
		//objFilters.objPopStatus.addOption("1", "Not Active Clients");
		
		objFilters.clearFilters();  
		objFilters.restoreDefaults();
		
		// Show only the filters we want
	    objFilters.hideAllFilters();
	    objFilters.showHideFilter("#filterName", true);
	    objFilters.showHideFilter("#filterClient", true);
	    objFilters.showHideFilter("#filterSite", true);
        objFilters.showHideFilter("#filterUser", true);
	    objFilters.showHideFilter("#filterFinalised", true);
	    objFilters.showHideFilter("#filterRecordLimit", true);

		
		// Set the filters search method
		objFilters.searchMethod = objApp.objInspection.doInspectionSearch;
		
	    //objFilters.show();

		// Do the client search
		self.doInspectionSearch(selected_il_builder_id);

        self.unbindEvents();

        $("#addInspection").bind(objApp.touchEvent, function(e)
        {
            e.preventDefault();
            objApp.cleanup();
            objApp.objInspection.setReturnInspectionID("");
            objApp.objInspection.addNewInspection();
            objApp.context = "inspection";
            objApp.setBodyClass('inspection');
        });

        if ($("#inspectionList #il_builder_id").hasClass('select2-hidden-accessible'))
            $("#inspectionList #il_builder_id").select2('destroy');
        $("#inspectionList #il_builder_id").select2();

        objApp.setBodyClass('inspections');
    }
    
	/***
	* doInspectionSearch searches the inspections database
	* taking into consideration any user entered search terms.  
	*/
	this.doInspectionSearch = function(selected_il_builder_id)
	{  
        objApp.showHideSpinner(true, "#inspectionList");
        this.doingSearch = true;
            
		// Remove the triangle from the table header cells
		$("#tblInspectionListingHeader th .triangle").remove();
        
        // Kill iScroll if it already exists
        if(self.scroller) {
            self.scroller.destroy();
            self.scroller = null;
        }

        // Remove previously bound events
        $("#inspectionScrollWrapper").unbind();
        $("#tblInspectionListingHeader th").unbind();
        //$("#tblInspectionListing a.reinspect").unbind();            
        $("#tblInspectionListing a.view").unbind();            
        $("#tblInspectionListing a.delete").unbind();

		// Inject the triangle
		$("#tblInspectionListingHeader th[class='" + self.sortBy + "']").append('<span class="triangle ' + self.sortDir + '"></span>');	

        // Remove any existing items in the list.
        $("#inspectionScrollWrapper").html("");      
        
		var sql = "SELECT i.*, b.name, (SELECT COUNT(id) FROM reinspections WHERE inspection_id = i.id AND deleted = 0) AS num_reinspections " +
			"FROM inspections i " +
            "INNER JOIN builders b ON b.id = i.builder_id " +
			"WHERE i.deleted = 0 ";

		var values = new Array();
        
        var searchText = $("#inspectionSearch").val();
        if (typeof selected_il_builder_id == 'undefined')
            selected_il_builder_id = $("#inspectionList #il_builder_id").val();

        objFilters.builder_id = selected_il_builder_id;
        objFilters.finalised = $("#inspectionList #is_finalised").val();
          
        if(searchText != "")
        {
            /*
            sql += "AND (" +
                            "(i.report_type LIKE '%" + searchText + "%') " +
                            "OR (i.address LIKE '" + searchText + "%') " +
                            "OR (i.suburb LIKE '%" + searchText + "%') " +
                            "OR (i.lot_no = '" + searchText + "') " +
                            "OR (i.postcode LIKE '%" + searchText + "%') " +
                            "OR (i.inspection_date LIKE '%" + searchText + "%') " +
                            "OR (b.name LIKE '%" + searchText + "%') " +
                            ") ";
            */
            sql += " AND i.lot_no = '" + searchText + "' ";
        }        
		
	    // Apply advanced search filters  
	    if((objFilters.builder_id != undefined) && (objFilters.builder_id != ""))
	    {
	    	sql += "AND i.builder_id = ? ";
            values.push(objFilters.builder_id);
	    }

	    if(objFilters.finalised != "")
	    {
	    	sql += "AND i.finalised = ? ";
	    	values.push(objFilters.finalised);
	    }
	    /*
	    if(objFilters.name != "")
	    {
	    	sql += "AND i.initials LIKE '%" + objFilters.name + "%' ";
	    }
	    */
        
        if((objFilters.user != "") && (objFilters.user != "all"))
        {
            sql += "AND i.created_by = ? ";
            values.push(objFilters.user);
        }

        if (objApp.IS_STATE_FILTERED == 1){
            sql += "  AND i.state = '" + objApp.FILTERED_STATE_CODE + "' ";
        }
		
	    sql += "ORDER BY " + self.sortBy + " " + self.sortDir + " ";	// Show the most recent inspections first.
        
	    if((objFilters.recordLimit != "") && (objFilters.recordLimit != "all"))
	    {            
	    	sql += "LIMIT ?";
	    	values.push(objFilters.recordLimit);
	    }
	    
	    objApp.showHideSpinner(true, "#inspectionList");
        
        objDBUtils.primaryKey = "id";
		objDBUtils.showColumn = "name";

	    objDBUtils.loadRecordsSQL(sql, values, function(param, items)
	    {
			objApp.showHideSpinner(false, "#inspectionList");

            if(!items)
            {
				self.doingSearch = false;
                return;	 
            }
		    
			var html = '<table id="tblInspectionListing" class="listing">';
			
			var maxLoop = items.rows.length;
			var r = 0;
			
			for(r = 0; r < maxLoop; r++) {
				
				var num_defects = 0;
			    var row = items.rows.item(r);
			    var inspDate = objApp.isoDateStrToDate(row.inspection_date);
			    html += '<tr rel="' + row.id + '">';
			    html += '<td class="view">'

			    if(row.finalised) {
                    html += '<span class="icon';
					html += ' finalised';
                    html += '"></span>';
			    }

			    html += objApp.formatUserDate(inspDate) + '</td>';  
			    html += '<td>' + row.lot_no + ' ' + row.address + ' ' + row.suburb + '</td>';
			    html += '<td>' + row.name + '</td>';
                var report_type = row.report_type.replace('inspections', 'inspection');
                /*
                if (report_type == 'Builder: PCI/Final inspection')
                    report_type = 'QA Inspection';
                    */
			    html += '<td>' + report_type + '</td>';
                html += '<td>' + row.num_reinspections + '</td>';
                
                
                /*
                if (row.failed == 1) {
                    html += '<td>Failed</td>';    
                } else {
                    html += '<td>Passed</td>';    
                }
                */
			   
                html += '<td><div class="action">';
                
                // Always have the view action
                if(row.num_reinspections > 0) {
                    html += '<a href="#" data-reveal-id="historyReinspection" class="action view showhistory" data-id="' + row.id + '">History</a>';
                }

                html += '<a href="#" class="action delete" data-id="' + row.id + '">Delete</a>';
                
                // If the inspection is finalised but failed, the user may reinspect it.
                /*
                if((row.finalised == 1) && (row.failed == 1)) {
                    html += '<a href="#" class="action reinspect" data-id="' + row.id + '">Reinspect</a>';
                }
                */
                
                // If the inspection is finalised, the user needs to be able to do a reinspection.

                /*
                if(row.finalised == 1) {
                    html += '&nbsp; <a href="#" class="action passed">View</a>';
                    if (row.failed == 1)
                        html += '<a href="#" class="action failed">Reinspect</a>';
                    else
                        html += '<a href="#" data-reveal-id="historyReinspection" class="action passed">View</a>';
                }
                */
                
                html += '</div></td>';
			    html += '</tr>';
			}
			
			html += '</table>';
			
			$("#inspectionScrollWrapper").html(html);
            
            self.setTableWidths();


            setTimeout(function()
            {
                if(objUtils.isMobileDevice())
                {
                    self.scroller = new IScroll('#inspectionScrollWrapper', { click: true, hScrollbar: false, vScrollbar: false, scrollbarClass: 'myScrollbar'});
                }
            }, 500);


			// Bind click event to list items
            $("#tblInspectionListing a.delete").bind(objApp.touchEvent, function(e) {

                self.is_change_order = true;
				e.preventDefault();
				var inspection_item_id = $(this).attr("data-id");
				
				var parent = $(this).parents('tr');

				
                var item_name = $(parent).find("td:eq(2)").text();

                if(confirm("Are you sure you wish to delete this inspection for " + item_name))
                {
                    var sql = "UPDATE inspections " +
                              "SET deleted = 1, dirty = 1 " +
                              "WHERE id = ?";
                    objDBUtils.execute(sql, [inspection_item_id], null);
                    self.doInspectionSearch();
                }
            });

            // Bind click/touch event to buttons in the listing.
            $("#tblInspectionListing tr td.view").bind(objApp.touchEvent, function(e)
            {
                e.preventDefault();

                var inspection_id = $(this).parent().attr('rel');
                var num_reinspections = $(this).attr("data-reinspections");

                // The view button may require the user to select from the inspection history window.
                if($(this).hasClass("showhistory")) {
                    self.loadHistoryReinspectionItems(inspection_id);
                    return;
                }

                // Show the loading indicator
                blockElement('body');

                // Load the inspection in question
                objDBUtils.loadRecord("inspections", inspection_id, function(inspection_id, row)
                {
                    unblockElement('body');

                    if(!row) {
                        alert("Sorry, the inspection could not be loaded.  Please report this error.");
                        return;
                    }

                    objApp.objInspection.editInspection(row);

                }, inspection_id);
            });

            // Handle the event when the user clicks on the VIEW button.
            $("#tblInspectionListing a.view").bind(objApp.touchEvent, function(e)  {
                e.preventDefault();
                var inspection_id = $(this).attr('data-id');
                var num_reinspections = $(this).attr("data-reinspections");

                // The view button may require the user to select from the inspection history window.
                if($(this).hasClass("showhistory")) {
                    self.loadHistoryReinspectionItems(inspection_id);
                    return;
                }

                // Show the loading indicator
                blockElement('body');
                
                // Load the inspection in question
                objDBUtils.loadRecord("inspections", inspection_id, function(inspection_id, row)
                {
                    unblockElement('body');
                    
                    if(!row) {
                        alert("Sorry, the inspection could not be loaded.  Please report this error.");
                        return;
                    }

                    objApp.objInspection.editInspection(row);	
                    
                }, inspection_id);
			});
            
            // Handle the event when the user clicks on the REINSPECT button.
            /*
            $("#tblInspectionListing a.reinspect").click(function(e)  {

                e.preventDefault();
                var inspection_id = $(this).attr('data-id');
                
                console.log("HERE");

                self.startReinspection(inspection_id);               
            });
            */
			
			$("#tblInspectionListingHeader th").bind(objApp.touchEvent, function(e) {
				e.preventDefault();
                
                if (!$(this).is('[class]')) {
                    return;    
                }

				var newSortBy = $(this).attr("class");
                if(newSortBy == "") {
                    return;
                }
				
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
				
				self.doInspectionSearch();
			});
            
            self.doingSearch = false;
            		
	    }, "");
	}

    /**
    * Creates a new reinspection after confirming with the user.
    */
    this.startReinspection = function(inspection_id)
    {
        if(!confirm("You are about to start a reinspection.  Are you sure you wish to continue?")) {
            return;
        } 
        
        blockElement('body');
        
        // Load the original inspection
        objDBUtils.loadRecord("inspections", inspection_id, function(inspection_id, row)
        {
            if(!row) {
                alert("Sorry, the inspection could not be loaded.  Please report this error.");
                unblockElement('body');
                return;
            }

            self.reinspectionNotes = row.notes;
            objApp.keys.inspection_id = inspection_id;
            objApp.keys.report_type = row.report_type;
            self.inspection = row;

            var inspection_property = "Lot " + row.lot_no + ", " + row.address + ", " + row.suburb;


            // Clear all "most recent" flags in the reinspections table
            var sql = "UPDATE reinspections " +
                "SET most_recent = 0, dirty = 1 " +
                "WHERE inspection_id = ? AND deleted = 0";

            objDBUtils.execute(sql, [inspection_id], function() {
                // Create a new reinspections record, setting the most recent flag
                var currentdate = new Date();
                var curdate = currentdate.getFullYear() + "-"
                                + (currentdate.getMonth()+1)  + "-"
                                + currentdate.getDate();

                var reinspection_id = objDBUtils.makeInsertKey(objApp.sync_prefix);
                var values = [reinspection_id, inspection_id, curdate, 1, 1,self.reinspectionNotes];
                for(var i = 1; i <= self.TOTAL_OMISSIONS_ITEMS; i++)
                    values.push(row['omission_item_' + i]);
                for(var i in self.YES_NO_FIELDS)
                    values.push(row[self.YES_NO_FIELDS[i]]);
                sql = "INSERT INTO reinspections(id, inspection_id, reinspection_date, failed, most_recent, notes ";
                for(var i = 1; i <= self.TOTAL_OMISSIONS_ITEMS; i++)
                    sql += ', omission_item_' + i;
                for(var i in self.YES_NO_FIELDS)
                    sql += ', ' + self.YES_NO_FIELDS[i];
                sql += ') VALUES(?,?,?,?,?,?';
                for(var i = 1; i <= self.TOTAL_OMISSIONS_ITEMS + self.YES_NO_FIELDS.length; i++)
                    sql += ',?';
                sql += ')';

                objDBUtils.execute(sql, values, function(){
                    
                    objApp.keys.reinspection_id = reinspection_id;

                    // Now that the reinspections record has been created, now create the reinspection items,
                    // using the base inspection items as the foundation.
                    sql = "SELECT * FROM inspectionitems WHERE inspection_id = ? AND deleted = 0";
                    objDBUtils.loadRecordsSQL(sql, [inspection_id], function(param, items) {
                        if(!items)
                        {
                            alert("Sorry, an error occurred whilst trying to create the reinspection items.  Please report this error");
                            unblockElement('body');
                            return;
                        }

                        var maxLoop = items.rows.length;
                        var r = 0;

                        for(r = 0; r < maxLoop; r++) {

                            var row = items.rows.item(r);

                            sql = "INSERT INTO reinspectionitems(id,reinspection_id, inspectionitem_id, rectified) " +
                                  "VALUES(?,?,?,?)";
                                  
                            var reinspection_item_id = objDBUtils.makeInsertKey(objApp.sync_prefix) + r;

                            var values = [reinspection_item_id, reinspection_id, row.id, row.rectified];

                            var last_item = (r == (maxLoop - 1));

                            objDBUtils.executeWithCBParam(sql, values, function(finished) {

                                // See if the last reinspection item has been copied in.
                                if(finished) {
                                    unblockElement('body');
                                    // Open the reinspection page for this reinspection
                                    self.loadReinspectionItems(reinspection_id);
                                }
                            }, last_item);
                        }

                    },"");


                });
     
            });

            
        }, inspection_id);

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
        
        var tableHeader = $("#tblInspectionListingHeader");
        var tableBody = $("#tblInspectionListing");
        $(tableHeader).css("table-layout", "fixed");
        $(tableBody).css("table-layout", "fixed");
        $(tableHeader).css("width", tableWidth + "px");
        $(tableBody).css("width", tableWidth + "px");
        
        tableWidth = tableWidth - 45;
        
        var average_width = Math.floor(tableWidth / 6);
        average_width = average_width - 22;  // Take into account 10px padding left and right, 10 + 10 = 20, plus 1px border left and right
        
        var width_col1 = average_width - 50;
        var width_col2 = average_width + 60;
        
        $(tableHeader).find("th:eq(0)").css("width", width_col1);    // Delete icon column
        $(tableHeader).find("th:eq(1)").css("width", width_col2 + "px");
        $(tableHeader).find("th:eq(2)").css("width", average_width + "px");
        $(tableHeader).find("th:eq(3)").css("width", average_width + "px"); 
        $(tableHeader).find("th:eq(4)").css("width", (average_width - 60) + "px");
        $(tableHeader).find("th:eq(5)").css("width", (average_width + 40) + "px");
        
        $(tableBody).find("tr td:eq(0)").css("width", width_col1);
        $(tableBody).find("tr td:eq(1)").css("width", width_col2 + "px");
        $(tableBody).find("tr td:eq(2)").css("width", average_width + "px");
        $(tableBody).find("tr td:eq(3)").css("width", average_width + "px");                  
        $(tableBody).find("tr td:eq(4)").css("width", (average_width - 60) + "px");
        $(tableBody).find("tr td:eq(5)").css("width", (average_width + 40) + "px");
    }    
    
    /* new version section */
    this.getStep = function()
    {
        return self.currentStep;
    }
    
    this.setStep = function(step)
    {
        self.currentStep = step;
    }
    
    this.backFromAddClient = function()
    {
        if(!$("#clientDetails").hasClass("hidden"))
		{
			$("#clientDetails").addClass("hidden");
		}
        // Set the main heading
        objApp.setSubHeading("Create a New Inspection");
        objApp.setSubExtraHeading("Step 1 of 3", true);
        
        $("#inspection").removeClass("hidden");
        if(objApp.keys.client_id != "")
		{
            // Setup client and site popselectors
            self.setupPopselectors();
		}    
    }
    
    this.backFromAddSite = function()
    {
        if(!$("#siteDetails").hasClass("hidden"))
		{
			$("#siteDetails").addClass("hidden");
		}
        // Set the main heading
        heading = '';
        objApp.setSubHeading("Create a New Inspection");
        objApp.setSubExtraHeading("Step 1 of 3", true);
        
        $("#inspection").removeClass("hidden");  
    }
    
    this.isTouchDevice = function(){
        try{
            document.createEvent("TouchEvent");
            return true;
        }catch(e){
            return false;
        }
    }
    
    this.touchScroll = function(el){
        if(self.isTouchDevice()){ //if touch events exist...
            //var el=parentNote.getElementById(id);
            var scrollStartPos=0;
    
            el.addEventListener("touchstart", function(event) {
                scrollStartPos=this.scrollTop+event.touches[0].pageY;
            },false);
    
            el.addEventListener("touchmove", function(event) {
                this.scrollTop=scrollStartPos-event.touches[0].pageY;
            },false);
        }
    }

    this.checkIfNeedPhotos = function()
    {
        if ($("#inspection #report_type2").val() == 'Client inspection'){
            /*
            $('a[id="btnCapturePhoto"]').show();
            if (!$('#btnStep1Next').is(':visible')){
                $('a[id="btnCapturePhoto"].step1-capture-btn').hide();
            }
            */
            $('a[id="btnReportPhotos"]').removeClass('hidden');
        }else{
            //$('a[id="btnCapturePhoto"]').hide();
            $('a[id="btnReportPhotos"]').addClass('hidden');
        }
    }
    
    this.showStep1 = function()
    {
        self.setStep(1);
        objApp.clearMain();

        // If we do not have an active inspection
        if(objApp.keys.inspection_id == "") {
            // hide the coversheet notes button.
            $("div.btnEditNotes").hide();
            $("a.btnEditClientNotes").hide();
            $("a.btnEditPrivateNotes").hide();
        }
        
        $("#inspection").removeClass("hidden");
        
		// Set the main heading
        if (self.isEditing)
        {
            objApp.setSubHeading("Edit Inspection");
            objApp.setSubExtraHeading("", false);
        }
        else
        {
            objApp.setSubHeading("Create a New Inspection");
            
            $("div.btnEditNotes").show();

            if(self.need5Steps(objApp.keys.report_type)) {
                
                objApp.setSubExtraHeading("Step 1 of 5", true);
            } /*else if (($("#inspection #report_type").val() == "Fix / Plaster Inspection") || (objApp.keys.report_type == "Fix / Plaster Inspection")) {
                objApp.setSubExtraHeading("Step 1 of 4", true);
            }*/ else {
                objApp.setSubExtraHeading("Step 1 of 3", true);
                //$("div.btnEditNotes").hide();
            }
        }
    }
    
    this.showStep2 = function(inspectionItem)
    {
        self.setStep(2);
        
		// Set the main heading
        objApp.setSubHeading("Add Issues");
        $("div.btnEditNotes").show();
        
        if(self.need5Steps(objApp.keys.report_type)) {
            objApp.setSubExtraHeading("Step 2 of 5", true);
        } else if(self.need4Steps(objApp.keys.report_type)) {
            objApp.setSubExtraHeading("Step 2 of 4", true);
        } else {
            objApp.setSubExtraHeading("Step 2 of 3", true);
        }
        
		if(self.hasReasonInReport(objApp.keys.report_type)) {
			$('#inspectionStep2 #frmDefectDetails tr#reason_wrapper').show();
		}
		else {
			$('#inspectionStep2 #frmDefectDetails tr#reason_wrapper').hide();
		}
        
        // Show the inspection screen.
        objApp.clearMain();
        
        // Clear the observations window
        $("#frmDefectDetails #observation_suggestion").html("");
        $("#observationFS").hide();
        
		$("#inspectionStep2").removeClass("hidden");
        $("#inspectionStep2 textarea#observation").val('');
        $("#inspectionStep2 ul#popAction li:first-child").text('Choose');
        $("#historyModal").hide();
		
        if (inspectionItem) {
            self.initDefectForm(inspectionItem);
        }
        else
        {
            objApp.keys.inspection_item_id = '';
			objApp.keys.location = '';
			objApp.keys.observation = '';
			objApp.keys.action = '';
            objApp.keys.reason = '';
            
            self.initDefectForm(null);
        }
            	
    }
    
    this.showStep3 = function()
    {
        self.setStep(3);
        objApp.clearMain();
        
        // Hide the reinspect button until we check the finalised state of the inspection.
        $("div.btnReinspect").hide();
        $("a.btnReinspect").unbind();

        $("#inspectionStep3").removeClass("hidden");
        
        // Load the inspection object
        objDBUtils.loadRecord("inspections", objApp.keys.inspection_id, function(inspection_id, inspection) {
            if(!inspection) {
                return;    
            }
            
            self.inspection = inspection;

            var inspection_property = "Lot " + inspection.lot_no + ", " + inspection.address + ", " + inspection.suburb;
            objApp.setSubHeading("Review Inspection @ " + inspection_property);
            
            // If this a 5 step inspection, hide the finalisation buttons on step 3
            //if((inspection.report_type == "Builder: PCI/Final inspections") || (inspection.report_type == "Fix / Plaster Inspection")) {
            if(self.need5Steps(inspection.report_type)) {
                $("#btnFinishedWrapper").hide();
                $("#btnSendReport").addClass('hidden');
            } else {
                $("#btnFinishedWrapper").show();
                $("#btnSendReport").removeClass('hidden');
            }

            if(self.need5Steps(inspection.report_type) && objApp.keys.reinspection_id == "") {
                objApp.setSubExtraHeading("Step 3 of 5", true);
                $('#inspectionStep3 > .bottomBtns > a#btnStep3Email').hide();
                $('#inspectionStep3 > .bottomBtns > .btnContainer.right > a#btnStep3Next').html('Next');
                $('#inspectionStep4 > .bottomBtns > .btnContainer.right > a#btnStep4Next').html('Next');
            }  else if( self.need5Steps(inspection.report_type)  && objApp.keys.reinspection_id != "") {
                objApp.setSubExtraHeading("Step 3 of 4", true);
                $('#inspectionStep3 > .bottomBtns > a#btnStep3Email').hide();
                $('#inspectionStep3 > .bottomBtns > .btnContainer.right > a#btnStep3Next').html('Next');
                $('#inspectionStep4 > .bottomBtns > .btnContainer.right > a#btnStep4Next').html('Done');
                $('#reinspection > .bottomBtns > .btnContainer.right > a#btnStep3Next').html('Next');
                $('#reinspection > .bottomBtns > .btnContainer.right > a#btnStep4Next').html('Done');
                
            } else if(self.need4Steps(inspection.report_type) && objApp.keys.reinspection_id == "") {
                objApp.setSubExtraHeading("Step 3 of 4", true);
                $('#inspectionStep3 > .bottomBtns > a#btnStep3Email').hide();
                $('#inspectionStep3 > .bottomBtns > .btnContainer.right > a#btnStep3Next').html('Next');
                $('#inspectionStep4 > .bottomBtns > .btnContainer.right > a#btnStep4Next').html('Exit');
            } else if(self.need4Steps(inspection.report_type) &&  objApp.keys.reinspection_id != "") {
                objApp.setSubExtraHeading("Step 3 of 4", true);
                $('#inspectionStep3 > .bottomBtns > a#btnStep3Email').hide();
                $('#inspectionStep3 > .bottomBtns > .btnContainer.right > a#btnStep3Next').html('Next');
                $('#inspectionStep4 > .bottomBtns > .btnContainer.right > a#btnStep4Next').html('Done');
                $('#reinspection > .bottomBtns > .btnContainer.right > a#btnStep3Next').html('Next');
                $('#reinspection > .bottomBtns > .btnContainer.right > a#btnStep4Next').html('Done');                
            } else {
                //objApp.setSubExtraHeading("Step 3 of 3", true);
                objApp.setSubExtraHeading("", false);
                $('#inspectionStep3 > .bottomBtns > a#btnStep3Email').show();
                $('#inspectionStep3 > .bottomBtns > .btnContainer.right > a#btnStep3Next').html('Exit');
            }

            $("div.btnEditNotes").show();

            self.handleFinalised();

            // Load the defect items for this inspection
            self.loadInspectionItems();

            self.setNoteButtonContentIndicators();

            $("#btnStep3DeleteInspection").unbind();
            $("#btnStep3DeleteInspection").bind(objApp.touchEvent, function(e) {
                if(confirm("Are you sure you wish to delete this inspection?")) {
                    var sql = "UPDATE inspections " +
                              "SET deleted = 1, dirty = 1 " +
                              "WHERE id = ?";

                    objDBUtils.execute(sql, [objApp.getKey("inspection_id")], null);

                    self.setupInspections();
                }
            });
            
            $("a.btnReinspect").bind(objApp.touchEvent, function(e) {
                self.startReinspection(objApp.getKey("inspection_id"));
            });


        }, inspection_id);
    }

    this.showStep4 = function()
    {
        self.setStep(4);
        $('.builder_need_4_steps').hide();
        $('.coral_homes').hide();
        if (self.need5Steps(self.inspection.report_type)){
            if (self.currentBuilderName() == 'Coral Homes'){
                $('.coral_homes').show();
            }
            objApp.setSubHeading("OMISSIONS (items installed at time of the inspection)");
        }else if(self.inspection.report_type == 'Builder: PCI/Final inspections'){
            var inspection_property = "Lot " + self.inspection.lot_no + ", " + self.inspection.address + ", " + self.inspection.suburb;
            objApp.setSubHeading("Inspection @ " + inspection_property);
        }else if(self.need4Steps(self.inspection.report_type)){
            $('.builder_need_4_steps').show();
            var inspection_property = "Lot " + self.inspection.lot_no + ", " + self.inspection.address + ", " + self.inspection.suburb;
            objApp.setSubHeading("Inspection @ " + inspection_property);
        }
        self.showStage(self.inspection.report_type);

        //if((self.inspection.report_type == "Builder: PCI/Final inspections" && objApp.keys.reinspection_id != "") || self.inspection.report_type == "Fix / Plaster Inspection") {
        if( (self.need5Steps(self.inspection.report_type) || self.need4Steps(self.inspection.report_type)) && objApp.keys.reinspection_id != "") {
            objApp.setSubExtraHeading("Step 4 of 4", true);
            $('#inspectionStep4 > .bottomBtns > .btnContainer.right > a#btnStep4Next').html('Exit');
        } else if(self.need4Steps(self.inspection.report_type) && objApp.keys.reinspection_id == "") {
            objApp.setSubExtraHeading("Step 4 of 4", true);
            $('#inspectionStep4 > .bottomBtns > .btnContainer.right > a#btnStep4Next').html('Exit');
        }else {
            objApp.setSubExtraHeading("Step 4 of 5", true);
            $('#inspectionStep4 > .bottomBtns > .btnContainer.right > a#btnStep4Next').html('Next');
        }

        if(objUtils.isMobileDevice())
        {
            self.scroller = new IScroll5('#installedItemsScrollWrapper', { click: true, hScrollbar: false, vScrollbar: false, scrollbarClass: 'myScrollbarSm'});
        }

        objApp.clearMain();

        if(objApp.keys.reinspection_id != "") {

            objDBUtils.loadRecord("reinspections", objApp.keys.reinspection_id, function(param, reinspection) {
                if(!reinspection) {
                    alert("Couldn't load the reinspection record!");
                    return;
                }
                self.setValueYesNoItems(reinspection);
            }, "");
        }
        else if(self.inspection) {
            self.setValueYesNoItems(self.inspection);
        } 


        $("#inspectionStep4").removeClass("hidden");

        self.setTableWidths2('tblRateListingHeader', 'tblRateListing', 2, 500);
        
    }

    this.showStep5 = function()
    {
        self.setStep(5);

        // Set the main heading
        var inspection_property = "Lot " + self.inspection.lot_no + ", " + self.inspection.address + ", " + self.inspection.suburb;
        objApp.setSubHeading("Overall Inspection @ " + inspection_property);
        objApp.setSubExtraHeading("Step 5 of 5", true);

        objApp.clearMain();

        if(self.inspection) {
            if(!objApp.empty(self.inspection.exterior_quality)) {
                $("#exterior_quality").val(self.inspection.exterior_quality);
            }
        }
        $("#inspectionStep5").removeClass("hidden");
        self.setTableWidths2('tblRateListingHeader', 'tblRateListing', 2, 500);
    }

    // Sets the default notes if no notes have been entered.
    this.setDefaultNotes = function()
    {
        // If the current note value is empty and if this is not a Builder: PCI/Final inspections,
        // set the default notes.
        if($("#inspection #notes").val() == "") {
            report_type = $("#inspection #report_type").val();

            if( self.need5Steps(report_type) || (report_type == "Fix / Plaster Inspection")) {
                $("#inspection #notes").val(self.default_notes);
            }
        }
    }

    this.showReinspection = function()
    {
        var text = "";
        // Load the inspection object
        objDBUtils.loadRecord("inspections", objApp.keys.inspection_id, function(inspection_id, inspection) {
            if(!inspection) {
                return;
            }
            else
            {
                text += "LOT" + inspection.lot_no + ". " +  inspection.address + ". " + inspection.suburb;
                objApp.setExtraHeading(text, true);
                if (inspection.failed == 1)
                {
                    $(".inspectionDetails .failed").addClass('active');
                }
                else
                {
                    $(".inspectionDetails .passed").addClass('active');
                }
            }



        }, inspection_id);


        this.handleFinalised();

        // Load the defect items for this inspection
		//self.loadReinspectionItems("");

    }
    this.doInspectionItemsSearch = function()
    {
        objApp.showHideSpinner(true, "#inspectionList");

		// Remove the triangle from the table header cells
		$("#tblDefectListingHeader th .triangle").remove();

		// Inject the triangle
		$("#tblDefectListingHeader th[class='" + self.sortBy + "']").append('<span class="triangle ' + self.sortDir + '"></span>');


		var sql = "SELECT i.*, c.name as client_name, s.address1 || ' ' || s.address2 as site_name " +
			"FROM inspections i " +
			"INNER JOIN clients c ON i.client_id = c.id " +
			"INNER JOIN sites s ON i.site_id = s.id " +
			"WHERE i.deleted = 0 ";

		var values = new Array();

	    sql += "ORDER BY " + self.itemSortBy + " " + self.itemSortDir + " ";	// Show the most recent inspections first.

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
                objApp.showHideSpinner(false, "#inspectionList");
				return;
            }

			var html = '<table id="tblInspectionListing" class="listing">';

			var maxLoop = items.rows.length;
			var r = 0;
			for(r = 0; r < maxLoop; r++)
			{
				var num_defects = 0;
			    var row = items.rows.item(r);
			    var inspDate = objApp.isoDateStrToDate(row.inspection_date);

			    html += '<tr rel="' + row.id + '">';
			    html += '<td><span class="icon';

			    if(row.finalised)
			    {
					html += ' finalised';
			    }

			    html += '"></span>';

			    html += objApp.formatUserDate(inspDate) + '</td>';
			    html += '<td>' + row.lot_no + ' ' + row.address + ' ' + row.suburb + ' ' + row.postcode + '</td>';
			    html += '<td><div class="i-passed">';
                if (row.failed == 0)
                    html += 'Failed<a href="#" class="failed"></a></div>';
                else
                    html += 'Passed<a href="#" class="passed"></a></div>';
                html += '</div></td>';
                html += '<td><div id="action">';
                if (row.failed == 0)
                    html += '<a href="#" id="action" class="failed">Reinspect</a>';
                else
                    html += '<a href="#" id="action" class="passed">View</a>';
                html += '</div></td>';
			    html += '</tr>';
			}

			html += '</table>';

/* 			Bind click event to list items
			$("#tblInspectionListing tr").bind("click", function(e)
			{
				e.preventDefault();

			    // Remove any active states of the list items
			    $(this).parent().parent().parent().find("td").removeClass("active");

			    // Set the active state
			    $(this).parent().parent().addClass("active");

			    // Get the id of the selected client
			    var inspection_id = $(this).attr("rel");

			    // Show the loading indicator
			    blockElement('body');

			    // Load the inspection in question
			    objDBUtils.loadRecord("inspections", inspection_id, function(inspection_id, row)
			    {
			    	unblockElement('body');

					if(row)
					{
						objApp.objInspection.editInspection(row);
					}

			    }, inspection_id);

			    return false;
			}); */

			$("#tblDefectListingHeader th").unbind();

			$("#tblDefectListingHeader th").bind(objApp.touchEvent, function(e)
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

				self.doInspectionItemsSearch();
			});

	    }, "");
    }

    /* end of new version section */

	/***
	* addNewInspection
	* Sets up the main screen area ready for adding a new inspection
	*/
	this.addNewInspection = function()
	{
		// Clear the main screen area
        objApp.clearKeys();
		objApp.clearMain();
        objApp.cleanup();
		self.inAudit = false;
		self.lastKeyPress = null;
        self.finalised = 0;
        $('#finalised').val(0);
        self.handleFinalised();
        self.setStep(1);
        self.numImgCurr = 0;
        self.inspection = false;

        // Clear reinspection keys
        self.reinspectionKey = "";
        objApp.keys.reinspection_id = "";

        $(".inspectionDetails #btnCapturePhoto .numImgCurr").text(self.numImgCurr);
        $('#frmInspectionDetails #lot_no').val('');
        $('#frmInspectionDetails #address').val('');
        $('#frmInspectionDetails #suburb').val('');
        $('#frmInspectionDetails #postcode').val('');
        $('#frmInspectionDetails #weather').val('');
        $('#frmInspectionDetails #client_info').val('');
        $('#frmInspectionDetails #persons_in_attendance').val('');

        // Hide the camera button until the inspection is created.
        $(".inspectionDetails #btnCapturePhoto").hide();

        // Hide the next button until the inspection is created.
        $(".inspectionDetails #btnStep1Next").hide();

        // By default an inspection should be set as failed.
        $("a#passed").removeClass('active');
        $("a#failed").addClass('active');

        // Make sure the coversheet notes button is hidden.
        $("div.btnEditNotes").hide();
        $("a.btnEditClientNotes").hide();
        $("a.btnEditPrivateNotes").hide();
        $("#inspection #includeclientnotesonreport").val("0");

		// Set the main heading
        objApp.setHeading("K-Spec Inspections");
        objApp.setSubHeading("Create a New Inspection");
        objApp.setSubExtraHeading("Step 1 of 3", true);

		// Set the new inspection button to be active
		objApp.setNavActive("#navNewInspection");

        $("#report_type2").trigger('change');
        if(!$("#inspection #btnDeleteInspection").hasClass("hidden"))
		{
			$("#inspection #btnDeleteInspection").addClass("hidden");
		}
        $("#inspection .report_type_options").val('');

        $("#inspection #inspection_no").val('');
		// Set the inspection date and start time to the current date and time

		// Visit Date
		var objDate = new Date();
		$("#inspection #inspection_date").val(objApp.formatUserDate(objDate));

		// Visit start
		$("#inspection #start").val(objTimePicker.getTimeStr(objDate));
        $("#inspection #startTimer").html(objTimePicker.getTimeStr(objDate));

		// Visit Finish
		$("#inspection #finish").val(objTimePicker.getTimeStr(objDate));

		var first_name = localStorage.getItem("first_name");
		var last_name = localStorage.getItem("last_name");
		var user_id = localStorage.getItem("user_id");
		var email = localStorage.getItem("email");
		var initials = localStorage.getItem("initials");
        if (typeof initials == 'undefined')
            initials = '';
		if((first_name == null) || (first_name == "") || (last_name == null) || (last_name == "") ||
			(email == null) || (email == "") || (user_id == null) || (user_id == "") )
		{
			alert("Sorry, there seems to be some critical data about you missing from your session.  Please login again.");
			objApp.objLogin.logout();
		}

		var inspector = first_name + " " + last_name;
		$("#inspection #inspectionInspector").val(inspector);
		$("#inspection #inspectionInspector").attr("readonly", "readonly");
		$("#inspection #initials").val(initials);

		$("#inspection #duration").val("0");
		$("#inspection #created_by").val(user_id);

        self.setNoteButtonContentIndicators();

		// Reset the toggle controls
		$("#toggles").html("");    // Clear the previous renderings out

		if(!$("#toggles").hasClass("hidden"))
		{
			// Reset the failed and finalised states
			$("#failed").val("1");  // All inspections start as failed
			$("#finalised").val("0"); // And not finalised.

			// Hide the toggles
			$("#toggles").addClass("hidden");
		}

        $("#inspectionStep4 #emailTo").val("");
        $("#inspection #notes").val("");

        self.setDefaultNotes();

		// Show the inspection screen.
		$("#inspection").removeClass("hidden");
		// Bind events to UI objects
        

		this.unbindEvents();
		// Setup client and site popselectors
		this.setupPopselectors();
        objApp.setBodyClass('inspection');
	}

    /**
    * Handle the event when the user wants to edit an existing inspection.
    */
	this.editInspection = function(inspection)
	{
	    console.log(inspection);
        // Set keys
        objApp.keys.inspection_id = inspection.id;
        objApp.keys.report_type = inspection.report_type;
        objApp.keys.builder_id = inspection.builder_id;
        objApp.keys.state = inspection.state;

		self.inAudit = false;
		self.lastKeyPress = null;
        self.isEditing = 1;
        self.inspection = inspection;

        // Clear reinspection related keys
        self.reinspectionKey = "";
        objApp.keys.reinspection_id = "";

        self.setStep(1);

		// Store the inspection_id into local storage, so if the user accidently leaves the app we can return here quickly
		self.setReturnInspectionID(inspection.id);

		// Check to see if the user is restricted
		self.restricted = localStorage.getItem("restricted");

		self.checkCanDelete();

		// Set the app context so we can warn the user about unfinalised inspections.
		objApp.context = "inspection";
        objApp.setBodyClass('inspection');

		if(objApp.keys.inspection_id == "")
			return;

		// Hide the filters panel
		objFilters.hide();

		// Clear the main screen area
		objApp.clearMain();

		// Set the main heading
		objApp.setSubHeading("Edit Inspection");

		objApp.setNavActive("#navNewInspection");

		// Set the inspection date and start time to the current date and time

		// Show the toggle objects
		$("#toggles").removeClass("hidden");

        $("#inspection #inspection_no").val(inspection.id);

		// Inspection Date
		var objDate = objApp.isoDateStrToDate(inspection.inspection_date);
		$("#inspection #inspection_date").val(objApp.formatUserDate(objDate));

		// Inspection start
		$("#inspection #start").val(inspection.start);
        $("#inspection #startTimer").html(inspection.start);

		// Inspection Finish
		$("#inspection #finish").val(inspection.finish);

		$("#inspection #finalised").val(inspection.finalised);
		$("#inspection #failed").val(inspection.failed);
		$("#inspection #initials").val(inspection.initials);
        
        $("#inspection #report_type").val(inspection.report_type);
        $("#inspection .report_type_options").hide();
        if (inspection.report_type.indexOf('Builder:') > -1) 
        {
            $("#inspection #report_type2").val("Builder inspection");
            $("#inspection #builder_report_type").show();
            $("#inspection #builder_report_type").val(inspection.report_type);
        }
        else if (inspection.report_type.indexOf('Client:') > -1) 
        {
            $("#inspection #report_type2").val("Client inspection");
            $("#inspection #client_report_type").show();
            $("#inspection #client_report_type").val(inspection.report_type);
        } 
        else
        {
            $("#inspection #report_type2").val("Builder inspection");
            $("#inspection #builder_report_type").show();
            $("#inspection #builder_report_type").val(inspection.report_type);
        }
        self.checkIfNeedPhotos();
        
        $("#inspection #weather").val(inspection.weather);
        $("#inspection #lot_no").val(inspection.lot_no);
        $("#inspection #address").val(inspection.address);
        $("#inspection #suburb").val(inspection.suburb);
        $("#inspection #postcode").val(inspection.postcode);
		$("#inspection #notes").val(inspection.notes);
        $("#inspection #client_info").val(inspection.client_info);
        $("#inspection #persons_in_attendance").val(inspection.persons_in_attendance);

        if (inspection.failed)
        {
            $(".inspectionDetails .failed").addClass('active');
            $(".inspectionDetails .passed").removeClass('active');
        }
        else
        {
            $(".inspectionDetails .failed").removeClass('active');
            $(".inspectionDetails .passed").addClass('active');
        }

        $("#inspection #certificated").val(inspection.certificated);
        if (inspection.certificated == 1){
            $('#btnCertificated').removeClass('hidden');
            $('#btnUncertificated').addClass('hidden');
        }else{
            $('#btnCertificated').addClass('hidden');
            $('#btnUncertificated').removeClass('hidden');
        }

        this.finalised = false;

        if(inspection.finalised == 1) {
            this.finalised = true;
        }

        this.handleFinalised();

		var first_name = localStorage.getItem("first_name");
		var last_name = localStorage.getItem("last_name");
		var user_id = localStorage.getItem("user_id");
		var email = localStorage.getItem("email");
		if((first_name == null) || (first_name == "") || (last_name == null) || (last_name == "") ||
			(email == null) || (email == "") || (user_id == null) || (user_id == ""))
		{
			alert("Sorry, there seems to be some critical data about you missing from your session.  Please login again.");
			objApp.objLogin.logout();
		}

		// TODO - we need to load the users table down so we can show the correct inspector name.
		var inspector = first_name + " " + last_name;
		$("#inspection #inspectionInspector").val(inspector);
		$("#inspection #inspectionInspector").attr("readonly", "readonly");

		$("#inspection #duration").val(inspection.duration);
		$("#inspection #created_by").val(inspection.created_by);

        $("#inspectionStep4 #emailTo").val("");

        self.setValueYesNoItems(inspection);

		// Show the inspection screen.
		$("#inspection").removeClass("hidden");

		// Bind events to UI objects
		this.unbindEvents();

		// Setup client and site popselectors
		this.setupPopselectors();

		// Load the defect items for this inspection
		self.loadInspectionItems();

        self.updateInspectionPhotoCount(inspection.id);

		// Show the Add Defect button.
		$("#btnAddDefect").removeClass("hidden");
                  
        self.setStep(3);
        self.showStep3();
	}

    /**
    * Updates the inspection photo count
    */
    this.updateInspectionPhotoCount = function(inspection_id)
    {
        var sql = "SELECT COUNT(*) as num_photos " +
            "FROM inspectionitemphotos " +
            "WHERE inspection_id = ? " +
            "AND deleted = 0";

        objDBUtils.loadRecordSQL(sql, [inspection_id], function(row) {
            if(!row) {
                alert("Coulnt' load inspection photo count");
            }

            $(".inspectionDetails #btnCapturePhoto div.numImgCurr").html(row.num_photos);

            self.numImgCurr = row.num_photos;
        });
    }

    this.setNoteButtonContentIndicators = function()
    {
        // If each note field has a value, add an asterix to the related button
        // caption to indicate a value.
        var noteFields = {};
        //noteFields["notes"] = "btnEditNotes";
        noteFields["privatenotes"] = "btnEditPrivateNotes";
        noteFields["clientnotes"] = "btnEditClientNotes";

        for(var key in noteFields) {
            var buttons = $(".inspectionDetails ." + noteFields[key]);
            var e = $("#inspection #" + key);
            var fieldVal = $(e).val();

            $(buttons).each(function() {
                var label = $(this).text();

                var firstChar = label.substring(0, 1);

                if(fieldVal != "") {
                    if(firstChar != "*") {
                        label = "*" + label;
                    }
                } else {
                    if(firstChar == "*") {
                        label = label.substring(1, label.length);
                    }
                }

                $(this).text(label);
            });
        }
    }

	/***
	* Initialises and loads the popselectors
	*/
	this.setupPopselectors = function()
	{
        // Load builders
		objDBUtils.primaryKey = "id";
		objDBUtils.showColumn = "name";
		objDBUtils.orderBy = "name ASC";

        self.objPopBuilders = $("#frmInspectionDetails #builder_id");

        self.objPopBuilders.bind('change', objApp.objInspection.handleBuilderChanged);
        self.objPopBuilders.html('');
        self.objPopBuilders.append('<option value="">Builder</option>');

        var filters = [];
        if (objApp.IS_STATE_FILTERED == 1)
            filters.push(new Array("state = '"+objApp.FILTERED_STATE_CODE+"'"));

        objDBUtils.loadSelect("builders", filters, "#inspection #builder_id", function()
		{
			// Builders have finished loading.  Preselect the client if we have a client_id.
			if(objApp.keys.builder_id != "")
			{
                self.objPopBuilders.val(objApp.keys.builder_id);
                self.objPopBuilders.trigger('change');
			}

            if (self.objPopBuilders.hasClass('select2-hidden-accessible'))
                self.objPopBuilders.select2('destroy');
            self.objPopBuilders.select2({dropdownParent: $("#inspection")});
		}, 'option');

        $('#frmInspectionDetails #state').bind('change', objApp.objInspection.handleStateChanged);
        $('#frmInspectionDetails #state').val(objApp.keys.state);
        $('#frmInspectionDetails #state').trigger('change');
	}

    this.loadAddressBookList = function(callback)
    {
        var sql = "SELECT * FROM address_book WHERE deleted = 0 GROUP BY email ORDER BY email ASC";

        var values = new Array();
        
        // Kill iScroll if it already exists
        if(self.scroller) {
            self.scroller.destroy();
            self.scroller = null;
        }        

        objDBUtils.loadRecordsSQL(sql, values, function(param, emails)
        {
            if(emails) {
                // Build the HTML for the email listing
                var html = '';

                var maxLoop = emails.rows.length;
                var r = 0;
                var addressOptions = [];
                
                
                // Loop through all of the emails in the recordset.
                for(r = 0; r < maxLoop; r++)
                {
                    // Get the current row
                    var row = emails.rows.item(r);
                    var email = row.email.trim();                   
                    
                    if(objApp.validateEmail(email)) {
                        //html += '<li><input type="checkbox" id="' + row.id + '" value="' + row.id + '">';
                        //html += '<label for="' + row.id + '">' + row.email + '</label></li>';        
                        email_options[row.id] = email;                 
                    }
                }

                // Insert the HTML into the scrolling wrapper.
               // $("#emailList").html(html);

                
                setTimeout(function()
                {
                    if(objUtils.isMobileDevice())
                    {
                        self.scroller = new IScroll('#emailListWrapper', { click: true, hScrollbar: false, vScrollbar: false, scrollbarClass: 'myScrollbar', useTransform: true, zoom: false, onBeforeScrollStart: function (e) {
                            var target = e.target;
                            while (target.nodeType != 1) target = target.parentNode;
                            if (target.tagName != 'SELECT' && target.tagName != 'INPUT' && target.tagName != 'TEXTAREA')
                                e.preventDefault();
                            }}
                        );                        
                        
                    }
                    
                    if(callback != undefined) {
                        callback();
                    }
                }, 500);
            }

        }, "");
    }

	/***
	* handleBuilderChanged is called when the user changes the selected
	* builder.
	*/
	this.handleBuilderChanged = function()
	{
	    if (self.currentBuilderName($("#frmInspectionDetails #builder_id").val()) == 'Coral Homes'){
	        $('.coral_job_number').show();
        }else{
            $('.coral_job_number').hide();
        }
		// Save the inspection if possible
		self.checkSaveInspection();
	}

    /***
	* handleBuilderChanged is called when the user changes the selected
	* builder.
	*/
	this.handleStateChanged = function()
	{
		// Save the inspection if possible
		self.checkSaveInspection();
	}

    this.createDatepicker = function(){
        var objDate = objApp.userDateStrToDate($("#inspection #inspection_date").val());
        if (self.glDatePicker){
            $.extend(self.glDatePicker.options,
            {
                selectedDate: objDate,
                firstDate: (new Date(objDate)._first())
            });
            self.glDatePicker.render();
            // self.glDatePicker.show();
        }else{
            self.glDatePicker = $('#inspection #inspection_date').glDatePicker({
                cssName: 'flatwhite',
                selectedDate: objDate,

                onClick: (function(el, cell, date, data) {
                    el.val(objApp.formatUserDate(date));
                    objApp.objInspection.checkSaveInspection();
        		}),
                onBeforeClick: (function(el, cell) {
                    if ($("#finalised").val() == 1)
                    {
                        alert("Sorry, you may not change this value.");
                        return false;
                    }
                    return true;
        		})
            }).glDatePicker(true);
        }
    }

    this.unbindEvents = function()
    {
        // Unbind any previously bound events.
		$("#btnAddDefect").unbind();
		$("#inspection #inspection_date").unbind();
		$("#frmDefectDetails #observation").unbind();
		//$("#inspection #start").unbind();
		//$("#inspection #finish").unbind();
		$("#btnDeleteInspection").unbind();
		$("#frmDefectDetails #notes").unbind();
		$("#print").unbind();
        $(".inspectionDetails .preview").unbind();
        $(".inspectionDetails .finished").unbind();
        $(".inspectionDetails .passed, .inspectionDetails .failed").unbind();
        $(".inspectionDetails #keywords").unbind();
        $(".inspectionDetails #tblDefectListingHeader th").unbind();
        $(".inspectionDetails .gotoStep3").unbind();
        $(".inspectionDetails .gotoStep2").unbind();
        $(".inspectionDetails .gotoStep1").unbind();
        $(".inspectionDetails #btnStep3Next").unbind();
        $(".inspectionDetails #btnStep2Next").unbind();
        $(".inspectionDetails #btnStep1Next").unbind();
        $(".inspectionDetails .addSite").unbind();
        $(".inspectionDetails .addClient").unbind();
        $(".inspectionDetails .itemtype").unbind();
        $(".inspectionDetails .btnEditNotes").unbind();
        $(".inspectionDetails .btnEditClientNotes").unbind();
        $(".inspectionDetails .btnEditPrivateNotes").unbind();
        $(".inspectionDetails #addPhoto-wrapper #addPhoto-btn").unbind();
        $(".inspectionDetails #addPhoto-wrapper #addPhotoFromGallery").unbind();
        $(".inspectionDetails #btnCapturePhoto").unbind();
        $("#tblInspectionListing a.action").unbind();
        $('#inspectionList .btnContainer a#passed').unbind();
        $('#inspectionList .btnContainer a#failed').unbind();
        $(".inspectionDetails a#failed").unbind();
        $(".inspectionDetails a#passed").unbind();
        $("#historyReinspection td a.action").unbind();
        $("#inspection #report_type").unbind();
        $('#reportComments').unbind();
        $(".inspectionDetails #btnStep4Next").unbind();
        $("#reinspection a.passed").unbind();
        $("#reinspection a.failed").unbind();
        $('#reinspection select#rectified').unbind();
        $("#btnReportPhotos").unbind();
        $("#frmEmailTo").unbind();
        $("a.sendEmailButton").unbind();
        $("a.btnViewChart").unbind();
        $("#report_type").unbind();
        $(".report_type_options").unbind();
        $('#frmDefectDetails #observation').unbind();
        $("#inspectionList #btnAddInspection").unbind();
        $("#btnSendReport,#btnSendReport2,#btnSendReport3").unbind();
        $("select[name='builder_id']").unbind();
        
        setTimeout(function() {
            self.bindEvents();
        }, 500)
    }

	/***
	* bindEvents captures the touch events for the date and time objects
	* and handles them accordingly.
	*/
	this.bindEvents = function()
	{
        // show photoImage to photoList
        if (objApp.keys.inspection_id == "")
        {
            $('#btnCapturePhoto').removeAttr('data-reveal-id');
        }
        else
        {
            $('#btnCapturePhoto').attr('data-reveal-id', 'photoWrapper');
        }

        /* Send Email Form Events */
        $("a.sendEmailButton").bind(objApp.touchEvent, function(e) {
            e.preventDefault();

            self.loadAddressBookList();

            self.resolveEmailReportRecipients();
        });
        

        $('#inspectionList .btnContainer a#passed').bind(objApp.touchEvent, function() {
            if (!$(this).hasClass("active"))
            {
                $(this).parent().parent().find("a#failed.active").removeClass("active");
                $(this).addClass("active");
                self.doInspectionSearch();
            }
        });
        
        $('#inspectionList .btnContainer a#failed').bind(objApp.touchEvent, function() {
            if (!$(this).hasClass("active"))
            {
                $(this).parent().parent().find("a#passed.active").removeClass("active");
                $(this).addClass("active");
                self.doInspectionSearch();
            } 
        });
        
        $("#doInspectionSearch").bind(objApp.touchEvent, function() {
            self.doInspectionSearch();
        });

        $("#inspectionList #il_builder_id").change(function(){
            self.doInspectionSearch();
            return true;
        });

        $("#inspectionList #is_finalised").change(function(){
            self.doInspectionSearch();
        });
        
        $("#inspectionList #btnAddInspection").bind(objApp.touchEvent, function()
        {
             objApp.cleanup();
             self.setReturnInspectionID("");
             self.addNewInspection(); 
             objApp.context = "inspection";
            objApp.setBodyClass('inspection');
             return false;
        });                  

        $("#frmEmailTo").submit(function(e) {
            e.preventDefault();

            // Ensure recipients for the report are defined
            var recipients = $("#emailTo").val();
            if(objApp.empty(recipients)) {
                self.resolveEmailReportRecipients();

                alert("Please enter a recipient email address");
                return;
            }

            // Also ensure we have a valid inspection ID
            var inspection_id = objApp.getKey("inspection_id");
            if(objApp.empty(inspection_id)) {
                alert("Invalid inspection ID");
                return;
            }

            var reinspection_id = objApp.getKey("reinspection_id");

            blockElement('body');

            // Load the inspection record
            objDBUtils.loadRecord("inspections", inspection_id, function(param, inspection) {
                if(!inspection) {
                    alert("Error: Couldn't load inspection!");
                    return;
                }
                
                var recipientsArr = recipients.split(",");
                for ( var i=0; i < recipientsArr.length; i++) {
                    var rec = recipientsArr[i].toLowerCase().trim(" ");

                    var values = [rec];
                    // Make sure this email doesn't already exist
                    var sql = "SELECT * " +
                        "FROM address_book " +
                        "WHERE email = ? " +
                        "AND deleted = 0";


                    objDBUtils.loadRecordSQL2(sql, values, function(resource, email)
                    {
                        if(!resource)
                        {
                            var primaryKey = objDBUtils.makeInsertKey(objApp.sync_prefix);

                            var sql = "INSERT INTO " +
                                "address_book(id, email) " +
                                "VALUES(?,?)";
                            var values = [primaryKey, email];

                            objDBUtils.execute(sql, values, function(){});
                        }
                    }, rec);
                }
                
                self.loadAddressBookList();
                

                // Do a silent sync operation
                objApp.objSync.startSyncSilent(function(success) {
                    
                    if(!success) {
                        unblockElement('body');
                        alert("Sorry, a problem occurred whilst syncing your data to the server");
                        return;
                    }

                    // Invoke the API method to send the report
                    var address = self.buildInspectionAddress(inspection);
                    var user_email = localStorage.getItem("email");
                    var params = {};
                    params["email"] = user_email;
                    params['password'] = localStorage.getItem("password");
                    params['version'] = objApp.version;
                    params["subject"] = inspection.report_type + " at " + address;
                    params["recipients"] = recipients;
                    params["from"] = user_email;
                    params["inspectionid"] = inspection_id;
                    params["reinspectionid"] = reinspection_id;
                    params["attach_inspection_images"] = $('#frmEmailTo #attach_inspection_images').is(":checked")?1:0;
                    params["message"] = "Please find attached the " + inspection.report_type + " inspection report for " + address;
                    params["chart_image"] = $('#chart_image').val();
                    params["dummy"] = 'Here is dummy text. Post data will be cut off a part. This will fix that issue.';
                    $.post(objApp.apiURL + "reports/send_inspection_report", params, function(response) {
                        
                        unblockElement('body');
                        
                        var data = JSON.parse(response);

                        if(data.status != "OK") {
                            alert(data.message);
                            return;
                        }
                        removeChartFromQueue(inspection_id);
                        alert("The inspection was sent successfully");

                        // Hide the reveal window.
                        revealWindow.hideModal();

                    }, "").fail(function() {
                        alert( "error" );
                    })
                });


            }, "");
        });


        $("#frmEmailAdressBooks").submit(function(e) {
            e.preventDefault();

            // Ensure we have a valid email
            var newEmail = $("#newEmail").val();
            if(objApp.empty(newEmail)) {

                alert("Please enter a valid email address");
                return;
            }

            // Also ensure we have a valid inspection ID
            var inspection_id = objApp.getKey("inspection_id");
            if(objApp.empty(inspection_id)) {
                alert("Invalid inspection ID");
                return;
            }

            var reinspection_id = objApp.getKey("reinspection_id");

            blockElement('body');

            // Load the inspection record
            objDBUtils.loadRecord("inspections", inspection_id, function(param, inspection) {
                if(!inspection) {
                    alert("Error: Couldn't load inspection!");
                    return;
                }

                var values = [newEmail];

                // Make sure this email doesn't already exist
                var sql = "SELECT * " +
                    "FROM address_book " +
                    "WHERE email = ? " +
                    "AND deleted = 0";

                objDBUtils.loadRecordSQL2(sql, values, function(resource, email)
                {
                    if(!resource)
                    {
                        var primaryKey = objDBUtils.makeInsertKey(objApp.sync_prefix);

                        var sql = "INSERT INTO " +
                            "address_book(id, email) " +
                            "VALUES(?,?)";
                        var values = [primaryKey, email];

                        objDBUtils.execute(sql, values, function(){
                            unblockElement('body');
                            self.loadAddressBookList(function(){
                                $('#' + primaryKey).prop('checked', true);
                                self.resolveEmailReportRecipients();
                            });
                        });
                    }
                }, newEmail);


            }, "");
        });
        
        $("#inspection #report_type2").change(function() 
        {
            $("#inspection .report_type_options").hide();
            
            if($(this).val() == "Builder inspection")
            {
                $("#inspection #report_type2").val("Builder inspection");
                $("#inspection #builder_report_type").show();
                $("#inspection #builder_report_type").val('');
                $("#inspection #builder_report_type").trigger('change');
            }
            else if($(this).val() == "Client inspection")
            {
                $("#inspection #report_type2").val("Client inspection");
                $("#inspection #client_report_type").show();
                $("#inspection #client_report_type").val('');
                $("#inspection #client_report_type").trigger('change');
            } 
            else
            {
                $("#inspection #report_type2").val("Builder inspection");
                $("#inspection #builder_report_type").show();
                $("#inspection #builder_report_type").val('');
                $("#inspection #builder_report_type").trigger('change');
            }
            self.checkIfNeedPhotos();
        });

        $(".report_type_options").change(function() {
                        
            selected_report_type = $(this).val();
            $("#inspection #report_type").val(selected_report_type);  
        });
        
        $(".inspectionDetails #btnCapturePhoto").bind(objApp.touchEvent, function(e)
		{
            e.preventDefault();
            if (objApp.keys.inspection_id == "")
            {
                alert("Please create new inspection");
                return;
            }
            self.loadPhotos();
        });

            // Handle the event when the user wants to take a photo.
        $(".inspectionDetails #addPhoto-wrapper #addPhoto-btn, #addPhotoFromGallery").bind(objApp.touchEvent, function(e)
		{
            e.preventDefault();
           // The user may NOT add photos to a finalised inspection.
            if(self.finalised == 1) {
                alert("Sorry, this inspection has been finalised.  If you wish to add more photos, please un-finalise the inspection first");
                return;
            }
			self.current_table = "inspectionitemphotos";
			self.current_key = "inspection_id";

            if(!objApp.empty(objApp.getKey("reinspection_id"))) {
                self.current_table = "reinspectionitemphotos";
                self.current_key = "reinspection_id";
            }

			// Get the current maximum photo sequence number for this inspection item
			var sql = "SELECT MAX(seq_no) as seq_no " +
				"FROM " + self.current_table + " " +
				"WHERE " + self.current_key + " = ? " +
				"AND deleted = 0";
			objDBUtils.loadRecordSQL(sql, [objApp.getKey(self.current_key)], function(row)
			{
				var seq_no = 1;  // Default sequence number to 1.

				if(row)
				{
					seq_no = row.seq_no;

					if((seq_no == null) || (seq_no == 0))
					{
						seq_no = 0;
					}

					seq_no += 1;
				}
				var editPhoto2 = function(photoData)
				{
					// Setup a new image object, using the photo data as the image source
					objImage = new Image();

                    if(!objApp.phonegapBuild)
                    {
					    objImage.src = 'data:image/jpeg;base64,' + photoData;
                    }
                    else
                    {
					    objImage.src = photoData;
                    }

					//notes = "";

					// When the image has loaded, setup the image marker object
					objImage.onload = function()
					{
 						// Resize the image so it's 600px wide
						objResizer = new imageResizer(objImage);
						var imageData = objResizer.resize(600);


 						// Create a thumbnail version of the image
						objImage = new Image();
						objImage.src = 'data:image/jpeg;base64,' + imageData;

						objImage.onload = function()
						{
							objResizer = new imageResizer(objImage);
							var thumbData = objResizer.resize(90);

							// Save both the thumbnail and the full version to the local file system.
							var fail = function(error)
							{
								alert("storePhotosOnFS::Caught error: " + error.code);
							}

                            // Make sure the current inspection id is valid - there seems to be a bug sometimes when the id is corrupted

							var check_table = "inspections";
							if(self.current_table == "reinspectionitemphotos") {
								check_table = "reinspections";
                            }

							objDBUtils.loadRecord(check_table, objApp.getKey(self.current_key), function(param, row)
                            {
                                if(!row)
                                {
                                    alert("The current inspection id is NOT valid");
                                    return;
                                }

                                user_id = localStorage.getItem("user_id");
                                var new_id = objDBUtils.makeInsertKey(objApp.sync_prefix);
                                var notes = "";

                                if(!objApp.phonegapBuild)
                                {
                                    // Save the image data and notes back to the database
                                    var sql = "INSERT INTO " + self.current_table + "(id, " + self.current_key + ", seq_no, photodata_tmb, photodata, notes, created_by, dirty) " +
                                        "VALUES(?, ?, ?, ?, ?, ?, ?, ?)";

                                    var values = [new_id, objApp.getKey(self.current_key), seq_no, thumbData, imageData, notes, user_id, "1"];

                                    objDBUtils.execute(sql, values, function()
                                    {
                                        // The photo was saved.
                                        // Reload the photos
                                        self.loadPhotos();
                                    });
                                }
                                else
                                {
                                    // Phonegap build - save the images to the file system
                                    // Request access to the file system
                                    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem)
                                    {
                                        var file_name = new_id + "_thumb.jpg";
                                        // Get permission to write the file
                                        fileSystem.root.getFile(file_name, {create: true, exclusive: false}, function(fileEntry)
                                        {
                                            // Create the file write object
                                            fileEntry.createWriter(function(writer)
                                            {
                                                writer.onwriteend = function(evt)
                                                {
                                                    // Get the file URI for the thumbnail image
                                                    var uri_thumb = fileEntry.toURI();

                                                    // Now write the full image to the file system
                                                    var file_name = new_id + ".jpg";

                                                    fileSystem.root.getFile(file_name, {create: true, exclusive: false}, function(fileEntry)
                                                    {
                                                        // Create the file write object
                                                        fileEntry.createWriter(function(writer)
                                                        {
                                                            writer.onwriteend = function(evt)
                                                            {
                                                                // Get the file URI for the thumbnail image
                                                                var uri = fileEntry.toURI();

                                                                // Save the image data and notes back to the database
                                                                var sql = "INSERT INTO " + self.current_table + "(id, " + self.current_key + ", seq_no, photodata_tmb, photodata, notes, created_by, dirty) " +
                                                                    "VALUES(?, ?, ?, ?, ?, ?, ?, ?)";

                                                                var values = [new_id, objApp.getKey(self.current_key), seq_no, uri_thumb, uri, notes, user_id, "1"];

                                                                objDBUtils.execute(sql, values, function()
                                                                {
                                                                    // The photo was saved.
                                                                    // Reload the photos
                                                                    self.loadPhotos();
                                                                });

                                                            };

                                                            writer.write(imageData);

                                                        }, fail);

                                                    }, fail);

                                                };

                                                // Write the thumbnail data to the file.
                                                writer.write(thumbData);

                                            }, fail);

                                        }, fail);

                                    }, fail);
                                }

 							}, function(t){}, "", self.finalised);
						}
					}
				}
                if(e.target.id=='addPhoto-btn'){
                    if(objApp.phonegapBuild)
                    {
                        var use_image = 0;
                        // Invoke the camera API to allow the user to take a photo
                        var photo =function(){
                            var options = { limit: 1 };
                            navigator.device.capture.captureImage(onSuccess, onFail, options)
                            };

                        photo();
                        function onSuccess(imageData) {
                            var i, path, len;
                           for (i = 0, len = imageData.length; i < len; i += 1) {
                            var imageData1 = imageData[i].fullPath;
                                editPhoto2(imageData1);
                                //photo();
                                use_image = 1;
                            }
                        }

                        function onFail(message) {
                            if (!use_image)
                                alert('No captured image');
                        }

                    }
                    else
                    {
                        var imageData = "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";
                        editPhoto2(imageData);
                    }
                }
                if(e.target.id=='addPhotoFromGallery'){

                    if(objApp.phonegapBuild)
                    {
                        // Invoke the camera API to allow the user to take a photo
                        navigator.camera.getPicture(function(imageData)
                            {
                                // The image data will be a ele URI
                                // Show the photo in the image editor.
                                editPhoto2(imageData);

                            }, function(message)
                            {
                                alert("Image load failed because: " + message);
                            },
                            {
                                quality: 50,
                                destinationType: Camera.DestinationType.FILE_URI,
                                sourceType : Camera.PictureSourceType.PHOTOLIBRARY,
                                correctOrientation: true
                            });
                    }
                    else
                    {
                        var imageData = "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";
                        editPhoto2(imageData);
                    }

                }

			});
		});

        $("#btnDone.close-reveal-modal").bind(objApp.touchEvent, function(e) {
            revealWindow.hideModal();
        });

		// Figure out if this inspection is currently finalised or not.
		self.finalised = $("#frmInspectionDetails #finalised").val();

		// make sure we scroll back down after the user has finished typing.
		$("#frmDefectDetails #notes").bind("blur", function()
		{
			objApp.scrollTop();
		});

        self.createDatepicker();

        $(".inspectionDetails #btnStep1Next").bind(objApp.touchEvent, function(e) {
			e.preventDefault();

            if ($('#frmInspectionDetails #report_type').val() == "") {
                alert("Please select a report type");
                return;
            }

            if(self.objPopBuilders.val() == "") {
                alert("Please select a builder");
                return;
            }

            if ($('#frmInspectionDetails #weather').val() == "") {
                alert("Please enter weather conditions");
                return;
            }

            if ($('#frmInspectionDetails #lot_no').val() == "") {
                alert("Please input a lot_no");
                return;
            }

            if ($('#frmInspectionDetails #address').val() == "") {
                alert("Please input a address");
                return;
            }

            if ($('#frmInspectionDetails #suburb').val() == "") {
                alert("Please input a suburb");
                return;
            }

            if ($('#frmInspectionDetails #postcode').val() == "") {
                alert("Please input a postcode");
                return;
            }

            if($('#frmInspectionDetails #state').val() == "") {
                alert("Please select a state");
                return;
            }

            self.showStep2();
			return false;
		});

        /**
        * Handle the event when the user hits the NExt button on the stage 2 event tracking
        */
        $(".inspectionDetails #btnStep2Next").bind(objApp.touchEvent, function(e) {
            // If the user has attempted to add a new defect, ensure they have entered an observation
            // and then save the defect.  If no location is selected, just go straight to the next item.
            var currentLocation = self.objPopLocation.getValue();
            if(currentLocation == "") {
                // No location selected, go straight to step 3.
                self.showStep3();
                return;    
            }
            
            if($('#observation').val().trim()==''){
               alert('Please insert the observation');
               return;
            }

			e.preventDefault();

            self.saveDefect(function() {

                // Update the finish time of the audit
                var objDate = new Date();
                var objTimePicker = new Timepicker();
                $("#inspection #finish").val(objTimePicker.getTimeStr(objDate));

                blockElement('body');

                self.checkSaveInspection();
                // self.loadInspectionItems();
                self.loadPhotos();

                // Get the number of defects associated with this inspection
                var sql = "SELECT COUNT(*) as num_defects " +
                    "FROM inspectionitems " +
                    "WHERE inspection_id = ? AND deleted = 0";

                objDBUtils.loadRecordSQL(sql, [objApp.keys.inspection_id], function(row)
                {
                    if(row)
                    {
                        // Now update the parent inspection record with the defect count.
                        var num_defects = row.num_defects;

                        sql = "UPDATE inspections " +
                            "SET num_defects = ? " +
                            "WHERE id = ?";

                        objDBUtils.execute(sql, [num_defects, objApp.keys.inspection_id], function()
                        {
                            unblockElement('body');
                            self.doingSave = false;

                            self.showStep3();
                        });
                    }
                });

            });



			return false;
		});

        $(".inspectionDetails #btnStep3Next").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();

            //if((objApp.keys.report_type == 'Builder: PCI/Final inspections') || (objApp.keys.report_type == 'Fix / Plaster Inspection')) {
            if(self.need4Steps(objApp.keys.report_type) || self.need5Steps(objApp.keys.report_type)) {
                self.showStep4();
            }
            else {
                objApp.cleanup();

                self.setReturnInspectionID("");

                self.setupInspections();
                objApp.context = "inspections";
                objApp.setBodyClass('inspections');
            }

			return false;
		});

        $(".inspectionDetails #btnStep4Back").unbind(objApp.touchEvent);
        $(".inspectionDetails #btnStep4Back").bind(objApp.touchEvent, function(e)
        {
            if(objApp.keys.reinspection_id != "") {
                var sql = 'UPDATE reinspections SET ';
                var values = [];
                for(var i = 1; i <= self.TOTAL_OMISSIONS_ITEMS; i++) {
                    sql += 'omission_item_' + i + '= ?,';
                    values.push($("#omission_item_" + i).val());
                }
                for(var i in self.YES_NO_FIELDS){
                    sql += self.YES_NO_FIELDS[i] + '= ?,';
                    values.push($("#" + self.YES_NO_FIELDS[i]).val());
                }
                sql += ' dirty = 1 WHERE id = ?';
                values.push(objApp.keys.reinspection_id);

                objDBUtils.execute(sql, values, null);
            }
            else {
                self.checkSaveInspection();
            }
        });

        $(".inspectionDetails #btnStep4Next").unbind(objApp.touchEvent);
        $(".inspectionDetails #btnStep4Next").bind(objApp.touchEvent, function(e)
        {
            if(objApp.keys.reinspection_id != "") {
                var sql = 'UPDATE reinspections SET ';
                var values = [];
                for(var i = 1; i <= self.TOTAL_OMISSIONS_ITEMS; i++) {
                    sql += 'omission_item_' + i + '= ?,';
                    values.push($("#omission_item_" + i).val());
                }
                for(var i in self.YES_NO_FIELDS){
                    sql += self.YES_NO_FIELDS[i] + '= ?,';
                    values.push($("#" + self.YES_NO_FIELDS[i]).val());
                }
                sql += ' dirty = 1 WHERE id = ?';
                values.push(objApp.keys.reinspection_id);

                objDBUtils.execute(sql, values, null);
            }
            else {
                self.checkSaveInspection();
            }

            e.preventDefault();
            if( self.need5Steps(objApp.keys.report_type) && objApp.keys.reinspection_id == "") {
                self.showStep5();
            }
            else {
                objApp.cleanup();

                self.setReturnInspectionID("");

                self.setupInspections();
                objApp.context = "inspections";
                objApp.setBodyClass('inspections');
            }

            return false;
        });

        // Handle the event when the user clicks on the next button from Step 4
        $(".inspectionDetails #btnStep5Next").bind(objApp.touchEvent, function(e) {
			e.preventDefault();

            objApp.cleanup();
            self.setReturnInspectionID("");

            self.setupInspections();
            objApp.context = "inspections";
            objApp.setBodyClass('inspections');
			return false;
		});

        $(".inspectionDetails .gotoStep1").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
            self.showStep1();
			return false;
		});

        $(".inspectionDetails .gotoStep2").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
            self.showStep2();
			return false;
		});

        $(".inspectionDetails .gotoStep3").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
            self.showStep3();
			return false;
		});

        $(".inspectionDetails .gotoStep4").bind(objApp.touchEvent, function(e)
        {
            e.preventDefault();
            self.showStep4();
            return false;
        });

        self.bindYesNoButtons();

        $(".inspectionDetails #tblDefectListingHeader th").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();

			var newSortBy = $(this).attr("class");

			if(self.itemSortBy == newSortBy)
			{
				if(self.itemSortDir == "ASC")
				{
					self.itemSortDir = "DESC";
				}
				else
				{
					self.itemSortDir = "ASC";
				}
			}
			else
			{
				self.itemSortDir = "ASC";
			}

			self.itemSortBy = newSortBy;

			self.loadInspectionItems();
		});

        $(".inspectionDetails #keywords").bind("keyup", function(){
            self.loadInspectionItems();
        });

        $(".inspectionDetails #keywords").bind("blur", function(){
            objApp.scrollTop();
        });

        $(".inspectionDetails .passed, .inspectionDetails .failed").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();

            if (self.finalised == 1) {
                return false;
            }

            if ($(this).hasClass('active')) {
                return false;
            }
            else
            {
                $(this).addClass('active');

                if ($(this).hasClass('passed'))
                {
                    $(".inspectionDetails .failed").removeClass('active');
                    $("#failed").val("0");
                }
                else
                {
                    $(".inspectionDetails .passed").removeClass('active');
                    $("#failed").val("1");
                }
            }
            return false;
        });

        $(".inspectionDetails .finished").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();

            if ($(this).hasClass('active')) {
                // The inspection is NOT finalised.
                $("#finalised").val(0);
                self.finalised = 0;
                self.handleFinalised();
            }
            else
            {
                $("#finalised").val(1);
                self.finalised = 1;
                self.handleFinalised();
            }

			// Update the finish time of the audit
			var objDate = new Date();
			var objTimePicker = new Timepicker();
			$("#inspection #finish").val(objTimePicker.getTimeStr(objDate));

			objApp.objInspection.checkSaveInspection();

			setTimeout(function()
			{
				objApp.objInspection.loadInspectionItems();
			}, 500);
            return false;

        });

        $(".inspectionDetails #btnCertificated").unbind(objApp.touchEvent);
        $(".inspectionDetails #btnCertificated").bind(objApp.touchEvent, function(e)
        {
            e.preventDefault();
            self.handleCertificated();
            return false;
        });

        $(".inspectionDetails #btnUncertificated").unbind(objApp.touchEvent);
        $(".inspectionDetails #btnUncertificated").bind(objApp.touchEvent, function(e)
        {
            e.preventDefault();
            self.handleCertificated();
            return false;
        });

        $(".inspectionDetails .preview").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();

			// Show the loader graphic
			blockElement('body');

			objApp.objSync.startSyncSilent(function(success)
			{
				if(success)
				{
					// The silent sync has completed successfully.
					// We can now launch the report.
					unblockElement('body');

                    // Create a token
                    var params = {};
                    params["email"] = localStorage.getItem("email");
                    params["password"] = localStorage.getItem("password");
                    params['version'] = objApp.version;
                    var url = objApp.apiURL + "account/create_token/" + Math.floor(Math.random() * 99999);
                    blockElement('body');
                    
                    $.post(url, params, function(data)
                    {
                        unblockElement('body');

                        try {
                            data = jQuery.parseJSON(data);

                            if(data.status != "OK")
                            {
                                alert("Unable to create access token");
                                return;
                            }

                            var token = data.message;
                            var report_type = objApp.keys.report_type.trim();

                            if(report_type == "Fix / Plaster Inspection") {
                                report_type = "Fix";
                            } else {
                                report_type = report_type.replace(/ /g, "_").trim();
                                report_type = report_type.replace(/ /g, "%20").trim();
                                report_type = report_type.replace("/", "-dash-")
                            }

                            var downloadURL = objApp.apiURL + "reports/print_report/" + report_type + '/' + encodeURIComponent(objApp.keys.inspection_id) + '/' + encodeURIComponent(objApp.keys.reinspection_id) + "?token=" + token;
                            if(objApp.phonegapBuild) {
                                downloadURL = "https://docs.google.com/viewer?url=" + encodeURIComponent(downloadURL) + '&embedded=true';
                                var ref = window.open(downloadURL, '_blank', 'location=yes');
                            } else {
                                $.download(downloadURL, [], "post");
                            }

                        } catch (e) {
                            // error
                            alert("Sorry, something went wrong whilst trying to preview the report.");
                            return;
                        }
                    }, "");
				}
				else
				{
					unblockElement('body');
					alert("Sorry, something went wrong whilst syncing your data back to the K-Spec server.  Please try again later.");
				}
			});
		});

        $(".historySection #viewHistory").bind(objApp.touchEvent, function(e)
        {
            e.preventDefault();
            self.showHistoryModal();
        });

        $('#reportComments').bind('blur', function(){
            objApp.scrollTop();
            $("#inspection #notes").val($(this).val());
            objApp.objInspection.checkSaveInspection();
        });

        $('.btnEditNotes').bind(objApp.touchEvent, function(e){
            e.preventDefault();

            if (objApp.keys.inspection_id == "") {
                alert("Please create new inspection");
                return;
            }

            // If the current note value is empty and if this is not a Builder: PCI/Final inspections,
            // set the default notes.
            self.setDefaultNotes();

            if (objApp.keys.reinspection_id == "") {
                var objNoteModal = new noteModal("Coversheet Notes", $("#inspection #notes").val(), function(notes) {
                    // The user has updated the notes value.
                    // Update the toggle (and therefore the form) with the new value.
                    $("#inspection #notes").val(notes);
                    self.setNoteButtonContentIndicators();

                    if (objApp.keys.reinspection_id != "") {
                        var sql = 'UPDATE reinspections SET notes = ?, dirty = 1 WHERE id = ?';
                        objDBUtils.execute(sql, [notes, objApp.keys.reinspection_id], null);
                    }
                    else if(objApp.keys.inspection_id != "")
                    {
                        var sql = 'UPDATE inspections SET notes = ?, dirty = 1 WHERE id = ?';
                        objDBUtils.execute(sql, [notes, objApp.keys.inspection_id], null);
                    }
                });
            }
			objNoteModal.show();

			if(self.finalised == 1)
			{
				objNoteModal.setReadOnly();
			}
        });

        $('.btnEditClientNotes').bind(objApp.touchEvent, function(e){
            e.preventDefault();
            var objNoteModal = new noteModal("Client Comments", $("#inspection #clientnotes").val(), function(notes)
            {
                // The user has updated the notes value.
                // Update the toggle (and therefore the form) with the new value.
                $("#inspection #clientnotes").val(notes);
                self.setNoteButtonContentIndicators();
                objApp.objInspection.checkSaveInspection();
            });

            objNoteModal.setShowRecipients(true);
            objNoteModal.setIncludeOnReportSelector("#includeclientnotesonreport");

            objNoteModal.show();

            if(self.finalised == 1)
            {
                objNoteModal.setReadOnly();
            }
        });


        $('#frmInspectionDetails #lot_no').change(function(){
            self.updateExtraSubHeader();
            self.checkSaveInspection();
           });

        $('#frmInspectionDetails #address').change(function(){
            self.updateExtraSubHeader();
            self.checkSaveInspection();
           });
        $('#frmInspectionDetails #suburb').change(function(){
            self.updateExtraSubHeader();
            self.checkSaveInspection();
           });
        // $('#frmInspectionDetails #postcode').change(function(){
            // self.updateExtraSubHeader();
            // self.checkSaveInspection();
           // });
        $('#frmInspectionDetails #weather').change(function(){
            self.checkSaveInspection();
        });

        $('.btnEditPrivateNotes').bind(objApp.touchEvent, function(e){
            e.preventDefault();

            var objNoteModal = new noteModal("Private Notes", $("#inspection #privatenotes").val(), function(notes)
            {
                // The user has updated the notes value.
                // Update the toggle (and therefore the form) with the new value.
                $("#inspection #privatenotes").val(notes);
                self.setNoteButtonContentIndicators();
                objApp.objInspection.checkSaveInspection();
            });

            objNoteModal.show();

            if(self.finalised == 1)
            {
                objNoteModal.setReadOnly();
            }
        });

        $('#emailTo').bind('blur', function(){
            objApp.scrollTop();
        });

		/***
		* Capture the event when the user clicks on the Add Issue button
		*/
		$("#btnAddDefect").bind(objApp.touchEvent, function(e)
		{
            if($('#observation').val().trim()==''){
                alert('Please insert the observation');
                return;
            }
			e.preventDefault();

			self.saveDefect(function(){
                $("#inspectionStep2 textarea#observation").val('');
                $("#inspectionStep2 ul#popAction li:first-child").text('Choose');
                // Clear all defect related keys
                objApp.keys.inspection_item_id = "";
                objApp.keys.observation = '';
                objApp.keys.action = '';
                objApp.keys.reason = '';
                // When adding a new defect, hide the delete defect button
                $("#btnDeleteDefect").css("visibility", "hidden");

                // Increment the sequence number
                var seq_no = $("#frmDefectDetails #seq_no").val();
                if(seq_no == "") {
                    seq_no = 1;
                } else {
                    seq_no = seq_no * 1;
                    seq_no++;

                    $("#frmDefectDetails #seq_no").val(seq_no);
                }

                // Remove event binding
                $("#frmDefectDetails #observation_suggestion tr td").unbind();
                
                // Clear the
                $("#frmDefectDetails #observation_suggestion").empty();

                // Initialise defect form.
                //self.initDefectForm(null, false);
                $("#frmDefectDetails #reason").val('');
            });

			return false;
		});

		/***
		* Capture the event when the user clicks on the delete inspection button
		*/
		$("#main #btnDeleteInspection").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();

			if(objApp.keys.inspection_id == "") return;

			if(!confirm("Delete this inspection and all related photos and issues?"))
			{
				return true;
			}

			blockElement('body');

			// Delete related inspectionitemphotos
			var sql = "UPDATE inspectionitemphotos " +
				"SET deleted = 1, dirty = 1 " +
				"WHERE inspection_id = ?";

			objDBUtils.execute(sql, [objApp.keys.inspection_id], null);

			// Delete related inspectionitems
			var sql = "UPDATE inspectionitems " +
				"SET deleted = 1, dirty = 1 " +
				"WHERE inspection_id = ?";

			objDBUtils.execute(sql, [objApp.keys.inspection_id], null);

			// Delete this inspection
			var sql = "UPDATE inspections " +
				"SET deleted = 1, dirty = 1 " +
				"WHERE id = ?";

			objDBUtils.execute(sql, [objApp.keys.inspection_id], null);

			setTimeout(function()
			{
				// Now move back to the inspection listing screen.
				self.setupInspections();

				unblockElement('body');
			}, 500);
		});

        $("a.itemtype").bind(objApp.touchEvent, function(e) {
            if($(this).hasClass("acknowledgement")) {
                $(this).removeClass("acknowledgement");
                $("#itemtype").val("0");
            } else {
                $(this).addClass("acknowledgement");
                $("#itemtype").val("1");
            }

            self.saveDefect();
        });

		// Handle the event when the user clicks on the PRINT button
		// to print the inspection report.
		$("#print").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();

			self.showPrintModal();
		});


        $("#exterior_quality").change(function(){
            self.checkSaveRateInspection();
        });

		// Setup toggle controls
  		var objToggleNotes = new toggleControl("toggleNotes", "#frmInspectionDetails #notes", "text", "Notes", function()
  		{
			var objNoteModal = new noteModal("Inspection Notes", objToggleNotes.getValue(), function(notes)
			{
				// The user has updated the notes value.
				// Update the toggle (and therefore the form) with the new value.
				objToggleNotes.setValue(notes);
				objApp.objInspection.checkSaveInspection();
			});

			objNoteModal.show();

			if(self.finalised == 1)
			{
				objNoteModal.setReadOnly();
			}
  		});

  		self.objToggleFailed = new toggleControl("toggleFailed", "#frmInspectionDetails #failed", "binary", "Failed", function()
  		{
            objApp.objInspection.checkSaveInspection();
  		});

        $(".inspectionDetails a#failed").bind(objApp.touchEvent, function(e) {
            e.preventDefault();

            if(self.finalised == 0) {
                if(objApp.context == "reinspections")
                {
                    $("#reinspection input#failed").val(1);
                    objApp.objInspection.checkUpdateInspection();
                }
                else
                    objApp.objInspection.checkSaveInspection();

            }
        });

        $(".inspectionDetails a#passed").bind(objApp.touchEvent, function(e) {
            e.preventDefault();

            if(self.finalised == 0) {
            if(objApp.context == "reinspections")
            {
                $("#reinspection input#failed").val(0);
                objApp.objInspection.checkUpdateInspection();
            }
            else
                objApp.objInspection.checkSaveInspection();
            }
        });

        $("#btnReportPhotos").bind(objApp.touchEvent, function(e) {
            e.preventDefault();
            self.showReportPhotos();
        });

        $("#btnSendReport, #btnSendReport2, #btnSendReport3").unbind(objApp.touchEvent);
        $("#btnSendReport, #btnSendReport2, #btnSendReport3").bind(objApp.touchEvent, function(e) {
            e.preventDefault();
            // Also ensure we have a valid inspection ID
            var inspection_id = objApp.getKey("inspection_id");
            if(objApp.empty(inspection_id)) {
                alert("Invalid inspection ID");
                return;
            }
            //var reinspection_id = objApp.getKey("reinspection_id");
            blockElement('body');
            objApp.objSync.startSyncSilent(function(success) {
                if(!success) {
                    unblockElement('body');
                    alert("Sorry, a problem occurred whilst syncing your data to the server");
                    return;
                }
                var params = {'version': objApp.version};
                params["chart_image"] = $('#chart_image').val();
                params["dummy"] = 'Here is dummy text. Post data will be cut off a part. This will fix that issue.';
                $.post(objApp.apiURL + "inspections/send_inspection_to_google_drive/" + inspection_id, params, function(response) {
                    unblockElement('body');
                    var data = JSON.parse(response);
                    if(data.status != "OK") {
                        alert(data.message);
                        return;
                    }
                    alert("The report was sent successfully to google drive");
                }, "").fail(function() {
                    unblockElement('body');
                    alert( "Unknown error" );
                })
            });
        });

        $("#btnSendReinspectReport").unbind(objApp.touchEvent);
        $("#btnSendReinspectReport").bind(objApp.touchEvent, function(e) {
            e.preventDefault();
            // Also ensure we have a valid inspection ID
            var reinspection_id = objApp.getKey("reinspection_id");
            if(objApp.empty(reinspection_id)) {
                alert("Invalid reinspection ID");
                return;
            }
            //var reinspection_id = objApp.getKey("reinspection_id");
            blockElement('body');
            objApp.objSync.startSyncSilent(function(success) {
                if(!success) {
                    unblockElement('body');
                    alert("Sorry, a problem occurred whilst syncing your data to the server");
                    return;
                }
                var params = {'version': objApp.version};
                $.post(objApp.apiURL + "inspections/send_reinspection_to_google_drive/" + reinspection_id, params, function(response) {
                    unblockElement('body');
                    var data = JSON.parse(response);
                    if(data.status != "OK") {
                        alert(data.message);
                        return;
                    }
                    alert("The report was sent successfully to google drive");
                }, "").fail(function() {
                    unblockElement('body');
                    alert( "Unknown error" );
                })
            });
        });
	}

    this.showReportPhotos = function()
    {
        objApp.clearMain();
        objApp.setSubHeading("Set Report Photos");
        $("#reportPhotos").removeClass("hidden");

        // Unbind events
        $("#btnReportPhotosBack").unbind();
        $("#tblReportPhotoListing input").unbind();

        // Load the inspection photos (if any)
        if(objApp.empty(objApp.getKey("inspection_id"))) {
            alert("showReportPhotos - Invalid inspection");
            return;
        }

        objDBUtils.orderBy = "seq_no ASC";

        var filters = [];
        filters.push(new Array("inspection_id = '" + objApp.getKey("inspection_id") + "'"));

        objDBUtils.loadRecords('inspectionitemphotos', filters, function(param, items)
        {
            if(!items)
            {
                $("#reportPhotoList").html("<p>Sorry, this inspection currently has no photos.</p>");
                return;
            }

            // Loop through the items, building the output list as we go.
            var maxLoop = items.rows.length;
            var r = 0;
            var num_items = 0;

            var html = '<table id="tblReportPhotoListing" class="listing">';

            /**
            * Shows the generated photo table listing HTML and also sets the table widths
            *
            * @param {String} html  The HTML to be used for the table listing
            */
            var showPhotoHTML = function(html) {
                // Finish the table HTML
                html += '</table>';
                
                // Kill iScroll if it already exists
                if(self.scroller) {
                    self.scroller.destroy();
                    self.scroller = null;
                }                

                // Inject the HTML
                $("#reportPhotoList").html(html);

                // Set the listing table widths
                var orientation = objApp.getOrientation();
                var screenWidth = screen.width;

                if(orientation == "landscape") {
                    screenWidth = screen.width > screen.height?screen.width:screen.height;
                }

                var tableWidth = screenWidth - 50;

                $("#reportPhotoList").css("width", tableWidth + 20 + "px");

                var tableHeader = $("#tblReportPhotos");
                var tableBody = $("#tblReportPhotoListing");
                $(tableHeader).css("table-layout", "fixed");
                $(tableBody).css("table-layout", "fixed");
                $(tableHeader).css("width", tableWidth + "px");
                $(tableBody).css("width", tableWidth + "px");

                tableWidth = tableWidth - 45;

                var average_width = Math.floor(tableWidth / 3);
                average_width = average_width - 22;  // Take into account 10px padding left and right, 10 + 10 = 20, plus 1px border left and right

                $(tableHeader).find("th:eq(0)").css("width", average_width + "px");
                $(tableHeader).find("th:eq(1)").css("width", average_width + "px");
                $(tableHeader).find("th:eq(2)").css("width", average_width + "px");

                $(tableBody).find("tr td:eq(0)").css("width", average_width + "px");
                $(tableBody).find("tr td:eq(1)").css("width", average_width + "px");
                $(tableBody).find("tr td:eq(2)").css("width", average_width + "px");

                if(objUtils.isMobileDevice()) {
                    self.scroller = new IScroll5('#reportPhotoList', { hScrollbar: false, vScrollbar: false, scrollbarClass: 'myScrollbar', tap: true});
                }
                

                // Handle the event when the user changes the cover photo selection
                $('#tblReportPhotoListing input[name="is_cover_photo"]').change(function() {
                    // Get the ID of the selected photo
                    var photo_id = $(this).val();

                    blockElement('body');

                    // Remove any existing is_cover_photo flags for this inspection
                    var sql = "UPDATE inspectionitemphotos " +
                        "SET is_cover_photo = 0, dirty = 1 " +
                        "WHERE inspection_id = ? " +
                        "AND deleted = 0";

                    objDBUtils.execute(sql, [objApp.getKey("inspection_id")], function() {
                        // Now set the new cover photo

                        sql = "UPDATE inspectionitemphotos " +
                            "SET is_cover_photo = 1, dirty = 1 " +
                            "WHERE id = ?";

                        objDBUtils.execute(sql, [photo_id], function() {
                            // All done


                            unblockElement('body');
                        });
                    });
                });

                // Handle the event when the user clicks on a photo to add it to the report
                $('#tblReportPhotoListing input[name="is_report_photo"]').change(function() {
                    // Get the ID of the selected photo
                    var photo_id = $(this).val();

                    if($(this).is(":checked")) {
                        // The user is wanting to add a photo to the report
                        // First make sure there's not too many photos selected already
                        var num_report_photos = $('#tblReportPhotoListing input[name="is_report_photo"]:checked').length;
                        if(num_report_photos > self.MAX_REPORT_PHOTOS) {
                            alert("Sorry, you may only select " + self.MAX_REPORT_PHOTOS + " photos to show on the report.  Please uncheck some other photos first.");
                            $(this).removeAttr("checked");
                            return;
                        }

                        // Add the photo selection
                        sql = "UPDATE inspectionitemphotos " +
                            "SET is_report_photo = 1, dirty = 1 " +
                            "WHERE id = ?";

                        blockElement('body');

                        objDBUtils.execute(sql, [photo_id], function() {
                            // All done
                            unblockElement('body');
                        });


                    } else {
                        // Remove the photo selection
                        sql = "UPDATE inspectionitemphotos " +
                            "SET is_report_photo = 0, dirty = 1 " +
                            "WHERE id = ?";

                        blockElement('body');

                        objDBUtils.execute(sql, [photo_id], function() {
                            // All done
                            unblockElement('body');
                        });  
                    }
                });
            }

            if(objApp.phonegapBuild)
            {
                var fail = function(error)
                {
                    alert("loadPhotos::Caught error: " + error.code);
                }

                // Request access to the file system
                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem)
                {
                    // We have access to the file system.

                    // Define the function to load the next image for phonegap builds.
                    // The thumbnail image data is coming straight from the local file system
                    var doNext = function()
                    {
                        var row = items.rows.item(r);

                        if(row.photodata != "")
                        {
                            // Define the file name that the thumbnail should have
                            var file_name = row.id + "_thumb.jpg";
                            //var file_name = row.id;

                            // Get permission to access the file entry
                            fileSystem.root.getFile(file_name, {create: true}, function(fileEntry)
                            {
                                // Get access to the file object
                                fileEntry.file(function(file)
                                {
                                    // Create a file reader and read the file data.
                                    var reader = new FileReader();

                                    // When we've finished loading the file,
                                    // build the HTML string and move to the next item
                                    reader.onloadend = function(evt)
                                    {
                                        html += '<tr>';
                                        html += '<td><img width="150" height="100" src="data:image/jpeg;base64,' + evt.target.result + '" /></td>';
                                        html += '<td><input type="radio" name="is_cover_photo" value="' + row.id + '" ';

                                        if(row.is_cover_photo == 1) {
                                            html += 'checked="checked"' ;
                                        }

                                        html += ' /></td>';
                                        html += '<td><input type="checkbox" name="is_report_photo" value="' + row.id + '" ';

                                        if(row.is_report_photo == 1) {
                                            html += 'checked="checked"' ;
                                        }

                                        html += ' /></td>';
                                        html += '</tr>';

                                        num_items++;

                                        r++;

                                        if(r < maxLoop)
                                        {
                                            doNext();
                                        }
                                        else
                                        {
                                            showPhotoHTML(html);
                                        }
                                    };

                                    reader.readAsText(file);
                                }, fail);


                            }, fail);
                        }
                        else
                        {
                            r++;

                            if(r < maxLoop)
                            {
                                doNext();
                            }
                            else
                            {
                                showPhotoHTML(html);
                            }
                        }
                    }

                    if(r < maxLoop)
                    {
                        doNext();
                    }
                    else
                    {
                        showPhotoHTML(html);
                    }

                }, fail);
            }
            else
            {
                // Define the function to load the next image for non-phonegap builds
                // The thumbnail image data is coming straight from the database in this case.
                var doNext = function()
                {
                    var row = items.rows.item(r);

                    if(row.photodata != "")
                    {
                        html += '<tr>';
                        html += '<td><img width="150" height="100" src="data:image/jpeg;base64,' + row.photodata_tmb + '" /></td>';
                        html += '<td><input type="radio" name="is_cover_photo" value="' + row.id + '" ';

                        if(row.is_cover_photo == 1) {
                            html += 'checked="checked"' ;
                        }

                        html += ' /></td>';
                        html += '<td><input type="checkbox" name="is_report_photo" value="' + row.id + '" ';

                        if(row.is_report_photo == 1) {
                            html += 'checked="checked"' ;
                        }

                        html += ' /></td>';
                        html += '</tr>';

                        num_items++;
                    }

                    r++;

                    if(r < maxLoop)
                    {
                        doNext();
                    }
                    else
                    {
                        showPhotoHTML(html);
                    }
                }
            }

            if(r < maxLoop)
            {
                if (typeof doNext == 'function')
                    doNext();
            }
            else
            {
                showPhotoHTML(html);
            }

        }, "");


        $("#btnReportPhotosBack").bind(objApp.touchEvent, function(e) {
            e.preventDefault();

            self.showStep3();
        });

    }


    this.updateExtraSubHeader = function()
	{
	    /* Do not use it anymore */
	    return;
        var text = '';
        var lot = $('#frmInspectionDetails #lot_no').val();
        var address = $('#frmInspectionDetails #address').val();
        var suburb = $('#frmInspectionDetails #suburb').val();
        // var postcode = $('#frmInspectionDetails #postcode').val();
        // var state = self.objPopState.getText();
        text = 'LOT ' + lot + ', ' +address + ', ' + suburb;
        // alert(text);
		objApp.setExtraHeading(text, true);
	}

	this.deleteLocation = function(ID)
	{
		objDBUtils.deleteRecord("resources", ID, function()
		{
			self.objPopLocation.removeOption(ID);
		});
	}

    this.deleteAction = function(ID)
    {
        objDBUtils.deleteRecord("resources", ID, function()
        {
            self.objPopAction.removeOption(ID);
        });
    }

    this.deleteIssue = function(ID)
    {
        objDBUtils.deleteRecord("resources", ID, function()
        {
            self.objPopIssue.removeOption(ID);
        });
    }

    this.deleteDetail = function(ID)
    {
        objDBUtils.deleteRecord("resources", ID, function()
        {
            self.objPopDetail.removeOption(ID);
        });
    }
    this.setObservationFilters = function(){
        objDBUtils.orderBy = "";
        self.observation = $('#frmDefectDetails textarea#observation').val().trim();
        $("#frmDefectDetails #observation_suggestion").empty();

        if(self.observation == '') {
            return false;
            $("#observationFS").hide();
        }

        $("#observationFS").show();

        self.filters = [];
        //filters.push(new Array("limit", 4));
        self.filters.push(new Array("resource_type = 3"));
        self.filters.push(new Array("name LIKE '%" + objDBUtils.doubleApos(self.observation) + "%'"));
        self.filters.push(new Array("limit", 20));
    }

	/***
	* initDefectForm
	* This method shows the defect form in the right sidebar and then
	* resets the popSelectors and loads their values as appropriate.
	* If an existing defect is being shown, the defect values are preselected.
	*/
	this.initDefectForm = function(inspectionItem, resetLocation)
	{
	    if (typeof(resetLocation)=='undefined') resetLocation = true;

		self.lastKeyPress = null;
		self.doingSave = false;

		// Unbind key events
		$("#btnCapturePhoto").unbind();

		var user_id = localStorage.getItem("user_id");

           // Setup defect pop selectors
        if(self.objPopLocation == null)
        {
            // The pop selectors have not been initialised yet.
            self.objPopLocation = new popselector("#frmDefectDetails #popLocation", "Please select a location");
            self.objPopLocation.callbackMethod = objApp.objInspection.handleLocationChanged;
            self.objPopLocation.addNewMethod = self.addNewLocation;
            self.objPopLocation.deleteCallback = self.deleteLocation;
        }

        if(self.objPopAction == null)
        {
            // The pop selectors have not been initialised yet.
            self.objPopAction = new popselector("#frmDefectDetails #popAction", "Please select an action");
            self.objPopAction.callbackMethod = objApp.objInspection.handleActionChanged;
            self.objPopAction.addNewMethod = self.addNewAction;
            self.objPopAction.deleteCallback = self.deleteAction;
        }

		// If an inspection item has been passed through, set the item details from it, otherwise initialise to blank.
		var currentLocation = self.objPopLocation.getValue();

		if(inspectionItem == null)
		{
			$("#frmDefectDetails #observation").val("");
            self.objPopLocation.clear("", "Choose");
			$("#frmDefectDetails #created_by").val(user_id);
            $("#frmDefectDetails #itemtype").val("0");
            $("#frmDefectDetails #numrepeats").val("0");
            $("#frmDefectDetails #reason").val("");

			// Get the next inspectionitems sequence number for this audit
			var sql = "SELECT MAX(seq_no) as seq_no " +
				"FROM inspectionitems " +
				"WHERE inspection_id = ? AND deleted = 0";

			objDBUtils.loadRecordSQL(sql, [objApp.keys.inspection_id], function(row)
			{
				var seq_no = 1;

				if((row) && (row.seq_no != null))
				{
					seq_no = row.seq_no + 1;
				}

				// Set the sequence number into the form.
				$("#frmDefectDetails #seq_no").val(seq_no);
			});
		}
		else
		{
			// Set observation text
            $("#frmDefectDetails #observation").val(inspectionItem.observation);

            // Preselect location pop selector
            objApp.keys.action = inspectionItem.action;
            objApp.keys.location = inspectionItem.location;
            objApp.keys.reason = inspectionItem.reason;

            //self.touchScroll(document.querySelector("#frmDefectDetails #notes"));
			$("#frmDefectDetails #created_by").val(inspectionItem.created_by);
			$("#frmDefectDetails #seq_no").val(inspectionItem.seq_no);

			$("#photoWrapper").removeClass("hidden");

            $("#frmDefectDetails #itemtype").val(inspectionItem.itemtype);
            $("#frmDefectDetails #numrepeats").val(inspectionItem.numrepeats);
		}

        if($("#frmDefectDetails #itemtype").val() == "1") {
            $("a.itemtype").addClass("acknowledgement");
        } else {
            $("a.itemtype").removeClass("acknowledgement");
        }

		$("#frmDefectDetails #observation_suggestion").empty();
        $("#observationFS").hide();


		// Clear any existing pop filter options.
		self.objPopLocation.removePopOptions(0, "", "Choose");
		self.objPopAction.removePopOptions(0, "", "Choose");

		// Load available levels into the pop selector
		objDBUtils.primaryKey = "id";
		objDBUtils.showColumn = "name";
		objDBUtils.orderBy = "name ASC";

		var filters = [];
		filters.push(new Array("resource_type = 1"));

		objDBUtils.loadSelect("resources", filters, "#frmDefectDetails #popLocation", function()
		{
		    if (!resetLocation)
		    {
                self.objPopLocation.preselect(currentLocation);
		    }
		    else
		    {
    			if(objApp.keys.location != "")
    			{
    				self.objPopLocation.preselectByText(objApp.keys.location);
    			}
    			else
    			{
    				self.objPopLocation.clear("", "Choose");
    			}
		    }
		});


        var filters = [];
		filters.push(new Array("resource_type = 2"));

		objDBUtils.loadSelect("resources", filters, "#frmDefectDetails #popAction", function()
		{
			if(objApp.keys.action != "")
			{
				self.objPopAction.preselectByText(objApp.keys.action);
			}
			else
			{
				self.objPopAction.clear("", "Choose");
			}
		});

        objDBUtils.orderBy = "";

        $("#frmDefectDetails #reason").val(objApp.keys.reason);

		// If the ipad has scrolled to show the notes field,
		// make sure we scroll back down after the user has finished typing.
        
        // Unbind the search observation key event.
        $("#frmDefectDetails #observation").unbind();

		$('#frmDefectDetails #observation').bind('keyup', function(e)
		{
            setTimeout(function() {
                if(e.which=='32'){ // if user pressed "space" button
                    self.setObservationFilters();
                    self.searchObservations();
                }
            }, 350);
		});
		self.setReadOnly();
	}
    
    // Unbind the search observation touch event.
    $("#searchObservation").unbind();
    
    $("#searchObservation").bind(objApp.touchEvent, function(e) {
       self.setObservationFilters();
       self.searchObservations();
    });
    
	this.searchObservations = function(){
	    if (typeof self.filters == 'undefined')
	        return;
        // Remove any previously bound events.
        $("#frmDefectDetails #observation_suggestion tr td").unbind();
        
        // Kill iScroll if it already exists
        if(self.scroller) {
            self.scroller.destroy();
            self.scroller = null;
        }        
        
        objDBUtils.loadSelect("resources", self.filters, "#frmDefectDetails #observation_suggestion", function()
        {
            // Bind the click event after search
            $("#frmDefectDetails #observation_suggestion tr td").bind(objApp.touchEvent, function() {
                var selectedTxt = $(this).text();
                $('#frmDefectDetails #observation').val(selectedTxt);
            });            
            
            if(objUtils.isMobileDevice()) {
                self.scroller = new IScroll('observationWrapper', { click: true, hScrollbar: false, vScrollbar: false, scrollbarClass: 'myScrollbar'});
            }
        }, 'td');
    }
	/***
	* Delete the specified inspection item (defect)
	* We need to delete all related inspection item photos, and then the inspection item itself
	*/
	this.deleteDefect = function(item_id)
	{
		// Flag all related photo records as deleted.
		var sql = "UPDATE inspectionitemphotos " +
			"SET deleted = 1, dirty = 1 " +
			"WHERE inspection_id = ?";

		objDBUtils.execute(sql, [item_id], function()
		{
			// Now delete the inspection item record itself
			objDBUtils.deleteRecord("inspectionitems", item_id, function()
			{
				// Final step is to update the inspection record with the correct stats.
				// Get the number of defects associated with this inspection
				var sql = "SELECT COUNT(*) as num_defects " +
				    "FROM inspectionitems " +
				    "WHERE inspection_id = ? AND deleted = 0";

				objDBUtils.loadRecordSQL(sql, [objApp.keys.inspection_id], function(row)
				{
					if(row)
					{
						// Now update the parent inspection record with the defect count.
						var num_defects = row.num_defects;

						sql = "UPDATE inspections " +
							"SET num_defects = ?, dirty = 1 " +
							"WHERE id = ?";

						objDBUtils.execute(sql, [num_defects, objApp.keys.inspection_id], function()
						{
							// Hide the delete button
							$("#btnDeleteDefect").css("visibility", "hidden");

							// Reload the inspection items listing
							self.loadInspectionItems();

							// Hide the defect panel
							$("#defect").addClass("hidden");

						});
					}
				});
			});
		});
      // two time doing arrow down functionality to update wrong tag ID's
        self.handleMoveInspectionItem(item_id, 'down');
        self.handleMoveInspectionItem(item_id, 'down');
	}

    /***
	* Delete the specified image item (defect)
	* We need to delete the photo
	*/
	this.deleteImage = function(item_id)
	{
        if (item_id == "")
            return;

		// Flag all related photo records as deleted.
		var sql = "UPDATE " + self.current_table + " " +
			"SET deleted = 1, dirty = 1 " +
			"WHERE id = ?";

		objDBUtils.execute(sql, [item_id], function()
		{
			// Reload the inspection photos listing
            self.loadPhotos();
		});
	}

	this.doDelayedSave = function()
	{
		var now = new Date();

		var diff = now - self.lastKeyPress;

		if(diff < 1500)
		{
			setTimeout('objApp.objInspection.doDelayedSave()', 100);
		}
		else
		{
			if(!self.doingSave)
			{
				self.doingSave = true;
                self.handleIssueChanged();
			}
		}
	}

    /**
    * Loads the inspection (or reinspection) photos
    * and shows the popup window allowing the user to take more photos.
    */
	this.loadPhotos = function()
	{
        if(objApp.getKey("inspection_id") == "" && objApp.getKey("reinspection_id") == "")
		{
			$("#photoWrapper #photoList").html("<p>This item has no photos.</p>");
			return;
		}

        if(!objApp.empty(objApp.getKey("reinspection_id"))) {
            self.current_table = "reinspectionitemphotos";
            self.current_key = "reinspection_id";
        } else {
            self.current_table = "inspectionitemphotos";
            self.current_key = "inspection_id";
        }

		objDBUtils.orderBy = "seq_no ASC";

		var filters = [];
		filters.push(new Array(self.current_key + " = '" + objApp.getKey(self.current_key) + "'"));
        filters.push(new Array("deleted", 0));

		objDBUtils.loadRecords(self.current_table, filters, function(param, items)
		{
			if(!items)
			{
                $("#photoWrapper #photoList").html("<p>This item has no photos.</p>");
				return;
			}

			// Loop through the items, building the output list as we go.
			var maxLoop = items.rows.length;
            self.numImgCurr = maxLoop;
            $(".inspectionDetails #btnCapturePhoto .numImgCurr").text(self.numImgCurr);
			var r = 0;
			var num_items = 0;

			var html = '<ul class="gallery">';

			if(objApp.phonegapBuild)
			{
				var fail = function(error)
				{
					alert("loadPhotos::Caught error: " + error.code);
				}

				// Request access to the file system
				window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem)
				{
					// We have access to the file system.

					// Define the function to load the next image for phonegap builds.
					// The thumbnail image data is coming straight from the local file system
					var doNext = function()
					{
						var row = items.rows.item(r);

						if(row.photodata_tmb != "")
						{
							// Define the file name that the thumbnail should have
							var file_name = row.id + "_thumb.jpg";

							// Get permission to access the file entry
							fileSystem.root.getFile(file_name, {create: true}, function(fileEntry)
							{
								// Get access to the file object
							    fileEntry.file(function(file)
							    {
							    	// Create a file reader and read the file data.
							    	var reader = new FileReader();

							    	// When we've finished loading the file,
							    	// build the HTML string and move to the next item
									reader.onloadend = function(evt)
									{
                                        var delete_node = '<div class="deletePhoto" data-id="' + row.id + '"></div>';
                                        if(self.finalised == 1) {
                                            delete_node = "";
                                        }

				    					html += '<li>' + delete_node + '<a rel="' + row.id + '"><img width="90" height="60" src="data:image/jpeg;base64,' + evt.target.result + '" /></a><div class="imageNotes">' + row.notes + '</div></li>';
						    			num_items++;

										r++;

										if(r < maxLoop)
										{
											doNext();
										}
										else
										{
											self.showPhotos(num_items, html);
										}
									};

									reader.readAsText(file);
							    }, fail);


							}, fail);
						}
						else
						{

							r++;

							if(r < maxLoop)
							{
								doNext();
							}
							else
							{
								self.showPhotos(num_items, html);
							}
						}
					}

					if(r < maxLoop)
					{
						doNext();
					}
					else
					{
						self.showPhotos(num_items, html);
					}

				}, fail);
			}
			else
			{
				// Define the function to load the next image for non-phonegap builds
				// The thumbnail image data is coming straight from the database in this case.
				var doNext = function()
				{
					var row = items.rows.item(r);

					if(row.photodata_tmb != "")
					{
                        var delete_node = '<div class="deletePhoto" data-id="' + row.id + '"></div>';
                        if(self.finalised == 1) {
                            delete_node = "";
                        }

				    	html += '<li>' + delete_node + '<a rel="' + row.id + '"><img width="90" height="60" src="data:image/jpeg;base64,' + row.photodata_tmb + '" /></a><div class="imageNotes">' + row.notes + '</div></li>';
					    num_items++;
					}

					r++;

					if(r < maxLoop)
					{
						doNext();
					}
					else
					{
						self.showPhotos(num_items, html);
					}
				}
                
                if(r < maxLoop)
    			{
    				doNext();
    			}
    			else
    			{
    				self.showPhotos(num_items, html);
    			}
			}

		}, "");
	}

	this.showPhotos = function(num_items, html)
	{
		html += "</ul>";

		html += '<div style="clear:both;"></div>';

		// If matching items were found, inject them into the page, otherwise show the no history message.
		if(num_items == 0)
		{
			$("#photoWrapper #photoList").html("<p>This item has no photos.</p>");
		}
		else
		{
			$("#photoWrapper #photoList").html(html);

			// Setup touchScroll if applicable
			if(objUtils.isMobileDevice())
			{
				self.scroller = new IScroll5('#photoList', { click: true, hScrollbar: false, vScrollbar: false, scrollbarClass: 'myScrollbarSm'});
			}

			$("#photoWrapper #photoList a").unbind();

			var editPhoto = function(photoID, photoData, notes)
			{
				// Setup a new image object, using the photo data as the image source
				objImage = new Image();

				objImage.src = 'data:image/jpeg;base64,' + photoData;

				//notes = "";

				// When the image has loaded, setup the image marker object
				objImage.onload = function()
				{
 					// Resize the image so it's 600px wide
					objResizer = new imageResizer(objImage);
					var imageData = objResizer.resize(600);

					objImage = new Image();
					objImage.src = 'data:image/jpeg;base64,' + imageData;
					//notes = "";

					objImage.onload = function()
					{
 						objImageMarker = new imageMarker(objImage, "Edit Image", notes, function(imageMarkerResult)
 						{
 							// Handle the save event
 							var imageData = imageMarkerResult.imageData;
 							var notes = imageMarkerResult.notes;

 							// Create a thumbnail version of the image
							objImage = new Image();
							objImage.src = 'data:image/jpeg;base64,' + imageData;

							objImage.onload = function()
							{
								objResizer = new imageResizer(objImage);
								var thumbData = objResizer.resize(90);

								if(objApp.phonegapBuild)
								{
									// Save both the thumbnail and the full version to the local file system.
									var fail = function(error)
									{
										alert("storePhotosOnFS::Caught error: " + error.code);
									}

									// Request access to the file system
									window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem)
									{
										var file_name = photoID + "_thumb.jpg";

										// Get permission to write the file
										fileSystem.root.getFile(file_name, {create: true, exclusive: false}, function(fileEntry)
										{
											// Create the file write object
											fileEntry.createWriter(function(writer)
											{
												writer.onwriteend = function(evt)
												{
													// Get the file URI for the thumbnail image
													var uri_thumb = fileEntry.toURI();

													// Now write the full image to the file system
													var file_name = photoID + ".jpg";

													fileSystem.root.getFile(file_name, {create: true, exclusive: false}, function(fileEntry)
													{
														// Create the file write object
														fileEntry.createWriter(function(writer)
														{
															writer.onwriteend = function(evt)
															{
																// Get the file URI for the thumbnail image
																var uri = fileEntry.toURI();

																// Save the image data and notes back to the database
																var sql = "UPDATE  " + self.current_table + " " +
																	"SET photodata = ?, photodata_tmb = ?, notes = ?, dirty = 1 " +
																	"WHERE id = ?";

																objDBUtils.execute(sql, [uri, uri_thumb, notes, photoID], function()
																{
																	self.loadPhotos();
																});
															};

															writer.write(imageData);

														}, fail);

													}, fail);

												};

												// Write the thumbnail data to the file.
												writer.write(thumbData);

											}, fail);

										}, fail);

									}, fail);
								}
								else
								{
									// Not phonegap build.  Just save the image data straight to the database.
									// Save the image data and notes back to the database
									var sql = "UPDATE " + self.current_table + " " +
										"SET photodata = ?, photodata_tmb = ?, notes = ?, dirty = 1 " +
										"WHERE id = ?";

									objDBUtils.execute(sql, [imageData, thumbData, notes, photoID], function()
									{
										self.loadPhotos();
									});
								}
							}
 						}, self.deleteImage, photoID, false);

 						objImageMarker.show();
					}
				}
			}


			$("#photoWrapper #photoList a").bind(objApp.touchEvent, function(e)
			{
				e.preventDefault();

				// Get the id of the selected photo
				var photoID = $(this).attr("rel");

				objDBUtils.loadRecord(self.current_table, photoID, function(photoID, row)
				{
					if(!row)
					{
						alert("Sorry, the photo record could not be loaded");
						return;
					}

					// If the fullsize version of the photo is not on the device, bring it down.
					if((row.photodata == null) || (row.photodata == ""))
					{
						if(confirm("The full size version of this photo is not on this device.  Would you like to download it now via the Internet?"))
						{
							var params = objApp.objSync.getLoginParams();
							if(!params)
							{
								alert("Sorry, this request could not be completed");
							}

							blockElement('body');

							// Create the request URL
							var url = objApp.apiURL + "inspections/get_inspection_photo/" + photoID;
                            params['version'] = objApp.version;
                            $.post(url, params, function(data)
							{
								unblockElement('body');

								if(data.status == "OK")
								{
									if(data.photo != "")
									{
										if(objApp.phonegapBuild)
										{
											// We have received the photo data
											// Save the photo to the file system
											var fail = function(error)
											{
												alert("storePhotosOnFS::Caught error: " + error.code);
											}

											window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem)
											{
												var file_name = photoID + ".jpg";

												// Get permission to write the file
												fileSystem.root.getFile(file_name, {create: true, exclusive: false}, function(fileEntry)
												{
													// Create the file write object
													fileEntry.createWriter(function(writer)
													{
												        writer.onwriteend = function(evt)
												        {
												        	// Get the path to the file
												        	if (is_on_simulator)
                                                                var uri = fileEntry.fullPath;
                                                            else
                            								    var uri = fileEntry.toURI();

												        	// Update the database with the path

															// We have received the photo data
															// Update the relevant record with the raw photodata.
															var sql = "UPDATE " + self.current_table + " " +
																"SET photodata = ? " +
																"WHERE id = ?";

															objDBUtils.execute(sql, [uri, photoID], function()
															{
																// Photo was downloaded and saved locally OK
																editPhoto(photoID, data.photo, row.notes);
															});
														}

														// Write the photo data to the file.
                                                        if (is_on_simulator) {
                                                            writer.write(new Blob([data.photo]));
                                                        } else {
                                                            writer.write(data.photo);
                                                        }

													}, fail);

												}, fail);

											}, fail);

										}
										else
										{
											// We have received the photo data
											// Update the relevant record with the raw photodata.
											var sql = "UPDATE " + self.current_table + " " +
												"SET photodata = ? " +
												"WHERE id = ?";

											objDBUtils.execute(sql, [data.photo, photoID], function()
											{
												// Photo was downloaded and saved locally OK
												editPhoto(photoID, data.photo, row.notes);
											});
										}
									}
								}
							}, "json");
						}
					}
					else
					{
						// Photo data already present
						if(objApp.phonegapBuild)
						{
							// Load the photo data from the file system
							objUtils.readFile(row.id + ".jpg", function(success, photoData)
							{
								if(success)
								{
									editPhoto(photoID, photoData, row.notes);
								}
							});
						}
						else
						{
							editPhoto(photoID, row.photodata, row.notes);
						}
					}

				}, photoID);
			});

            $("#photoWrapper .deletePhoto").bind(objApp.touchEvent, function(e)
			{
				e.preventDefault();

                if(!confirm("Are you sure you want to delete this image?  Once the issue has been deleted you cannot recover it."))
    			{
    				return false;
    			}

                var photoID = $(this).attr("data-id");

    			self.deleteImage(photoID);
            });
		}
        var itemsArr = [];
        $( ".gallery" ).sortable({
          update: function( event, ui ) {
          itemsArr = [];
            $( ".gallery > li" ).each(function(){
                var id = ($(this).find('a').attr('rel'));
                itemsArr.push(id);
            });
            var sql = 'SELECT * FROM ' + self.current_table + ' WHERE ' + self.current_key + ' = ? ORDER BY seq_no';
            objDBUtils.loadRecordsSQL(sql, [objApp.getKey(self.current_key)], function(param, items)
            {
                if(!items)
                {
                    alert("The current inspection id is NOT valid");
                    return;
                }
                else
                {
                    var maxLength = items.rows.length;
                    for (var r = 0; r < maxLength; r++)
                    {
                        var item = items.rows.item(r);
                        sql = "UPDATE " + self.current_table + " " +
                              "SET seq_no = ? " +
                              "WHERE id = ? ";
                        objDBUtils.execute(sql, [(r+1),itemsArr[r]], null);
                    }
                }
            }, "");
          }
        });

        $( ".gallery" ).disableSelection();

	}

	/***
	* Loads all inspection items that match the passed level, area, issue and detail
	* and are older than the current inspection and shows them in a list so the user can see
	* the history for the particular defect item.
	*/
	this.loadHistory = function(level, area, issue, detail)
	{
        // Always hide the history section to start with
        if(!$(".inspectionDetails .historySection").hasClass("hidden"))
        {
            $(".inspectionDetails .historySection").addClass("hidden");
        }

		// Make sure all values are present
		if((objUtils.isEmpty(level)) || (objUtils.isEmpty(area)) || (objUtils.isEmpty(issue)) || (objUtils.isEmpty(detail)))
		{
			return;
		}
        
        // Kill iScroll if it already exists
        if(self.scroller) {
            self.scroller.destroy();
            self.scroller = null;
        }        

        $("#historyModal #historyList").html('');
        $('#history_im_notes').html('');

		// Calculate the time threshold
		var objDate = objApp.userDateStrToDate($("#inspection #inspection_date").val());
        if(objDate == null)
        {
            return;
        }

		var timeThreshold = objDate.getTime();

		// Calculate the MD5 hash for this defect.
		var hash = objUtils.MD5(level.toUpperCase() + area.toUpperCase() + issue.toUpperCase() + detail.toUpperCase());

		// Load the history items
		var sql = "SELECT i.inspection_date, ii.* " +
				"FROM inspectionitems ii " +
				"INNER JOIN inspections i ON ii.inspection_id = i.id AND i.deleted = 0 AND ii.inspection_id <> ? " +
				"WHERE ii.deleted = 0 " +
                "AND ii.itemtype = 0 " +
				"AND i.inspection_start < ? " +
				"AND ii.hash = ? " +
                "AND i.site_id = ? " +
				"ORDER BY i.inspection_date DESC LIMIT 5";

        var site_id = this.objPopSites.getValue();

		objDBUtils.loadRecordsSQL(sql, [objApp.keys.inspection_id, timeThreshold, hash, site_id], function(param, items)
		{
			if(!items)
			{
				// There were no items that match.
				$("#historyModal #historyList").html("Sorry, no history is available.");
                $("#numrepeats").val("0");
			}
			else
			{
                $(".inspectionDetails .historySection").removeClass("hidden");
				// Loop through the items, building the output list as we go.
				var maxLoop = items.rows.length;
                $("#numrepeats").val(maxLoop);

				var r = 0;
				var num_items = 0;
                var max_note = 250;

				var html = "<ul>";

				for(r = 0; r < maxLoop; r++)
				{
				    var row = items.rows.item(r);
				    if(row.notes != "")
				    {
                        var notes = row.notes;
                        if(notes.length > max_note) {
                            notes = notes.substring(0, max_note) + "...";
                        }

				    	html += '<li><strong>' + objApp.formatUserDate(objApp.isoDateStrToDate(row.inspection_date)) + '</strong> &ndash; ' + notes
                                + '<div id="history_'+row.id+'"></div>'
                                + '</li>';
				    }
                    else
                    {
                        html += '<li><strong>' + objApp.formatUserDate(objApp.isoDateStrToDate(row.inspection_date))
                                + '</strong><div id="history_'+row.id+'"></div>'
                                + '</li>';
                    }
                    num_items++;
				}

				html += "</ul>";

				// If matching items were found, inject them into the page, otherwise show the no history message.
				if(num_items == 0)
				{
					$("#historyModal #historyList").html("Sorry, no history is available.");
				}
				else
				{
					$("#historyModal #historyList").html(html);

                    var modalWidth = $("#historyModal").width();
                    $("#historyModal #historyList").css("width", "60%");

                    if (maxLoop > 1) {
                        $(".historySection #issueTimes").html(maxLoop.toString() + " times");
                    }
                    else {
                        $(".historySection #issueTimes").html("1 time");
                    }

                    for(r = 0; r < maxLoop; r++)
				    {
				        var row = items.rows.item(r);
				        self.loadHistoryPhotos(row.id);
                    }

				    // Setup touchScroll if applicable
					if(objUtils.isMobileDevice()) {
					    self.scroller = new IScroll('#historyList', { click: true, hScrollbar: false, vScrollbar: false, scrollbarClass: 'myScrollbar'});
					}
				}

			}


		}, "");
	}

    // When the user clicks on an inspection that has reinspections,  we show a modal
    // window so the user can select which inspection they wish to view.
    this.loadHistoryReinspectionItems = function(inspection_id)
    {
        // Set the correct inspectionID into the keys object
        objApp.keys.inspection_id = inspection_id;
        
        // Clear the modal window HTML
        $("#inspectionList #historyReinspection table tbody").html("");

        $("#historyReinspection a.action").unbind();

        var tbody = "";

        // Step 1 - we should always load the original inspection and show that first in the list
        var sql = "SELECT i.* " +
            "FROM inspections i " +
            "WHERE i.id = ?";

        objDBUtils.loadRecordSQL(sql, [inspection_id], function(row) {
            if(!row) {
                alert("Couldn't load inspection record");
                return;
            }

            tbody += '<tr>';
            tbody += '<td>' + objApp.formatUserDate(objApp.isoDateStrToDate(row.inspection_date)) + '</td>';
            tbody += '<td>Original Inspection</td>';
            tbody += '<td>Failed</td>';    // Original inspection ALWAYS fails

            tbody += '<td><div class="action"><a href="#" class="action view original" data-id="' + row.id + '">View</a></div></td>';
            tbody += '</tr>';

            // Step 2 - Also load any reinspections in sequence order
            sql = "SELECT ri.* " +
                "FROM reinspections ri " +
                "WHERE ri.inspection_id = ? AND deleted = 0 " +
                "ORDER BY ri.reinspection_date ASC";

            objDBUtils.loadRecordsSQL(sql, [inspection_id], function(param, items) {
                if(items) {
                    var maxLoop = items.rows.length;

                    var r = 0;

                    for(r = 0; r < maxLoop; r++)
                    {
                        var row = items.rows.item(r);
                        tbody += '<tr>';
                        tbody += '<td>' + objApp.formatUserDate(objApp.isoDateStrToDate(row.reinspection_date)) + '</td>';
                        tbody += '<td>Reinspection</td>';

                        if(row.failed == 1) {
                            tbody += '<td>Failed</td>';
                        } else {
                            tbody += '<td>Passed</td>';
                        }

                        tbody += '<td><div class="action"><a href="#" class="action view reinspection" data-id="' + row.id + '">View</a></div></td>';
                        tbody += '</tr>';
                    }
                }

                $("#inspectionList #historyReinspection table tbody").html(tbody);

                // Bind click even
                $("#historyReinspection a.action").bind(objApp.touchEvent, function(e) {

                    e.preventDefault();
                    
                    // inspection / reinspection id
                    var id = $(this).attr('data-id');
                    objApp.keys.reinspection_id = id;
                    self.setReturnReinspectionID(id);

                    // Close the reveal window
                    //$('#historyReinspection a.close-reveal-modal').click();
                    $('#historyReinspection').trigger('reveal:close');

                    revealWindow.hideModal();  // Note the revealWindow variable is defined in jquery.reveal.js - I added this in.

                    // If it's a reinspection, show the reinspection screen, otherwise show the editInspection screen.
                    if($(this).hasClass("reinspection")) {
                        // Load the reinspection record
                        objDBUtils.loadRecord("reinspections", id, function(param, reinspection) {
                            if(!reinspection) {
                                alert("Couldn't load the reinspection record!");
                                return;
                            }

                            objApp.keys.inspection_id = reinspection.inspection_id;
                            self.reinspectionNotes = reinspection.notes;

                            self.loadReinspectionItems(id);
                        }, "");

                    } else {
                        // Load the inspection record
                        objDBUtils.loadRecord("inspections", id, function(param, inspection) {
                            if(!inspection) {
                                alert("Couldn't load the inspection record!");
                                return;
                            }

                            self.editInspection(inspection);
                        }, "");
                    }
                });


            }, "")
        });
    }

    this.loadHistoryPhotos = function(inspectitem_id)
    {
        objDBUtils.orderBy = "seq_no ASC";
		var filters = [];
		filters.push(new Array("inspectionitem_id = '" + inspectitem_id + "'"));

		objDBUtils.loadRecords('inspectionitemphotos', filters, function(param, items)
		{
			if((!items) || (items === undefined))
			{
				$("#history_" + inspectitem_id).html("<p>There are currently no photos for this item.</p>");
			}

			// Loop through the items, building the output list as we go.
			var maxLoop = items.rows.length;
			var r = 0;
			var num_items = 0;

			var html = '<ul class="historygallery">';

			if(objApp.phonegapBuild)
			{
				var fail = function(error)
				{
					alert("loadHistoryPhotos::Caught error: " + error.code);
				}

				// Request access to the file system
				window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem)
				{
					// We have access to the file system.

					// Define the function to load the next image for phonegap builds.
					// The thumbnail image data is coming straight from the local file system
					var doNext = function()
					{
						var row = items.rows.item(r);

						if(row.photodata_tmb != "")
						{
							// Define the file name that the thumbnail should have
							var file_name = row.id + "_thumb.jpg";

							// Get permission to access the file entry
							fileSystem.root.getFile(file_name, {create: true}, function(fileEntry)
							{
								// Get access to the file object
							    fileEntry.file(function(file)
							    {
							    	// Create a file reader and read the file data.
							    	var reader = new FileReader();

							    	// When we've finished loading the file,
							    	// build the HTML string and move to the next item
									reader.onloadend = function(evt)
									{
				    					html += '<li><a rel="' + row.id + '"><img width="90" height="60" src="data:image/jpeg;base64,' + evt.target.result + '" /></a></li>';
						    			num_items++;

										r++;

										if(r < maxLoop)
										{
											doNext();
										}
										else
										{
											self.showHistoryPhotos(num_items, html, inspectitem_id);
										}
									};

									reader.readAsText(file);
							    }, fail);


							}, fail);
						}
						else
						{

							r++;

							if(r < maxLoop)
							{
								doNext();
							}
							else
							{
								self.showHistoryPhotos(num_items, html, inspectitem_id);
							}
						}
					}

					if(r < maxLoop)
					{
						doNext();
					}
					else
					{
						self.showHistoryPhotos(num_items, html, inspectitem_id);
					}

				}, fail);
			}
			else
			{
				// Define the function to load the next image for non-phonegap builds
				// The thumbnail image data is coming straight from the database in this case.
				var doNext = function()
				{
					var row = items.rows.item(r);

					if(row.photodata_tmb != "")
					{
				    	html += '<li><a rel="' + row.id + '"><img width="90" height="60" src="data:image/jpeg;base64,' + row.photodata_tmb + '" /></a></li>';
					    num_items++;
					}

					r++;

					if(r < maxLoop)
					{
						doNext();
					}
					else
					{
						self.showHistoryPhotos(num_items, html, inspectitem_id);
					}
				}
			}

			if(r < maxLoop)
			{
				doNext();
			}
			else
			{
				self.showHistoryPhotos(num_items, html, inspectitem_id);
			}

		}, "");
    }

    this.showHistoryPhotos = function(num_items, html, inspectitem_id)
    {
        html += "</ul>";

		html += '<div style="clear:both;"></div>';
		// If matching items were found, inject them into the page, otherwise show the no history message.
		if(num_items == 0)
		{
            $("#history_" + inspectitem_id).html("<p>There are currently no photos for this item.</p>");
		}
		else
		{
            $("#history_" + inspectitem_id).html(html);

			// Setup touchScroll if applicable
			if(objUtils.isMobileDevice())
			{
				self.scroller = new IScroll('#photoList', { click: true, hScrollbar: false, vScrollbar: false, scrollbarClass: 'myScrollbarSm'});
			}

			$("#historyList a").unbind();

            var loadHistoryPhoto = function(photoID, photoData, notes)
            {
                // Setup a new image object, using the photo data as the image source
				objImage = new Image();

				objImage.src = 'data:image/jpeg;base64,' + photoData;

				// When the image has loaded, setup the image marker object
				objImage.onload = function()
				{
 					// Resize the image so it's 300px wide
					objResizer = new imageResizer(objImage);
					var imageData = objResizer.resize(300);

					objImage = new Image();
					objImage.src = 'data:image/jpeg;base64,' + imageData;

					objImage.onload = function()
					{
					    var canvasWidth = 300;
                		var canvasHeight = objImage.height;

                		if(objImage.width < canvasWidth)
                		{
              			  canvasWidth = objImage.width;
                		}

                        $('#history_im_Canvas').attr('height',canvasHeight);
                        $('#history_im_Canvas').attr('width',canvasWidth);

					    // Setup the canvas and context
                		var canvas = document.getElementById("history_im_Canvas");
                		var context = canvas.getContext("2d");

                        // Draw the image into the canvas
                        context.drawImage(objImage, 0, 0);

                        $('#history_im_notes').html(notes);
					}
				}
            }

			$("#historyList a").bind(objApp.touchEvent, function(e)
			{
				e.preventDefault();

				// Get the id of the selected photo
				var photoID = $(this).attr("rel");

				objDBUtils.loadRecord("inspectionitemphotos", photoID, function(photoID, row)
				{
					if(!row)
					{
						alert("Sorry, the photo record could not be loaded");
						return;
					}

					// If the fullsize version of the photo is not on the device, bring it down.
					if((row.photodata == null) || (row.photodata == ""))
					{
						var params = objApp.objSync.getLoginParams();
						if(!params)
						{
							alert("Sorry, this request could not be completed");
						}

						blockElement('body');

						// Create the request URL
						var url = objApp.apiURL + "inspections/get_inspection_photo/" + photoID;
                        params['version'] = objApp.version;
                        $.post(url, params, function(data)
						{
							unblockElement('body');

							if(data.status == "OK")
							{
								if(data.photo != "")
								{
									if(objApp.phonegapBuild)
									{
										// We have received the photo data
										// Save the photo to the file system
										var fail = function(error)
										{
											alert("storePhotosOnFS::Caught error: " + error.code);
										}

										window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem)
										{
											var file_name = photoID + ".jpg";

											// Get permission to write the file
											fileSystem.root.getFile(file_name, {create: true, exclusive: false}, function(fileEntry)
											{
												// Create the file write object
												fileEntry.createWriter(function(writer)
												{
											        writer.onwriteend = function(evt)
											        {
											        	// Get the path to the file
											        	var uri = fileEntry.toURI();

											        	// Update the database with the path

														// We have received the photo data
														// Update the relevant record with the raw photodata.
														var sql = "UPDATE inspectionitemphotos " +
															"SET photodata = ? " +
															"WHERE id = ?";

														objDBUtils.execute(sql, [uri, photoID], function()
														{
															// Photo was downloaded and saved locally OK
															loadHistoryPhoto(photoID, data.photo, row.notes);
														});
													}

													// Write the photo data to the file.
													writer.write(data.photo);

												}, fail);

											}, fail);

										}, fail);

									}
									else
									{
										// We have received the photo data
										// Update the relevant record with the raw photodata.
										var sql = "UPDATE inspectionitemphotos " +
											"SET photodata = ? " +
											"WHERE id = ?";

										objDBUtils.execute(sql, [data.photo, photoID], function()
										{
											// Photo was downloaded and saved locally OK
											loadHistoryPhoto(photoID, data.photo, row.notes);
										});
									}
								}
							}
						}, "json");
					}
					else
					{
						// Photo data already present
						if(objApp.phonegapBuild)
						{
							// Load the photo data from the file system
							objUtils.readFile(row.id + ".jpg", function(success, photoData)
							{
								if(success)
								{
									loadHistoryPhoto(photoID, photoData, row.notes);
								}
							});
						}
						else
						{
							loadHistoryPhoto(photoID, row.photodata, row.notes);
						}
					}

				}, photoID);
			});
		}
    }

	/***
	* saveDefect
	* The saveDefect method validates the defect form and then either creates a new
	* defect or updates an exisiting one for the current inspection.  It also updates the
	* num_defects count against the inspection record.
	*/
	this.saveDefect = function(callback)
	{
        // Make sure we have valid values for all defect pop lists
		var location =	self.objPopLocation.getText();
		var action = self.objPopAction.getText();
		var observation =  $("#frmDefectDetails #observation").val();
        var reason =  $("#frmDefectDetails #reason").val();

   		if((location == "") || (location.toUpperCase() == "CHOOSE") || observation == "")
   		{
			$("#inspectionStep2 textarea#observation").val('');
            $("#inspectionStep2 ul#popAction li:first-child").text('Choose');

            if((callback != undefined) && (callback != "")) {
                callback()
            }

			return;
   		}
   		else
   		{
			$("#frmDefectDetails #location").val(location);
   		}

        if((action == "") || (action.toUpperCase() == "CHOOSE"))
        {
            $("#inspectionStep2 textarea#observation").val('');
            $("#inspectionStep2 ul#popAction li:first-child").text('Choose');

            if((callback != undefined) && (callback != "")) {
                callback()
            }

            return;
        }
        else
        {
            $("#frmDefectDetails #action").val(action);
        }
   		// Set the current inspection id into the form.
   		$("#frmDefectDetails #inspection_id").val(objApp.keys.inspection_id);

   		// Generate the MD5 hash of the location, action
   		var hash = objUtils.MD5(location.toUpperCase() + action.toUpperCase());
   		$("#frmDefectDetails #hash").val(hash);

   		// Invoke autosave
		$("#frmDefectDetails input").blur();


        var sql = "SELECT * " +
            "FROM inspectionitems " +
            "WHERE inspection_id = ? AND location = ? AND observation = ? AND action = ? AND reason = ? AND deleted = 0";

        objDBUtils.loadRecordSQL(sql, [objApp.keys.inspection_id, location, observation, action, reason], function(row)
        {
            if(row)
            {
                console.log('This inspection item has been added');
                self.inAudit = true;

                if(self.restricted == 0)
                {
                    // Show the delete defect button
                    $("#btnDeleteDefect").css("visibility", "visible");
                }

                $("#photoWrapper").removeClass("hidden");

                if((callback != undefined) && (callback != "")) {
                    callback()
                }
            }
            else
            {
                blockElement('body');
                objDBUtils.autoSave("inspectionitems", objApp.getKey("inspection_item_id"), "frmDefectDetails", function(new_id)
                {
                    unblockElement('body');

                    // If the id was not set and we just did an update, get the id
                    if(objApp.getKey("inspection_item_id") == "")
                    {
                        objApp.keys.inspection_item_id = new_id;
                    }

                    self.inAudit = true;

                    if(self.restricted == 0)
                    {
                        // Show the delete defect button
                        $("#btnDeleteDefect").css("visibility", "visible");
                    }

                    $("#photoWrapper").removeClass("hidden");

                    self.addNewObservationSuggession();

                    if((callback != undefined) && (callback != "")) {
                        callback()
                    }
                });
            }
        });
	}

	/***
	* handleLocationChanged is fired when the user selects a level
	* from the level pop selector.
	*/
	this.handleLocationChanged = function()
	{
		self.checkAllSelected();
	}

    /***
	* handleLocationChanged is fired when the user selects a level
	* from the level pop selector.
	*/
	this.handleActionChanged = function()
	{
		self.checkAllSelected();
	}

	/***
	* Handle the event when the user has selected an issue
	*/
	this.handleIssueChanged = function()
	{
		self.checkAllSelected();
	}

	/***
	* Handle the event when the user has selected a detail item
	*/
	this.handleDetailChanged = function()
	{
		self.checkAllSelected();
	}

	/***
	* Check if all required pop selectors have a valid value.  If they do,
	* create / save the defect item.
	*/
	this.checkAllSelected = function()
	{
        if((self.objPopLocation.getValue() != "")  && (self.objPopAction.getValue() != ""))
        {
            // Yes there are - create the defect item.
            self.saveDefect();
        }
	}

    this.checkSaveRectifiedInspectionitem = function(rectified_status)
    {
        if(objApp.empty(rectified_status)) {
            alert("checkSaveRectifiedInspectionitem - Invalid rectified status");
            return;
        }

        blockElement('body');

        // Step 1 - Load the reinspection item
        var reinspectionItemID = $(this.reinspectionItemRow).attr("data-id").trim();

        objDBUtils.loadRecord("reinspectionitems", reinspectionItemID, function(rectified_status, reinspectionItem) {
            if(!reinspectionItem) {
                alert("checkSaveRectifiedInspectionitem - couldn't load reinspection item");
                return false;
            }

            // Step 2 - Update the reinspection item with the new status
            sql = "UPDATE reinspectionitems " +
                "SET rectified = ?, dirty = 1 " +
                "WHERE id = ?";

            objDBUtils.execute(sql, [rectified_status, reinspectionItemID], function() {

                // Step 3 - Update the inspectionitem that the reinspection was based upon
                sql = "UPDATE inspectionitems " +
                    "SET rectified = ?, dirty = 1 " +
                    "WHERE id = ?";

                objDBUtils.execute(sql, [rectified_status, reinspectionItem.inspectionitem_id], function() {
                    // Step 3 - Update the inspectionitem that the reinspection was based upon
                    unblockElement('body');

                    // Update the table row with the modified text
                    $(self.reinspectionItemRow).find("td:eq(4)").text(rectified_status);
                });
            });

        }, rectified_status);

    }

    this.checkSaveRateInspection = function()
    {
        self.doingSave = true;

        blockElement('body');

        // Invoke the autoSave method after a short delay.
	    setTimeout(function()
	    {
			objDBUtils.autoSave("inspections", objApp.keys.inspection_id, "frmRateDetails", function()
			{
			    self.doingSave = false;
                unblockElement('body');

                // If the id was not set and we just did an update, get the id
			    if(objApp.keys.inspection_id == "")
			    {
			        objDBUtils.setKeyFromLastInsertID("inspection_id");
			    }

                // If we have an active inspection then show the coversheet notes button
                if(self.finalised == 0) {
                    $("div.btnEditNotes").show();
                } else {
                    $("div.btnEditNotes").hide();

                }

			    self.setReturnInspectionID(objApp.keys.inspection_id);
			});
	    }, 250);
    }

	this.checkSaveReinspection = function(inspection_id, reinspection_date,failed)
    {
        var sql = "SELECT * FROM reinspections WHERE inspection_id = ? AND reinspection_date = ? AND inspection_type = 'Reinspection'";
        var values = [];
        objDBUtils.loadRecordsSQL(sql, [inspection_id, reinspection_date], function(param, items){
            if(!items)
            {
                var primaryKey = objDBUtils.makeInsertKey(objApp.sync_prefix);
                sql = "INSERT INTO " +
                      "reinspections(id, inspection_id, reinspection_date, failed, inspection_type) " +
                      "VALUES(?,?,?,?,?)";
                values = [primaryKey, inspection_id, reinspection_date, failed, "Reinspection"];
                objDBUtils.execute(sql, values, function(){
                    self.reinspectionKey = primaryKey;
                });
            }
            else
            {
                self.reinspectionKey = items.rows.item(0).id;
            }
        }, "");
    }

    this.checkUpdateInspection = function()
    {
        // Invoke the autoSave method after a short delay.
        $("#reinspection input#failed").removeClass("ignore");
        // $("#reinspection input#finalised").removeClass("ignore");
        $("#reinspection select#rectified").addClass("ignore");
        alert("HERE");

	    setTimeout(function()
	    {
			objDBUtils.autoSave("inspections", objApp.keys.inspection_id, "frmReinspection", function()
			{
			    // If the id was not set and we just did an update, get the id
			    if(objApp.keys.inspection_id == "")
			    {
			        objDBUtils.setKeyFromLastInsertID("inspection_id");
			        // objDBUtils.setKeyFromLastInsertID("report_type");
			    }

                // If we have an active inspection then show the coversheet notes button
                if(self.finalised == 0) {
                    $("div.btnEditNotes").show();
                    $("a.btnEditClientNotes").show();
                    $("a.btnEditPrivateNotes").show();
                } else {
                    $("div.btnEditNotes").hide();
                    $("a.btnEditClientNotes").hide();
                    $("a.btnEditPrivateNotes").hide();
                }

			    self.setReturnInspectionID(objApp.keys.inspection_id);
                $('#btnCapturePhoto').attr('data-reveal-id', 'photoWrapper');

			    // unblockElement('body');
                $("#reinspection input#failed").addClass("ignore");
                $("#reinspection input#finalised").addClass("ignore");
                $("#reinspection select#rectified").removeClass("ignore");

			});
	    }, 250);
    }

	/***
	* checkSaveInspection
	* The checkSaveInspection method is invoked when the user changes something on the inspection
	* details form.  It checks if enough information has been provided and if so, adds/updates the
	* inspection.
	*/
	this.checkSaveInspection = function()
	{
	    // Validate the form
	    if(!$("#frmInspectionDetails").validate().form())
	    {
	        return;
	    }

	    // Make sure both the client and site pop selectors are also set
	    if((self.objPopBuilders.val() == ""))
	    {
			return;
	    }

        if(self.doingSave) {
            return false;
        }

        self.doingSave = true;

	    // Determine if this is a new inspection or not.
	    var newInspection = true;

	    if(objApp.keys.inspection_id != "")
	    {
	    	// There is already an inspection_id defined.
	    	// This is not a new inspection.
			newInspection = false;
	    }


		// Get the inspection date as a date object
		var inspection_date = $("#frmInspectionDetails #inspection_date").val();

        // If the inspection date is NOT in ISO format we need to convert it
        if((inspection_date.length != 10) || (inspection_date.substring(4, 5) != "-"))
        {
		    var objDate = objApp.userDateStrToDate(inspection_date);

		    // Get the date as a timestamp.
		    var inspection_start = objDate.getTime();

		    // Set the timestamp into the hidden form var so it's saved later.
		    $("#frmInspectionDetails #inspection_start").val(inspection_start);

		    // Convert AU date format date back to ISO before saving
		    var result = objDate.getFullYear() + "-";
		    if((objDate.getMonth() + 1) < 10) result += "0";
		    result += (objDate.getMonth() + 1) + "-";
		    if(objDate.getDate() < 10) result += "0";
		    result += objDate.getDate();

		    // Save the visit_date back to the form
		    $("#frmInspectionDetails #inspection_date").val(result);
        }

	    // Ready to save
	    $("#frmInspectionDetails input").blur();

	    blockElement("body");

	    // Invoke the autoSave method after a short delay.
	    setTimeout(function()
	    {
			objDBUtils.autoSave("inspections", objApp.keys.inspection_id, "frmInspectionDetails", function()
			{
			    // If the id was not set and we just did an update, get the id
			    if(objApp.keys.inspection_id == "")
			    {
			        objDBUtils.setKeyFromLastInsertID("inspection_id");
			        // objDBUtils.setKeyFromLastInsertID("report_type");
			    }

                // Load the inspection object
                objDBUtils.loadRecord("inspections", objApp.keys.inspection_id, function(inspection_id, inspection) {
                    if(!inspection) {
                        return;
                    }

                    // Set the inspection object.
                    self.inspection = inspection;

                    // Set the report type
                    objApp.keys.report_type = inspection.report_type;

                    // If we have an active inspection then show the coversheet notes button
                    if(self.finalised == 0) {
                        $("div.btnEditNotes").show();
                        $("a.btnEditClientNotes").show();
                        $("a.btnEditPrivateNotes").show();
                    } else {
                        $("div.btnEditNotes").hide();
                        $("a.btnEditClientNotes").hide();
                        $("a.btnEditPrivateNotes").hide();
                    }

                    // Show the next button
                    $(".inspectionDetails #btnStep1Next").show();

                    // Show the camera button
                    $('a[id="btnCapturePhoto"]').show();
                    self.checkIfNeedPhotos();

			        self.setReturnInspectionID(objApp.keys.inspection_id);
                    $('#btnCapturePhoto').attr('data-reveal-id', 'photoWrapper');

			        unblockElement("body");

			        // Show the toggle objects
			        $("#toggles").removeClass("hidden");

			        self.checkCanDelete();

                    self.doingSave = false;
                });

			});
	    }, 250);
	}

    /***
    * Sets the listing table column widths (headers and cells)
    * as required.
    */
    this.setTableWidths2 = function(tblHeader, tblBody, column, width)
    {
        // Setup table column widths
        var orientation = objApp.getOrientation();
        if(width === undefined)
        {
            var screenWidth = screen.width;
        }
        else
        {
            var screenWidth = width;
        }

        if(orientation == "landscape") {
            screenWidth = screen.width > screen.height?screen.width:screen.height;
        }

        var tableWidth = screenWidth - 50;
        var tableHeader = $("#" + tblHeader);
        var tableBody = $("#" + tblBody);

        $(tableHeader).css("width", tableWidth + "px");
        $(tableBody).css("width", tableWidth + "px");

        $(tableHeader).css("table-layout", "fixed");
        $(tableBody).css("table-layout", "fixed");
        var normal_col_width = Math.floor(tableWidth / column);
        // var last_col_width = tableWidth - (column - 1) * normal_col_width;
        for(var i = 0; i < column; i++)
        {
            if((tblHeader === "tblReinspectionHeader") && (tblBody === "tblReinspectionListing"))
            {
                $(tableHeader).find("th:eq("+i+")").css("width", 25 + "%");
                $(tableBody).find("tr td:eq("+i+")").css("width", 25 + "%");

            }
            else
            {
                if((tblHeader != "tblRateListingHeader") && (tblBody != "tblRateListing"))
                {
                    if(i == 0)
                    {
                        //$(tableHeader).find("th:eq("+i+")").css("width", 30 + "px");
                        $(tableBody).find("tr td:eq("+i+")").css("width", 30 + "px");
                    }
                }
                else
                {
                    $(tableHeader).find("th:eq("+i+")").css("width", normal_col_width + "px");
                    $(tableBody).find("tr td:eq("+i+")").css("width", normal_col_width + "px");
                }
            }
        }
    }

	/* **
	* loadInspectionItems loads the inspection items that belong to this inspection
	* and shows them in the items table
	 */
	this.loadInspectionItems = function()
	{  
	    locations = {};
        actions = {};
		// Ensure a valid inspection id is set
		if(objApp.keys.inspection_id == "")
		{
			return;
		}
        
        this.keySortArray = {};

		var listDeleteMode = true;

		if(self.hasReasonInReport(objApp.keys.report_type))
		{
			$("#tblDefectListingHeader th").eq(5).show();
		}
		else
		{
			$("#tblDefectListingHeader th").eq(5).hide();
		}

		// Unbind any more button events
		$("#defectScrollWrapper").unbind();
		$("#tblDefectListing td").unbind();
		$("#tblDefectListing a.edit_issue_btn").unbind();
        
        // Kill iScroll if it already exists
        if(self.scroller) {
            self.scroller.destroy();
            self.scroller = null;
        }        

		// Load the inspection items records
		//objDBUtils.orderBy = self.itemSortBy + " " + self.itemSortDir; //"seq_no DESC";
        objDBUtils.orderBy = "seq_no ASC";

		var filters = [];
		filters.push(new Array("inspection_id = '" + objApp.keys.inspection_id + "'"));

        var keyword = $('#keywords').val();
        if (keyword != '')
        {
            filter_string = "(location LIKE '%"+keyword+"%' OR observation LIKE '%"+keyword+"%' OR action LIKE '%"+keyword+"%' OR notes LIKE '%"+keyword+"%')";
            filters.push(new Array(filter_string));
        }

		blockElement('body');

		objDBUtils.loadRecords("inspectionitems", filters, function(param, items)
		{
		    unblockElement('body');
			$("#defectScrollWrapper").html("");            

            
			if(!items)
			{
				// Handle no items
			}
			else
			{
				// Loop through the items and put them into the table.
				var html = '<table id="tblDefectListing" class="listing">';
               
				var maxLoop = items.rows.length;

                self.numberOfIssues = 0;
                self.numberOfAcknowledgements = 0;
                var sq = 2;

				var r = 0;

                var added_items = [];

			    for(r = 0; r < maxLoop; r++)
			    {
			        var row = items.rows.item(r);
                    var seq_no = row.seq_no;
                    if (added_items.indexOf(row.id) != -1)
                        continue;
                    added_items.push(row.id);
                    
                    // Store the current sequence order of the row so we can quickly sort the
                    // items on move up / move down event.
                    self.keySortArray[sq] = row.id;
                    sq = sq + 2;

			        html += '<tr rel="' + row.id + '">';

                    if(self.finalised == 0) {
                        html += '<td class="delete"></td>';
                    } else {
                        html += '<td class="nodelete"></td>';
                    }

			        html += '<td><span class="seq_no">' + seq_no + '</span>';

                    if(self.finalised == 0) {
			            html += '<a href="#" rel="' + row.id + '" class="edit_issue_btn">Edit Issue</a>';

                        if (maxLoop > 1)
                        {
                            if (r == 0)
                                html += '<span class="arrow down"></span></td>';
                            else if (r == maxLoop - 1)
                                html += '<span class="arrow up"></span></td>';
                            else
                                html += '<span class="arrow up"></span><span class="arrow down"></span></td>';
			            }
                    }
                    
                    var key = row.location.trim();
                    if(locations.hasOwnProperty(key) )
                    {
                        locations[key] += 1;                         
                    }
                    else
                    {
                        locations[key] = 1; 
                    }
                    
                    html += '<td>' + row.location + '</td>';
			        html += '<td>' + row.observation + '</td>';
                    html += '<td>' + row.action + '</td>';
                    if (row.action)
                    {
                        row.action = $.trim(row.action.replace(/"/g, ''));
                        if (actions.hasOwnProperty(row.action))
                            actions[row.action] += 1;
                        else
                            actions[row.action] = 1;
                    }

					if(self.hasReasonInReport(objApp.keys.report_type))
					{
                        html += '<td>' + row.reason + '</td>';
					}

			        html += '</tr>';

                    if(row.itemtype == 0) {
                        self.numberOfIssues++;
                    } else {
                        self.numberOfAcknowledgements++;
                    }
				}
                
                /* If have actions, so graph with actions, if not, show graph with locations */
                if(!jQuery.isEmptyObject(actions))
                {                    
                    var data = new google.visualization.DataTable();                    
                      data.addColumn('string', 'Actions');
                      data.addColumn('number', 'Quantity');

                    var keys = [];
                    var total_defects = 0;
                    $.each( actions, function( key, value ) {
                        total_defects += parseInt(value);
                    });
                    $.each( actions, function( key, value ) {
                        if (keys.indexOf(key) == -1)
                            keys.push(key);
                        key += ': ' + value + ' (' + Math.round(value/total_defects*1000)/10.0 + '%)';
                        data.addRow([key, value]);
                    });

                    var fontSize = 14;
                    if (keys.length > 19){
                        fontSize = 13;
                    }
                    if (keys.length > 22){
                        fontSize = 12;
                    }
                    if (keys.length > 24){
                        fontSize = 11;
                    }
                    if (keys.length > 26){
                        fontSize = 10;
                    }
                    var options = {
                        title: '',
                        width: '100%',
                        height: '100%',     
                        pieSliceText: 'value',
                        is3D: true,
                        chartArea:{
                            left:50,
                            height: '99%',
                            top: '1%',
                            width: '100%'
                        },
                        legend: {
                            alignment: 'center',
                            width: '100%',
                            textStyle: {
                                fontSize: fontSize
                            }
                        }
                    };    
                    
                    chart.draw(data, options);                   
                }
                else if(!jQuery.isEmptyObject(locations))
                {                    
                    var data = new google.visualization.DataTable();                    
                      data.addColumn('string', 'Location');
                      data.addColumn('number', 'Quantity');
                      
                    $.each( locations, function( key, value ) {                     
                        data.addRow([key, value]);
                    });

                    var options = {
                        title: '',
                        width: '100%',
                        height: '100%',     
                        pieSliceText: 'percentage',
                        is3D: true,
                    };
                    
                    chart.draw(data, options);                   
                }

                current_inspection_id = objApp.keys.inspection_id;
                


				html += '</table>';

				$("#defectScrollWrapper").html(html);


				if(self.hasReasonInReport(objApp.keys.report_type)) {
					self.setTableWidths2('tblDefectListingHeader', 'tblDefectListing', 6);
                }
				else {
					self.setTableWidths2('tblDefectListingHeader', 'tblDefectListing', 5);
                }

				// if(objUtils.isMobileDevice())
			    {
                    self.scroller = new IScroll5("#defectScrollWrapper", { click: true, hScrollbar: false, vScrollbar: false, scrollbarClass: 'myScrollbarSm'});
				    
                    if(self.last_scroller_y != -1)
                    {
                        self.scroller.scrollTo(self.last_scroller_x, self.last_scroller_y);
                        self.last_scroller_x = -1;
                        self.last_scroller_y = -1;
                    }
                }

				// Bind the move up / move down arrow button events
                $("#tblDefectListing span.arrow").bind(objApp.touchEvent, function(e) {
                    e.preventDefault();

                    var current_row = $(this).parent().parent();
                    var inspection_item_id = current_row.attr("rel");

                    var direction = "down";
                    if($(this).hasClass("up")) {
                        direction = "up";
                    }

                    self.handleMoveInspectionItem(inspection_item_id, direction);
                });

                $('#tblDefectListing a.edit_issue_btn').bind(objApp.touchEvent, function(e){

                    
                    // if(objUtils.isMobileDevice())
                    {
                        self.last_scroller_x = self.scroller.x;
                        self.last_scroller_y = self.scroller.y;
                    }
                    e.preventDefault();
                    if(self.is_change_order)
                    {
                        is_change_order = false;
                        return;
                    }
                    var $t = $(this)
                        , inspection_item_id = this.rel;

					if(confirm("Would you like to edit this item?"))
					{
						blockElement('body');

    					// Load the inspection item record
    					objDBUtils.loadRecord("inspectionitems", inspection_item_id, function(inspection_item_id, item)
    					{
    						unblockElement('body');

    						if(!item)
    						{
    							return;
    						}

    						objApp.keys.inspection_item_id = item.id;
    						objApp.keys.level = item.level;
    						objApp.keys.area = item.area;
    						objApp.keys.issue = item.issue;
    						objApp.keys.detail = item.detail;

    						self.showStep2(item);

    					}, inspection_item_id);
					}
                });

				$("#tblDefectListing tr td.delete").bind(objApp.touchEvent, function(e)
				{
                    if(self.is_change_order)
                    {
                        is_change_order = false;
                        return;
                    }

					e.preventDefault();

                    // If the inspection is finalised - do nothing
                    if(self.finalised == 1) {
                        return;
                    }

					var inspection_item_id = $(this).parent().attr("rel");

					var parent = $(this).parent();
					var table = $(parent).parent();

				    // Remove any active states of the list items
				    $(table).find("tr").removeClass("active");

				    if(listDeleteMode)
				    {
						// Did the user click on the first column
						var idx = $(this).index();

						if(idx == 0)
						{
							// Setup delete
							// Get the item name
							var item_name = $(parent).find("td:eq(2)").text();
							item_name += ", " + $(parent).find("td:eq(3)").text();

							if(confirm("Delete '" + item_name + "', are you sure?"))
							{
								self.deleteDefect(inspection_item_id);
								return;
							}
						}
				    }
					return false;
				});

			}
		}, "");

	}

    this.handleMoveInspectionItem = function(inspection_item_id, direction)
    {
        // Locate this item in the sort array
        var found = false;
        if((!this.keySortArray) || ($.assocArraySize(this.keySortArray) == 0)) {
            return;
        }

        // Loop through the items in the key sort array and find the matching item
        for(var key in this.keySortArray) {
            if(this.keySortArray[key] == inspection_item_id) {
                found = true;

                key = parseInt(key);

                // Calculate the position of the new key
                var new_key = key + 3;

                if(direction == "up") {
                    new_key = key - 3;
                }

                // Add the new key/item pair
                this.keySortArray[new_key] = inspection_item_id;

                // Remove the old key
                delete this.keySortArray[key];
            }
        }

        var new_seq_no = 0;
        var counter = 0;
        var num_keys = $.assocArraySize(this.keySortArray);
        var sql = "UPDATE inspectionitems " +
            "SET seq_no = ?, dirty = 1 " +
            "WHERE id = ?";
        for(var key in this.keySortArray) {
            var inspection_item_id = this.keySortArray[key];

            new_seq_no++;
            counter++;

            // When we get to the last item, define a callback function that executes after the final
            // SQL update.  We will then reload the item table.
            if(counter == num_keys) {
                objDBUtils.execute(sql, [new_seq_no, inspection_item_id], function() {
                    self.loadInspectionItems();
                });
            } else {
                objDBUtils.execute(sql, [new_seq_no, inspection_item_id], null);
            }

        }

        // Reload table
        //
    }


    /**
    * Loads the reinspections screen.
    */
	this.loadReinspectionItems = function(reinspection_id)
	{
        if(objApp.empty(reinspection_id)) {
            alert("Inspections::loadReinspectionItems - Invalid reinspection id");
            return;
        }
        
        // Kill iScroll if it already exists
        if(self.scroller) {
            self.scroller.destroy();
            self.scroller = null;
        }
        $('body').addClass('reinspect');
        objDBUtils.loadRecord("reinspections", reinspection_id, function(param, reinspection) {
            if(!reinspection) {
                alert("Couldn't load the reinspection record!");
                return;
            }

            objApp.keys.inspection_id = reinspection.inspection_id;
            self.reinspectionKey = reinspection_id;
            self.finalised = 0;

            // We also need to load the inspection record

            objDBUtils.loadRecord("inspections", reinspection.inspection_id, function(param, inspection) {
                if(!inspection) {
                    alert("Couldn't load the inspection record!");
                    return;
                }

                objApp.keys.report_type = inspection.report_type;
                self.inspection = inspection;

                // Unbind events
                $('#tblReinspectionListing tr').unbind();
                $('#reinspection select#rectified').unbind();
                $("#reinspection a.passed").unbind();
                $("#reinspection a.failed").unbind();
                $('#btnReinspectNotes').unbind();
                $('#btnRWSave').unbind();

                $("#inspection #certificated").val(inspection.certificated);
                if (inspection.certificated == 1){
                    $('#btnCertificated').removeClass('hidden');
                    $('#btnUncertificated').addClass('hidden');
                }else{
                    $('#btnCertificated').addClass('hidden');
                    $('#btnUncertificated').removeClass('hidden');
                }

                // Clear the stage
                objApp.clearMain();

                // Set the headinggs
                objApp.setHeading("K-Spec Inspections");
                objApp.setSubHeading("Reinspection");
                objApp.setSubExtraHeading("", true);

                // Show the reinspection screen
                $("#reinspection").removeClass("hidden");

                // Ensure a valid inspection id is set
                $("#tblReinspectionHeader th").eq(3).show();

                // Initialise passed/failed indicators
                if(reinspection.failed == 1) {
                    $(".inspectionDetails .failed").addClass('active');
                    $(".inspectionDetails .passed").removeClass('active');
                } else {
                    $(".inspectionDetails .failed").removeClass('active');
                    $(".inspectionDetails .passed").addClass('active');
                }

                //if((inspection.report_type == "Builder: PCI/Final inspections" && objApp.keys.reinspection_id != "") || (inspection.report_type == "Fix / Plaster Inspection")) {
                if( (self.need5Steps(inspection.report_type) || self.need4Steps(inspection.report_type)) && objApp.keys.reinspection_id != "") {
                    objApp.setSubExtraHeading("Step 3 of 4", true);
                    $('#inspectionStep3 > .bottomBtns > a#btnStep3Email').hide();
                    $('#inspectionStep3 > .bottomBtns > .btnContainer.right > a#btnStep3Next').html('Next');
                    $('#inspectionStep4 > .bottomBtns > .btnContainer.right > a#btnStep4Next').html('Done');
                    $('#reinspection > .bottomBtns > .btnContainer.right > a#btnStep3Next').html('Next');
                    $('#reinspection > .bottomBtns > .btnContainer.right > a#btnStep4Next').html('Done');
                }

                // Load the reinspection items
                var sql = "SELECT ri.id, ii.seq_no, ii.location, ii.action, ii.observation, ri.rectified, r.failed " +
                    "FROM inspectionitems ii " +
                    "INNER JOIN reinspectionitems ri ON ri.inspectionitem_id = ii.id " +
                    "INNER JOIN reinspections r ON r.id = ri.reinspection_id " +
                    "WHERE ii.deleted = 0 " +
                    "AND r.id = ? " +
                    "ORDER BY ii.seq_no ASC";

                $("#reinspectionScrollWrapper").html("");

                objApp.showHideSpinner(true, "#reinspection");

                objDBUtils.loadRecordsSQL(sql, [reinspection_id], function(param, items) {
                    objApp.showHideSpinner(false, "#reinspection");

                    if(!items) {
                        return;
                    }

                    // Loop through the items and put them into the table.
                    var html = '<table id="tblReinspectionListing" class="listing">';

                    var maxLoop = items.rows.length;
                    var r = 0;

                    for(r = 0; r < maxLoop; r++) {

                        var row = items.rows.item(r);

                        html += '<tr data-id="' + row.id + '">';
                        html += '<td>' + row.seq_no + '</td>';
                        html += '<td>' + row.location + '</td>';
                        html += '<td>' + row.observation + '</td>';
                        html += '<td>' + row.action + '</td>';
                        html += '<td>' + row.rectified + '</td>';
                        html += '</tr>';
                    }

                    html += '</table>';

                    $("#reinspectionScrollWrapper").html(html);

                    self.setTableWidths2('tblReinspectionHeader', 'tblReinspectionListing', 5);

                    self.handleFinalised();

                    if(objUtils.isMobileDevice())
                    {
                        self.scroller = new IScroll('#reinspectionScrollWrapper', { click: true, hScrollbar: false, vScrollbar: false, scrollbarClass: 'myScrollbarSm'});
                    }

                    // Handle the event when the user clicks on a row in the item table
                    $('#tblReinspectionListing tr').bind(objApp.touchEvent, function() {

                        var reinspectionItemID = $(this).attr("data-id");
                        self.reinspectionItemRow = $(this);

                        var text = $(this).find("td:eq(0)").text() + ". ";
                        text += $(this).find("td:eq(1)").text() + ", ";
                        text += $(this).find("td:eq(2)").text();

                        var rectifiedText = $(this).find("td:eq(4)").text();

                        $('#reinspection select#rectified').val(rectifiedText);
                        $('#reinspection .infomation p').html(text);
                        $('#reinspection .infomation select#rectified').show();
                    });

                    // Handle the event when the rectified status of the item is updated
                    $('#reinspection select#rectified').bind("change", function() {

                        var rectified_status = $(this).val();
                        self.checkSaveRectifiedInspectionitem(rectified_status);

                    });

                    $("#reinspection a.passed").bind(objApp.touchEvent, function(){
                        self.updateReinspectionPassFail(0);
                    });

                    $("#reinspection a.failed").bind(objApp.touchEvent, function(){
                        self.updateReinspectionPassFail(1);
                    });

                    $("#Reinspectweather").bind(objApp.touchEvent, function(){
                        // Load the current reinspection record
                        objDBUtils.loadRecord("reinspections", self.reinspectionKey, function(param, reinspection) {
                            if(!reinspection) {
                                alert("Couldn't load the reinspection record!");
                                return;
                            } else {
                                $('#reinspectWeatherInput').val(reinspection.weather);
                            } 
                        }, "");
                    });

                    $('#btnRWSave').bind(objApp.touchEvent,function(e){
                        e.preventDefault();

                        var weather = $('#reinspectWeatherInput').val();

                        var sql = "UPDATE reinspections SET weather = ?, dirty = 1 WHERE id = ?";
                        objDBUtils.execute(sql,[weather,objApp.keys.reinspection_id],null);

                        revealWindow.hideModal();
                    });

                    $('#btnReinspectNotes').bind(objApp.touchEvent,function(e){

                        var objNoteModal = new noteModal("Reinspection Notes", self.reinspectionNotes, function(notes) {
                            self.reinspectionNotes = notes; // Update the self object with the current notes value

                            // Update the database too.
                            var sql = 'UPDATE reinspections SET notes = ?, dirty = 1 WHERE id = ?';
                            objDBUtils.execute(sql, [notes, reinspection_id], null);

                        });

                        objNoteModal.show();

                        if(self.finalised == 1)
                        {
                            objNoteModal.setReadOnly();
                        }
                    });
                });
            }, "");
        }, "");

        // Update the photo icon with the correct number of photos.
        this.refreshReinspectionPhotoCount(reinspection_id);

        $("#btnReinspectDelete").unbind();
        $("#btnReinspectDelete").bind(objApp.touchEvent, function(e) {
            if(confirm("Are you sure you wish to delete this Reinspection?")) {
                var sql = "UPDATE reinspections " +
                          "SET deleted = 1, dirty = 1 " +
                          "WHERE id = ?";

                objDBUtils.execute(sql, [objApp.getKey("reinspection_id")], null);

                self.setupInspections();
            }
        });

	}

    /**
    * Updates the reinspection photo count.
    */
    this.refreshReinspectionPhotoCount = function(reinspection_id) {
        objDBUtils.countTableRows("reinspectionitemphotos", "reinspection_id = ? AND deleted = 0", [reinspection_id], function(row) {
            if(!row) {
                alert("Unable to load reinspection photo count");
                return;
            }

            var num_photos = row.num_items;

            $("#reinspection #btnCapturePhoto div.numImgCurr").html(num_photos);
        });
    }

    // Update the reinspection and master inspection record with the new status
	this.updateReinspectionPassFail = function(failed)
    {
        blockElement('body');

        // Step 1 - Load the reinspection item
        var reinspectionID = this.reinspectionKey;

        objDBUtils.loadRecord("reinspections", reinspectionID, function(rectified_status, reinspection) {
            if(!reinspection) {
                alert("updateReinspectionPassFail - couldn't load reinspection");
                return false;
            }

            var currentdate = new Date();
            var curdate = currentdate.getFullYear() + "-"
                        + (currentdate.getMonth()+1)  + "-"
                        + currentdate.getDate();

            // Step 2 - Update the reinspection record
            var sql = "UPDATE reinspections " +
                "SET failed = ?, reinspection_date = ?, dirty = ? " +
                "WHERE id = ?";

            objDBUtils.execute(sql, [failed, curdate, 1, reinspectionID], function() {
                // Update the primary inspection record

                // Step 3 - Update the inspection record
                var sql = "UPDATE inspections " +
                    "SET failed = ?, dirty = 1 " +
                    "WHERE id = ?";

                objDBUtils.execute(sql, [failed, reinspection.inspection_id], function() {
                    // All done.
                    if(failed) {
                        $("#reinspectionFailed a").addClass('active');
                        $("#reinspectionPassed a").removeClass('active');
                    } else {
                        $("#reinspectionFailed a").removeClass('active');
                        $("#reinspectionPassed a").addClass('active');
                    }

                    unblockElement('body');
                });

            });
        });


        var sql = "UPDATE reinspections SET failed = ? WHERE id = ?";
        objDBUtils.execute(sql, [failed, self.reinspectionKey], function(){

        });
    }

	this.addNewBase = function(resource_type, resource_type_name, objSelector, parent_id)
	{
		// get the value the user has entered for the new item
		var new_value = $("#popSelector #popSelectorSearch").val();

		// if there is no value, do nothing
		if(new_value == "")
		{
			alert("Please enter the name of the item that you would like to add in the text box");
			$("#popSelector #popSelectorSearch").focus();
			return;
		}

		if(!confirm("Add a new " + resource_type_name + " called '" + new_value + "'.  Are you sure?"))
		{
			return;
		}

		var values = [resource_type, new_value];

		// Make sure this value doesn't already exist
		var sql = "SELECT * " +
			"FROM resources " +
			"WHERE resource_type = ? " +
			"AND name = ? " +
			"AND deleted = 0";

		if(parent_id != "")
		{
			sql += " AND parent_id = ?"
			values.push(parent_id);
		}


		objDBUtils.loadRecordSQL(sql, values, function(resource)
		{
			if(resource)
			{
				alert("Sorry, a " + resource_type_name + " already exists with this name");
				return;
			}

			sql = "INSERT INTO resources(id, resource_type, name, created_by, parent_id) " +
				"VALUES(?, ?, ?, ?, ?)";

			// Create a new insert key
			var new_id = objDBUtils.makeInsertKey(objApp.sync_prefix);

			// Get the logged in users id
			var user_id = localStorage.getItem("user_id");

			values = [new_id, resource_type, new_value, user_id];

			if(parent_id == "")
			{
				values.push(null);
			}
			else
			{
				values.push(parent_id);
			}

			objDBUtils.execute(sql, values, function()
			{
                if(objSelector != null)
                {
                    // Add the new item to the popselector
                    objSelector.addOption(new_id, new_value);

                    objSelector.sortAndRefresh();

                    // Select the new element and close the pop selector
                    objSelector.selectElementAndClose(new_id, new_value);
                }
            });
		});
	}

    this.addNewLocation = function()
	{
    	self.addNewBase(1, "location", self.objPopLocation, "");
	}

	this.addNewAction = function()
	{
		self.addNewBase(2, "action", self.objPopAction, "");
	}

    this.addNewObservationSuggession = function()
	{
		// get the value the user has entered for the new item
		var new_value = $("#observation").val();

		// if there is no value, do nothing
		if(new_value == "")
		{
			return;
		}

        var resource_type = 3;

		var values = [resource_type, new_value];

		// Make sure this value doesn't already exist
		var sql = "SELECT * " +
			"FROM resources " +
			"WHERE resource_type = ? " +
			"AND name = ? " +
			"AND deleted = 0";


		objDBUtils.loadRecordSQL(sql, values, function(resource)
		{
			if(resource)
			{
				console.log("Sorry, a observation suggession already exists with this name");
				return;
			}

			sql = "INSERT INTO resources(id, resource_type, name, created_by, parent_id) " +
				"VALUES(?, ?, ?, ?, ?)";

			// Create a new insert key
			var new_id = objDBUtils.makeInsertKey(objApp.sync_prefix);

			// Get the logged in users id
			var user_id = localStorage.getItem("user_id");

			values = [new_id, resource_type, new_value, user_id, null];
			objDBUtils.execute(sql, values, function()
			{
                console.log("Save a new observation suggession");

                var filters = [];
                filters.push(new Array("resource_type = 3"));
                objDBUtils.orderBy = "";

                $("#frmDefectDetails #observation_suggestion").empty();
            });
		});
	}

	/***
	* Checks to see if the current inspectio can be deleted or not
	* If the inspection has not yet been saved, or has not yet been finalised it cannot be deleted.
	* Inspections that have been finalised but have no items can also be deleted.
	*/
	this.checkCanDelete = function()
	{
		var showButton = false;

		if(objApp.keys.inspection_id == "")
		{
			// No inspection id means we can't delete the inspection.
			$("#inspection #btnDeleteInspection").addClass("hidden");
			return;
		}

		// Load the inspection record
		objDBUtils.loadRecord("inspections", objApp.keys.inspection_id, function(param, inspection)
		{
			if(inspection.finalised)
			{
				// A finalised inspection may only be deleted if it has no items
				var sql = "SELECT COUNT(*) as num_items " +
					"FROM inspectionitems " +
					"WHERE inspection_id = ? " +
					"AND deleted = 0";

				objDBUtils.loadRecordSQL(sql, [objApp.keys.inspection_id], function(row)
				{
					if(!row) return;

					if(row.num_items == 0)
					{
						// This inspection has no items.  Allow the inspection to be deleted
						$("#inspection #btnDeleteInspection").removeClass("hidden");
					}
					else
					{
						// This inspection has items.  It may not be deleted.
						if(!$("#inspection #btnDeleteInspection").hasClass("hidden"))
						{
							$("#inspection #btnDeleteInspection").addClass("hidden");
						}
					}

				});
			}
			else
			{
				$("#inspection #btnDeleteInspection").removeClass("hidden");
			}
		}, "");
	}

    this.handleFinalised = function()
    {
        if (self.finalised == 1)
        {
            // Set the active state
            $(".inspectionDetails .finished").addClass('active');

            // Hide the buttons etc
            $("div.btnEditNotes").hide();

            $('#btnStep3AddAnotherIssue').addClass('hidden');
            $('#btnStep3Back').addClass('hidden');
            $('#keywords').addClass('hidden');
            $("#btnReportPhotos").addClass("hidden");
            $("div.btnReinspect").show();

            // Show the next button
            $('#btnStep3Next').removeClass('hidden');

            // Set the rating select boxes to read-only
            $("#tblRateListing select.ratingSelect").attr("readonly", "readonly");
            $("#tblRateListing select.ratingSelect").attr("disabled", "disabled");

            $('#barrel_code').prop('disabled', true);
        }
        else
        {
            // Remove the active state
            $(".inspectionDetails .finished").removeClass('active');

            // Show the buttons etc
            $("div.btnEditNotes").show();
            $('#btnStep3AddAnotherIssue').removeClass('hidden');
            $('#btnStep3Back').removeClass('hidden');
            $('#finished').removeClass('active');
            $('#keywords').removeClass('hidden');
            if ($("#inspection #report_type2").val() != 'Client inspection')
                $("#btnReportPhotos").removeClass("hidden");
            $("div.btnReinspect").hide();
            $("#tblRateListing select.ratingSelect").removeAttr("readonly");
            $("#tblRateListing select.ratingSelect").removeAttr("disabled");

            $('#barrel_code').prop('disabled', false);
        }   
        
        this.setReadOnly();     
    }    
	
	/***
	* Sets the UI controls into read only mode if the inspection has been finalised.
	*/
	this.setReadOnly = function()
	{
        if(self.objPopBuilders == null) {
            return;    
        }		
        
        if(self.finalised == 1)
		{            
            self.objPopBuilders.prop( 'disabled', true );
            
            if(self.objToggleFailed != null) {
			    self.objToggleFailed.preventToggle = true;
            }
			
			if(self.objPopLocation != null ) self.objPopLocation.readOnly = true;
			if(self.objPopAction != null ) self.objPopAction.readOnly = true;
			
			$("#addPhotoContainer").css("visibility", "hidden");
			//$("#btnSaveDefect").css("visibility", "hidden");
			$("#btnDeleteDefect").css("visibility", "hidden");
			$("#btnAddDefect").css("visibility", "hidden");
            $("#btnAddDefect").css("display", "none");
			
			// When the inspection has been finalised, show the print button.
			$("#print").css("visibility", "visible");
		}
		else
		{
			self.objPopBuilders.prop( 'disabled', false );
            if(self.objToggleFailed != null) {
                self.objToggleFailed.preventToggle = false;
            }
			
			if(self.objPopLocation != null ) self.objPopLocation.readOnly = false;
			if(self.objPopAction != null ) self.objPopAction.readOnly = false;
			
			$("#addPhotoContainer").css("visibility", "visible");
			//$("#btnSaveDefect").css("visibility", "visible");
			$("#btnAddDefect").css("visibility", "visible");
            $("#btnAddDefect").css("display", "");
            $("#print").css("visibility", "hidden");
			
			if(objApp.getKey("inspection_item_id") != "")
			{
				$("#btnDeleteDefect").css("visibility", "visible");
			}					
		}
	}

	/***
	* The showPrintModal method is called when the user taps on the print icon
	*/
	this.showPrintModal = function()
	{
		$("#printModal").show();
		
		// Setup toggles
		$("#printModalClose").unbind();
		$("#sendToToggles a").unbind();
		$("#downloadReport").unbind();
		$("#sendReport").unbind();
		
		$("#sendToToggles").html("");
		
		var userEmail = localStorage.getItem("email");
		var clientEmail = "";
		var clientContactEmail = "";
		var siteContactEmail = "";
		// Load the client email address details
		var sql = "SELECT c.*, s.address1 as site_address1, s.address2 as site_address2, s.external_email as site_external_email " +
			"FROM clients c " + 
			"INNER JOIN inspections i ON c.id = i.client_id " +
			"INNER JOIN sites s ON i.site_id = s.id " +
			"WHERE i.id = ?";
			
		objDBUtils.loadRecordSQL(sql, [objApp.keys.inspection_id], function(client)
		{
			if(!client)
			{
				alert("Sorry, the client record could not be loaded.");
				return;
			}
			
			clientEmail = client.email;
			clientContactEmail = client.external_email;
			siteContactEmail = client.site_external_email;
			var addressStr = client.site_address1;
			if((addressStr != "") && (client.site_address2 != ""))
			{
				addressStr += ", " + client.site_address2;
			}
			
			$("#printModal #emailSubject").val("K-Spec Inspection Report");
			$("#printModal #emailMessage").val("Please find attached an inspection report for " + client.name + " at " + addressStr + ".");
		});
		
		var refreshSendTo = function()
		{
			var csv = userEmail;
			
			/*if($("#printModal #sendToMe").val() == 1)
			{
				csv += userEmail;	
			}*/
			
			if($("#printModal #sendToClient").val() == 1)
			{
				if(clientEmail != "")
				{
					if(csv != "") csv += ",";
					csv += clientEmail;	
				}
			}
			
			if($("#printModal #sendToExternalRef").val() == 1)
			{
				if(clientContactEmail != "")
				{
					if(csv != "") csv += ",";
					csv += clientContactEmail;	
				}
			}
			
			if($("#printModal #sendToExternalRef2").val() == 1)
			{
				if(siteContactEmail != "")
				{
					if(csv != "") csv += ",";
					csv += siteContactEmail;	
				}
			}			
			
			$("#printModal #emailTo").val(csv);
		};
		
		// Setup toggle controls
  		var objToggleSendToMe = new toggleControl("toggleSendToMe", "#printModal #sendToMe", "binary", "Me", function()
  		{
			refreshSendTo();		
  		}); 
  		 		
  		var objToggleSendToClient = new toggleControl("toggleSendToClient", "#printModal #sendToClient", "binary", "Client", function()
  		{
			refreshSendTo();	
  		}); 
  		
  		var objToggleSendToExternal = new toggleControl("toggleSendToExternal", "#printModal #sendToExternalRef", "binary", "Main Contact", function()
  		{
			refreshSendTo();	
  		});  
  		
  		var objToggleSendToExternal2 = new toggleControl("toggleSendToExternal2", "#printModal #sendToExternalRef2", "binary", "Site Contact", function()
  		{
			refreshSendTo();	
  		});   		 		 		
  		
  		
  		// Render toggle controls
  		objToggleSendToMe.render("#sendToToggles");		
		objToggleSendToClient.render("#sendToToggles");		
		objToggleSendToExternal.render("#sendToToggles");	
		objToggleSendToExternal2.render("#sendToToggles");
		
		refreshSendTo();
		
		/************************** BIND PRINT MODAL EVENTS *********************/
		
		/***
		* Trap the event when the user taps the close button.
		*/
		$("#printModalClose").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
			
			$("#printModal").hide();
		});
        
		
		$("#sendReport").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();   
			
			var emailSubject = $("#emailSubject").val();
			var emailMessage = $("#emailMessage").val();
			var emailTo = $("#emailTo").val();
			
			if(emailSubject == "")
			{
				alert("Please enter a subject for the email message");
				$("#emailSubject").focus();
				return;
			}
			
			if(emailMessage == "")
			{
				alert("Please enter a message for the email body");
				$("#emailMessage").focus();
				return;
			}
			
			if(emailTo == "")
			{
				alert("Please choose at least one email recipient");
				$("#emailTo").focus();
				return;
			}
            
			// Show the loader graphic
			blockElement('body');
			
			objApp.objSync.startSyncSilent(function(success)
			{
				if(success)
				{
					// The silent sync has completed successfully.
					// We can now send the report.
					var url = objApp.apiURL + "reports/send_inspection_report";
					
					var params = {};
					params["subject"] = emailSubject;
					params["recipients"] = emailTo;
					params["from"] = "noreply@K-Specapp.com";
					params["message"] = emailMessage;
					params["inspectionid"] = objApp.keys.inspection_id;
                    params['version'] = objApp.version;
                    // For authentication params
                    params["email"] = localStorage.getItem("email");
					params["password"] = localStorage.getItem("password");
                    params["anticache"] = Math.floor(Math.random() * 99999);
                    params["chart_image"] = $('#chart_image').val();
                    params["dummy"] = 'Here is dummy text. Post data will be cut off a part. This will fix that issue.';
                    $.post(url, params, function(data)
					{
						unblockElement('body');
                        
                        try {
                            data = jQuery.parseJSON(data);
                            
                            if(data.status == "OK")
                            {
                                $("#printModal").hide();
                                alert("Thank you. The inspection report has been created and sent successfully.");
                                removeChartFromQueue(objApp.keys.inspection_id);
                            }
                            else
                            {
                                alert("Sorry, something went wrong whilst launching the report. " + data.message);
                            }                            
                            
                        } catch (e) {
                            // error
                            alert("Sorry, an error occured whilst trying to send the report");
                            return;
                        }                        
					}, "");						
				}
				else
				{
					unblockElement('body');
					alert("Sorry, something went wrong whilst syncing your data back to the K-Spec server.  Please try again later.");
				}
			});					
		});
	}		
	
	this.setReturnInspectionID = function(inspection_id)
	{
		localStorage.setItem("inspection_id", inspection_id);		
	}
	
	this.setReturnReinspectionID = function(reinspection_id)
	{
		localStorage.setItem("reinspection_id", reinspection_id);		
	}
    
    this.showHistoryModal = function()
    {
        $("#historyModal").show();
        $("#historyModalClose").unbind();
        
        $("#historyModalClose").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
			$("#historyModal").hide();
		});
    }
    
    this.showContacts = function()
    {
        var userEmail = localStorage.getItem("email");
        var user_id = localStorage.getItem("user_id");
        
        if(user_id == "") {
            return;    
        }
        
		var clientEmail = "";
		var clientContactEmail1 = "";
        var clientContactEmail2 = "";
        var clientContactEmail3 = "";
        var clientExternalEmail = "";
		var siteContactEmail = "";
        var siteExtraContactEmail = "";
        
        $("#inspectionStep4 #btnStep4SendReport").unbind();
        
        var refreshSendTo = function()
		{
			var csv = "";
            
            $('#contacts_list .contactItems').each(function(){
                contact = $(this).val();
            
                if ($(this).is(':checked'))
                {
                    if (csv.indexOf(contact) == -1)
                    {
                        csv += contact + ",";
                    }
                }
            });
            
			$("#inspectionStep4 #emailTo").val(csv);
		};
        
        var checkContact = function(contact)
        {
            $('#contacts_list .contactItems').each(function(){
                val = $(this).val();
                if (val == contact)
                {
                    $(this).attr('checked', true);;
                }
            });
        }
        
        var split = function( val ) {
            return val.split( /,\s*/ );
        }
        
        var extractLast =function( term ) {
          return split( term ).pop();
        }
		
		// Load the client and site email address details
		var sql = "SELECT c.*, s.address1 as site_address1, s.address2 as site_address2, " +
                "s.email as site_email, s.external_email as site_external_email, " +
                "c1.first_name || ' ' || c1.last_name as contact1_name, c1.email as contact1_email, " +
                "c2.first_name || ' ' || c2.last_name as contact2_name, c2.email as contact2_email " +
			"FROM clients c " + 
			"INNER JOIN inspections i ON c.id = i.client_id " +
			"INNER JOIN sites s ON i.site_id = s.id " +
            "LEFT OUTER JOIN contacts c1 ON s.contact_id1 = c1.id " +
            "LEFT OUTER JOIN contacts c2 ON s.contact_id2 = c2.id " +
			"WHERE i.id = ?";
			
		objDBUtils.loadRecordSQL(sql, [objApp.keys.inspection_id], function(client)
		{
		    $('#contacts_list .contactItems').unbind();
			if(!client)
			{
				alert("Sorry, the client record could not be loaded.");
				return;
			}
			
			clientEmail = client.email;
            clientContactEmail1 = client.c1_email;
            clientContactEmail2 = client.c2_email;
            clientContactEmail3 = client.c3_email;
			clientExternalEmail = client.external_email;
			siteContactEmail = client.site_email;
            siteExtraContactEmail = client.site_external_email;
			
			var addressStr = client.site_address1;
			if((addressStr != "") && (client.site_address2 != ""))
			{
				addressStr += ", " + client.site_address2;
			}
            
            // Create an array to store the email addresses as we add them.
            // We will use this to avoid adding duplicates.
            var addedEmails = [];
			
			//$("#printModal #emailSubject").val("K-Spec Inspection Report");
			//$("#printModal #emailMessage").val("Please find attached an inspection report for " + client.name + " at " + addressStr + ".");
            
            // Also load any contacts that the user has favourited
            var sql = "SELECT c.first_name || ' ' || c.last_name as contact_name, c.email as contact_email " +
                "FROM contacts c " +
                "INNER JOIN contactsfavourites cf ON c.id = cf.contact_id " +
                "WHERE cf.user_id = ? " +
                "AND cf.deleted = 0 " +
                "AND c.deleted = 0 " +
                "ORDER BY c.first_name";
                
                objDBUtils.loadRecordsSQL(sql, [user_id], function(param, favourites) {
                
                var html = '<ul>';
                html += '<li><input class="contactItems" type="checkbox" value="'+userEmail+'" id="userEmail" title="Me"><label for="userEmail">Me ('+userEmail+')</label></li>';
                var index = 1;
                
                if ((clientContactEmail1) && (addedEmails.indexOf(clientContactEmail1.toLowerCase()) == -1))
                {
                    index++;
                    html += '<li><input class="contactItems" type="checkbox" value="'+clientContactEmail1+'" id="clientContactEmail1" title="Client Contact '+index.toString()+'"><label for="clientContactEmail1">Client Contact '+index.toString()+' ('+clientContactEmail1+')</label></li>';
                    addedEmails.push(clientContactEmail1.toLowerCase());
                }
                
                if ((clientContactEmail2) && (addedEmails.indexOf(clientContactEmail2.toLowerCase()) == -1))
                {
                    index++;
                    html += '<li><input class="contactItems" type="checkbox" value="'+clientContactEmail2+'" id="clientContactEmail2" title="Client Contact '+index.toString()+'"><label for="clientContactEmail2">Client Contact '+index.toString()+' ('+clientContactEmail2+')</label></li>';
                    addedEmails.push(clientContactEmail2.toLowerCase());
                }
                
                if ((clientContactEmail3) && (addedEmails.indexOf(clientContactEmail3.toLowerCase()) == -1))
                {
                    index++;
                    html += '<li><input class="contactItems" type="checkbox" value="'+clientContactEmail3+'" id="clientContactEmail3" title="Client Contact '+index.toString()+'"><label for="clientContactEmail3">Client Contact '+index.toString()+' ('+clientContactEmail3+')</label></li>';
                    addedEmails.push(clientContactEmail3.toLowerCase());
                }
                
                if ((siteContactEmail) && (addedEmails.indexOf(siteContactEmail.toLowerCase()) == -1))
                {
                    index++;
                    html += '<li><input class="contactItems" type="checkbox" value="'+siteContactEmail+'" id="siteContactEmail" title="Site Contact"><label for="siteContactEmail">Site Contact ('+siteContactEmail+')</label></li>';
                    addedEmails.push(siteContactEmail.toLowerCase());
                }
                
                if ((siteExtraContactEmail) && (addedEmails.indexOf(siteExtraContactEmail.toLowerCase()) == -1))
                {
                    index++;
                    html += '<li><input class="contactItems" type="checkbox" value="'+siteExtraContactEmail+'" id="siteExtraContactEmail" title="Site Ext. Contact"><label for="siteExtraContactEmail">Site Ext. Contact ('+siteExtraContactEmail+')</label></li>';
                    addedEmails.push(siteExtraContactEmail.toLowerCase());
                }
                
                if((client.contact1_email != null) && (client.contact1_email != "") && (addedEmails.indexOf(client.contact1_email.toLowerCase()) == -1))
                {
                    index++;
                    html += '<li><input class="contactItems" type="checkbox" value="' + client.contact1_email + '" id="siteContact1Email" title="Site Contact 1"><label for="siteContact1Email">' + client.contact1_name + '</label></li>';
                    addedEmails.push(client.contact1_email.toLowerCase());
                }
                
                if((client.contact2_email != null) && (client.contact2_email != "") && (addedEmails.indexOf(client.contact2_email.toLowerCase()) == -1))
                {
                    index++;
                    html += '<li><input class="contactItems" type="checkbox" value="' + client.contact2_email + '" id="siteContact2Email" title="Site Contact 2"><label for="siteContact2Email">' + client.contact2_name + '</label></li>';
                    addedEmails.push(client.contact2_email.toLowerCase());
                }  
                
                // Add Favourites to the list
                if(favourites)
                {
                    var maxLoop = favourites.rows.length;
                    
                    // Loop through all of the clients in the recordset.
                    for(r = 0; r < maxLoop; r++)
                    {
                        // Get the current row
                        var favourite = favourites.rows.item(r); 
                        
                        if((favourite.contact_email != "") && (addedEmails.indexOf(favourite.contact_email.toLowerCase()) == -1))
                        {
                            index++;
                            var UFID = "userFavourite" + index;
                            html += '<li><input class="contactItems" type="checkbox" value="' + favourite.contact_email + '" id="' + UFID + '" title="User Favourite"><label for="' + UFID + '">' + favourite.contact_name + '</label></li>';
                            addedEmails.push(favourite.contact_email.toLowerCase());
                        }                         
                    }                         
                }                          
                
                
                html += "</ul>";
                $('.inspectionDetails #contacts_list').html(html);
                
                $('#contacts_list .contactItems').bind('change', function(e){
                    refreshSendTo();
                });
                
                
                $("#emailTo").bind( "keydown", function( event ) {
                        if ( event.keyCode === $.ui.keyCode.TAB &&
                        $( this ).data( "autocomplete" ).menu.active ) {
                            event.preventDefault();
                        }
                    }).autocomplete({
                    source: function( request, response ) {
                      // delegate back to autocomplete, but extract the last term
                      response( $.ui.autocomplete.filter(
                        objApp.contacts, extractLast( request.term ) ) );
                    },
                    minLength: 0,
                    select: function( event, ui ) {
                        var terms = split( this.value );
                        // remove the current input
                        terms.pop();
                        var csv = $("#inspectionStep4 #emailTo").val();
                        if (csv.indexOf(ui.item.value) == -1)
                        {
                            // add the selected item
                            terms.push( ui.item.value );
                            checkContact(ui.item.value);
                            
                        }
                        // add placeholder to get the comma-and-space at the end
                        terms.push( "" );
                        this.value = terms.join(",");
                        return false;
                    }
                });                
                
                
            }, "");
		});
        
        $("#inspectionStep4 #btnStep4SendReport").bind(objApp.touchEvent, function(e)
		{
			e.preventDefault();
			
			//var emailSubject = $("#emailSubject").val();
			//var emailMessage = $("#emailMessage").val();
            var emailSubject = '';
			var emailMessage = '';
			var emailTo = $("#emailTo").val();
			
			if(emailSubject == "")
			{
                /*
				alert("Please enter a subject for the email message");
				$("#emailSubject").focus();
				return;
                */
                emailSubject = "JetQuo Inspection Report for " + self.objPopSites.getText();
			}
			
			if(emailMessage == "")
			{
				/*
                alert("Please enter a message for the email body");
				$("#emailMessage").focus();
				return;
                */
                emailMessage = "Hi there, please find attached a K-Spec inspection report for: <br/><br/>" +
                                "   Client: " + self.objPopBuilders.select2('data').text + "<br/>" +
                                "   Site: " + self.objPopSites.getText() + "<br/>" +
                                "   Inspection Date: " + $("#inspection #inspection_date").val() + "<br/>" +
                                "   Passed: ";
                                
                var failed = $("#inspection #failed").val();
                if (failed)
                    emailMessage += " No<br/>";
                else
                    emailMessage += " Yes<br/>";
                    
                emailMessage += "<br/>Please do not reply to this email as it was automatically generated.";
			}
			
			if(emailTo == "")
			{
				alert("Please choose at least one email recipient");
				//$("#emailTo").focus();
				return;
			}
            
			// Show the loader graphic
			blockElement('body');
			
			objApp.objSync.startSyncSilent(function(success)
			{
				if(success)
				{
					// The silent sync has completed successfully.
					// We can now send the report.
					var url = objApp.apiURL + "reports/send_inspection_report";
					
					var params = {};
					params["subject"] = emailSubject;
					params["recipients"] = emailTo;
					params["from"] = "noreply@K-Specapp.com";
					params["message"] = emailMessage;
					params["inspectionid"] = objApp.keys.inspection_id;
                    params["reinspectionid"] = objApp.keys.reinspection_id;
                    params['version'] = objApp.version;
                    // For authentication params
                    params["email"] = localStorage.getItem("email");
					params["password"] = localStorage.getItem("password");
                    params["anticache"] = Math.floor(Math.random() * 99999);
                    params["chart_image"] = $('#chart_image').val();
                    params["dummy"] = 'Here is dummy text. Post data will be cut off a part. This will fix that issue.';
                    $.post(url, params, function(data)
					{
						unblockElement('body');
                        
                        try {
                            data = jQuery.parseJSON(data);
                            
                            if(data.status == "OK")
                            {
                                alert("Thank you. The inspection report has been created and sent successfully.");
                                removeChartFromQueue(objApp.keys.inspection_id);
                            }
                            else
                            {
                                alert("Sorry, something went wrong whilst launching the report. " + data.message);
                            }                            
                        } catch (e) {
                            // error
                            alert("Sorry, an error occured whilst trying to send the report");
                            return;
                        }                        
					}, "");						
				}
				else
				{
					unblockElement('body');
					alert("Sorry, something went wrong whilst syncing your data back to the K-Spec server.  Please try again later.");
				}
			});					
		});
        
    }
    
    this.resolveEmailReportRecipients = function() {

        var office_email = 'dev3simb@gmail.com,vishnu@simb.com.au,phil@kspec.com.au';
        var builder_email = "";
        var user_email = localStorage.getItem("email");
        if(!self.inspection) {
            return false;
        }

        $("#frmEmailTo ul#list_email input[type='checkbox']").unbind();

        blockElement('body');

        objDBUtils.loadRecord("builders", self.inspection.builder_id, function(param, builder) {
            unblockElement('body');
            if(builder) {
                builder_email = builder.email;
            }

            var determineRecipients = function() {

                var recipients = user_email;
                var old_recipients = $("#recipients").val();
                
                if($("#emailToOffice").is(":checked")) {
                    recipients += "," + office_email;
                }
                else
                {
                    if(old_recipients != null)
                    {
                        old_recipients = jQuery.grep(old_recipients, function(value) {
                          return value != office_email;
                        });                         
                    }
                   
                }

                var need_builder_email = 0;
                if(($("#emailToBuilder").is(":checked")) && (!objApp.empty(builder_email))) {
                    if(!objApp.empty(recipients)) {
                        recipients += ",";
                    }
                    need_builder_email = 1;
                    recipients += builder_email;
                                             
                }
                else
                {
                    if(old_recipients != null)
                    {
                        old_recipients = jQuery.grep(old_recipients, function(value) {
                          return value != builder_email;
                        });                         
                    }
                   
                }                
                /*
                $('#emailList input[type=checkbox]').each(function () {
                    if( $(this).is(":checked") ) {
                        if(!objApp.empty(recipients)) {
                            recipients += ",";
                        }

                        recipients += $("label[for='"+$(this).val()+"']").text();
                    }
                });
                */
                if(old_recipients != null)
                    var recipients_array = $.merge(old_recipients, recipients.split(','));
                else
                    var recipients_array = recipients.split(',');

                var builder_email_not_in_address_book = 1;
                var options = "";
                $.each( email_options, function( key, value ) {   
                    if(jQuery.inArray(value, recipients_array) != -1) {   
                        options += "<option value='"+value+"' selected>"+value+"</option>";
                    }
                    else
                    {
                        options += "<option value='"+value+"' >"+value+"</option>";
                    }
                    if (value == builder_email){
                        builder_email_not_in_address_book = 0;
                    }
                });
                if (builder_email_not_in_address_book){
                    if (need_builder_email)
                        options += "<option value='"+builder_email+"' selected>"+builder_email+"</option>";
                    else
                        options += "<option value='"+builder_email+"'>"+builder_email+"</option>";
                }

                $("#recipients").html(options);
                
                $("#recipients").select2({
                      tags: true,
                      tokenSeparators: [',', ' '],
                      createTag: function(params) {
                            var email = params.term;
                            if( objApp.validateEmail(email) ) {
                                return {
                                  id: email,
                                  text: email
                                };
                            }
                            
                            return null;            
                        }
                }).on("change", function(e) {
                  // mostly used event, fired to the original element when the value changes
                  if($(this).val() == null)
                  {
                       $("#emailTo").val('');
                  }
                  else
                  {
                       var res = $(this).val().join(",");
                       $("#emailTo").val(res);                    
                  }

                })                
                $("#recipients").trigger('change');                
                
            }

            determineRecipients();

            $("#frmEmailTo ul#list_email input[type='checkbox']").change(function() {
                determineRecipients();
            });
            $("#emailList input[type=checkbox]").change(function() {
                determineRecipients();
            });

        }, "");

    }
    
    /**
    * Given an inspection object, this method builds a property address string.
    */
    this.buildInspectionAddress = function(inspection) {
        if(!inspection) {
            return "";
        }
        
        var result = "Lot " + inspection.lot_no.trim() + ", " + inspection.address.trim() + ", " + inspection.suburb.trim();
        return result;
    }

    this.handleCertificated = function(inspection) {
        if(confirm("Are you sure to make it certificated?")){
            $('#btnUncertificated').addClass('hidden');
            $('#btnCertificated').removeClass('hidden');
            $('#certificated').val(1);
            objApp.objInspection.checkSaveRateInspection();
        }else{
            $('#btnCertificated').addClass('hidden');
            $('#btnUncertificated').removeClass('hidden');
            $('#certificated').val(0);
            objApp.objInspection.checkSaveRateInspection();
        }
    }
    
    this.setValueYesNoItems = function(obj){
        for(var i = 1; i <= self.TOTAL_OMISSIONS_ITEMS; i++){
            if(obj['omission_item_' + i] == 1) {
                $('a[data-id="btnO'+i+'Yes"]').removeClass("yesno_disabled").addClass("yesno_enabled");
                $('a[data-id="btnO'+i+'No"]').removeClass("yesno_enabled").addClass("yesno_disabled");
                $("#omission_item_" + i).val("1");
            } else if(obj['omission_item_' + i] == 0) {
                $('a[data-id="btnO'+i+'Yes"]').removeClass("yesno_enabled").addClass("yesno_disabled");
                $('a[data-id="btnO'+i+'No"]').removeClass("yesno_disabled").addClass("yesno_enabled");
                $("#omission_item_" + i).val("0");
            }
        }
        for(var i in self.YES_NO_FIELDS){
            var f = self.YES_NO_FIELDS[i];
            if(obj[f] == 1) {
                $(".btn_"+f+"_yes").removeClass("yesno_disabled").addClass("yesno_enabled");
                $(".btn_"+f+"_no").removeClass("yesno_enabled").addClass("yesno_disabled");
                $("#" + f).val("1");
            } else if(obj[f] == 0) {
                $(".btn_"+f+"_yes").removeClass("yesno_enabled").addClass("yesno_disabled");
                $(".btn_"+f+"_no").removeClass("yesno_disabled").addClass("yesno_enabled");
                $("#" + f).val("0");
            }
        }
    }

    this.bindYesNoButtons = function(){
        for(var i = 1; i <= self.TOTAL_OMISSIONS_ITEMS; i++) {
            $('a[data-id="btnO'+i+'Yes"]').bind(objApp.touchEvent, function (e) {
                if (self.finalised == 1)
                    return false;
                var id = $(this).attr('data-id').replace('btnO', '').replace('Yes', '');
                $('a[data-id="btnO'+id+'Yes"]').removeClass("yesno_disabled").addClass("yesno_enabled");
                $('a[data-id="btnO'+id+'No"]').removeClass("yesno_enabled").addClass("yesno_disabled");
                $("#omission_item_" + id).val("1");
                objDBUtils.execute("UPDATE inspections SET omission_item_"+id+" = 1, dirty = 1 WHERE id = ?", [objApp.keys.inspection_id], function(){});
                return false;
            });
            $('a[data-id="btnO'+i+'No"]').bind(objApp.touchEvent, function (e) {
                if (self.finalised == 1)
                    return false;
                var id = $(this).attr('data-id').replace('btnO', '').replace('No', '');
                $('a[data-id="btnO'+id+'Yes"]').removeClass("yesno_enabled").addClass("yesno_disabled");
                $('a[data-id="btnO'+id+'No"]').removeClass("yesno_disabled").addClass("yesno_enabled");
                $("#omission_item_" + id).val("0");
                objDBUtils.execute("UPDATE inspections SET omission_item_"+id+" = 0, dirty = 1 WHERE id = ?", [objApp.keys.inspection_id], function(){});
                return false;
            });
        }
        for(var i in self.YES_NO_FIELDS){
            var f = self.YES_NO_FIELDS[i];
            $(".btn_"+f+"_yes").bind(objApp.touchEvent, function (e) {
                if (self.finalised == 1)
                    return false;
                var id = $(this).attr('data-id').replace('btn_', '').replace('_yes', '');
                $(".btn_"+id+"_yes").removeClass("yesno_disabled").addClass("yesno_enabled");
                $(".btn_"+id+"_no").removeClass("yesno_enabled").addClass("yesno_disabled");
                $("#" + id).val("1");
                if(objApp.keys.reinspection_id == "")
                    objDBUtils.execute("UPDATE inspections SET "+id+" = 1, dirty = 1 WHERE id = ?", [objApp.keys.inspection_id], function(){});
                return false;
            });
            $(".btn_"+f+"_no").bind(objApp.touchEvent, function (e) {
                if (self.finalised == 1)
                    return false;
                var id = $(this).attr('data-id').replace('btn_', '').replace('_no', '');
                $(".btn_"+id+"_yes").removeClass("yesno_enabled").addClass("yesno_disabled");
                $(".btn_"+id+"_no").removeClass("yesno_disabled").addClass("yesno_enabled");
                $("#" + id).val("0");
                if(objApp.keys.reinspection_id == "")
                    objDBUtils.execute("UPDATE inspections SET "+id+" = 0, dirty = 1 WHERE id = ?", [objApp.keys.inspection_id], function(){});
                return false;
            });
        }
    }

    this.need4Steps = function(report_type){
        return report_type == 'Builder: Enclosed inspections' || report_type == 'Builder: Fixing inspections'
            || report_type == 'Builder: Frame inspections' || report_type == 'Builder: Slab inspections'
            || report_type == 'Builder: PCI/Final inspections';
    }

    this.need5Steps = function(report_type){
        return report_type == 'Builder: Quality inspections';
    }

    this.showStage = function(report_type){
        $('.builder_slab, .builder_frame, .builder_australasian, .builder_pci, .builder_quality').hide();
        switch(report_type){
            case 'Builder: Enclosed inspections':
                $('.stage_name').html("'Enclosed Stage'");
                break;
            case 'Builder: Fixing inspections':
                $('.stage_name').html("''Fixing Stage'");
                break;
            case 'Builder: Frame inspections':
                $('.stage_name').html("''Frame Stage'");
                $('.builder_frame').show();
                break;
            case 'Builder: Slab inspections':
                $('.stage_name').html("'Base/Slab Stage'");
                $('.builder_slab').show();
                break;
            case 'Builder: PCI/Final inspections':
                $('.stage_name').html("'Practical Completion'");
                if (self.currentBuilderName() == 'Australasian'){
                    if(objUtils.isMobileDevice())
                    {
                        var scroller = new IScroll5('#installedItemsScrollWrapper2', { click: true, hScrollbar: false, vScrollbar: false, scrollbarClass: 'myScrollbarSm'});
                    }
                    $('.builder_australasian').show();
                }
                else{
                    $('.builder_pci').show();
                }
                break;
            case 'Builder: Quality inspections':
                $('.stage_name').html("'Practical Completion'");
                $('.builder_quality').show();
                break;
        }
    }

    this.currentBuilderName = function(builder_id){
        if (typeof builder_id == 'undefined'){
            if (self.inspection)
                builder_id = self.inspection.builder_id;
            else
                builder_id = $("#frmInspectionDetails #builder_id").val();
        }

        return $('#frmInspectionDetails #builder_id option[value="'+builder_id+'"]').html();
    }

    this.hasReasonInReport = function(report_type){
        return report_type == 'Builder: Quality inspections' || (report_type == 'Builder: PCI/Final inspections' && self.currentBuilderName() == 'Australasian');
    }
};

