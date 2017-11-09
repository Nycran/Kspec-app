/***
* @author: SIMB Dev3
* @copyright: SIMB Pty Ltd 2010 - 2011
*/

var dbUpgrader = function()
{
	this.sites = function(old_version, new_version)
	{
		while(old_version < new_version)
		{
			// Incremement the vesion
			old_version = old_version + .1;
			
			switch(old_version)
			{
				case 1.1:
					// Do 1.1 upgrade  
					var sql = "ALTER TABLE sites ADD COLUMN 'external_contact' VARCHAR ";
					objDBUtils.execute(sql, null, null);
					
					sql = "ALTER TABLE sites ADD COLUMN 'external_email' VARCHAR ";
					objDBUtils.execute(sql, null, null);																						
					
					sql = "UPDATE app_tables SET version = ? WHERE table_name = ?";
					objDBUtils.execute(sql, [1.1, 'sites'], null);
					
					// Upgrade complete
					break;
					
				default:
					break;
			}
		}
	}	
    this.reinspections = function(old_version, new_version)
    {
        console.log("DOING REINSPECTIONS TABLE UPDATE: " + old_version + "," + new_version);
        while(old_version < new_version)
        {
            // Incremement the vesion
            old_version =  old_version + .1 ;
            
            // Force 1 decimal place
            old_version = old_version.toFixed(1) * 1;
            
            console.log("REINSPECTIONS OLD VERSION: " + old_version);

            switch(old_version)
            {
                case 1.1:

                    // Do 1.1 upgrade
                    // Execute SQL to add the new columns here
                    var sql = "ALTER TABLE reinspections ADD COLUMN 'weather' VARCHAR NULL";
                    objDBUtils.execute(sql, null, null);

                    var sql = "ALTER TABLE reinspections ADD COLUMN 'notes' TEXT NULL";
                    objDBUtils.execute(sql, null, null);

                    sql = "UPDATE app_tables SET version = ? WHERE table_name = ?";
                    objDBUtils.execute(sql, [1.1, 'reinspections'], null);
                    // Upgrade complete
                    break;

                case 1.2:

                    // Do 1.2 upgrade
                    // Execute SQL to add the new columns here
                    var sql = "ALTER TABLE reinspections ADD COLUMN 'min_roof_tiles' SMALLINT(6) DEFAULT 0";
                    objDBUtils.execute(sql, null, null);

                    var sql = "ALTER TABLE reinspections ADD COLUMN 'min_ridge_tiles' SMALLINT(6) DEFAULT 0";
                    objDBUtils.execute(sql, null, null);

                    var sql = "ALTER TABLE reinspections ADD COLUMN 'touch_up_paint' SMALLINT(6) DEFAULT 0";
                    objDBUtils.execute(sql, null, null);

                    var sql = "ALTER TABLE reinspections ADD COLUMN 'min_flooring_tiles' SMALLINT(6) DEFAULT 0";
                    objDBUtils.execute(sql, null, null);

                    var sql = "ALTER TABLE reinspections ADD COLUMN 'grout_samples' SMALLINT(6) DEFAULT 0";
                    objDBUtils.execute(sql, null, null);

                    var sql = "ALTER TABLE reinspections ADD COLUMN 'barrel_code' SMALLINT(6) DEFAULT 0";
                    objDBUtils.execute(sql, null, null);

                    sql = "UPDATE app_tables SET version = ? WHERE table_name = ?";
                    objDBUtils.execute(sql, [1.2, 'reinspections'], null);
                    // Upgrade complete
                    break;

                default:
                    break;
            }
        }
    }
    this.inspections = function(old_version, new_version)
    {
        while(old_version < new_version)
        {
            // Incremement the vesion
            old_version =  old_version + .1 ;

            switch(old_version)
            {
                case 1.1:

                    // Do 1.1 upgrade
                    // Execute SQL to add the new columns here
                    var sql = "ALTER TABLE inspections ADD COLUMN 'min_roof_tiles' SMALLINT(6) DEFAULT 0";
                    objDBUtils.execute(sql, null, null);

                    var sql = "ALTER TABLE inspections ADD COLUMN 'min_ridge_tiles' SMALLINT(6) DEFAULT 0";
                    objDBUtils.execute(sql, null, null);

                    var sql = "ALTER TABLE inspections ADD COLUMN 'touch_up_paint' SMALLINT(6) DEFAULT 0";
                    objDBUtils.execute(sql, null, null);

                    var sql = "ALTER TABLE inspections ADD COLUMN 'min_flooring_tiles' SMALLINT(6) DEFAULT 0";
                    objDBUtils.execute(sql, null, null);

                    var sql = "ALTER TABLE inspections ADD COLUMN 'grout_samples' SMALLINT(6) DEFAULT 0";
                    objDBUtils.execute(sql, null, null);

                    var sql = "ALTER TABLE inspections ADD COLUMN 'barrel_code' SMALLINT(6) DEFAULT 0";
                    objDBUtils.execute(sql, null, null);

                    sql = "UPDATE app_tables SET version = ? WHERE table_name = ?";
                    objDBUtils.execute(sql, [1.1, 'inspections'], null);
                    // Upgrade complete
                    break;

                case 1.2:
                    var sql = "ALTER TABLE 'inspections' CHANGE 'barrel_code' 'barrel_code' TEXT NULL DEFAULT NULL";
                    objDBUtils.execute(sql, null, null);
                    sql = "UPDATE app_tables SET version = ? WHERE table_name = ?";
                    objDBUtils.execute(sql, [1.1, 'inspections'], null);
                    // Upgrade complete
                    break;

                default:
                    break;
            }
        }
    }
};
