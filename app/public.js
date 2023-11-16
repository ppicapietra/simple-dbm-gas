/**
 * 
 * @param {Object} logger an instance of SimpleLogger
 * 
 * @returns {Object} SimpleDBM instance
 */
function config( { logger } ) {

	Config_.Logger = logger;

	return this;
}

function spreadsheet(spreadsheetId) {
	return DBM.spreadsheet(spreadsheetId);
}
