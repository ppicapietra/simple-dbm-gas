class DBM {

	constructor( spreadsheetId, sheetNameOrIndex = null, sheetPrefix = null ) {
		this.spreadsheetId = spreadsheetId;
		this.sheetNameOrIndex = sheetNameOrIndex;
		this.sheetPrefix = sheetPrefix;
		this.whereFilters = [];
		this.defaults = {};
		this.idStrategicType = DBM.ID_STRATEGY_TYPES.ID_STRATEGY_SEQUENTIAL;
	}

	static get ID_STRATEGY_TYPES() {
		return ID_STRATEGY_TYPES;
	}

	static spreadsheet( spreadsheetId ) {
		return new DBM( spreadsheetId );
	}

	static source( spreadsheetId, sheetNameOrIndex, as = null ) {
		return new DBM( spreadsheetId, sheetNameOrIndex, as );
	}

	sheet( sheetNameOrIndex, as = null ) {
		this.sheetNameOrIndex = sheetNameOrIndex;
		this.sheetPrefix = as;
		return this;
	}

	useIdStrategy( idStrategicType ) {
		if ( ![ DBM.ID_STRATEGY_TYPES.SEQUENTIAL, DBM.ID_STRATEGY_TYPES.TIMESTAMP, DBM.ID_STRATEGY_TYPES.UUID ].includes( idStrategicType ) ) {
			throw new Error( 'ID strategy type not valid' );
		}
		this.idStrategicType = idStrategicType;
		return this;
	}

	with( fieldName, comparisonOperator, filterValue ) {
		const longForm = arguments.length > 2;
		if ( longForm ) {
			this.whereFilters.push( [ fieldName, comparisonOperator, filterValue ] );
		} else {
			// could be a RegExp or just the default form
			if ( getObjectType_( comparisonOperator ) === "regexp" ) {
				this.whereFilters.push( [ fieldName, comparisonOperator, null ] );
			} else {
				this.whereFilters.push( [ fieldName, "=", comparisonOperator ] );
			}
		}
		return this;
	}

	withDefaults( defaultValues ) {
		this.defaults = defaultValues;
		return this;
	}

	join( spreadsheetId, sheetNameOrIndex, criterias, as = null ) {
		if ( !this.joinsConfig ) {
			this.joinsConfig = [];
		}
		// normalize criteria
		if ( getObjectType_( criterias ) === "array" ) { // it would be the correct value here
			if ( criterias[ 0 ] && getObjectType_( criterias[ 0 ] ) === 'string' ) { // Case 2: Array of strings
				criterias = [ criterias ];
			}
			else if ( getObjectType_( criterias[ 0 ] ) !== 'array' ) {
				throw new Error( `Invalid join criteria argument: ${ JSON.stringify( criterias[ 0 ] ) }` );
			}
		}
		else {
			throw new Error( `Invalid join criteria argument: ${ JSON.stringify( criterias ) }` );
		}

		criterias = criterias.map( criteria => {
			if ( 2 > criteria.length || criteria.length > 3 ) {
				throw new Error( `Invalid join criteria number of arguments: ${ JSON.stringify( criteria ) }` );
			}
			const longForm = criteria.length === 3;
			if ( longForm ) {
				const [ leftColumnName, comparisonOperator, rightColumnName ] = criteria;
				return [ leftColumnName, comparisonOperator, rightColumnName ];
			} else {
				const [ leftColumnName, rightColumnName ] = criteria;
				return [ leftColumnName, "=", rightColumnName ];
			}
		} );


		this.joinsConfig.push( { spreadsheetId, sheetNameOrIndex, criterias, as } );
		return this; // Allows chaining
	}

	select( fields = "*" ) {
		// Fetch main data and fields
		const mainTable = fetchData_( this.spreadsheetId, this.sheetNameOrIndex, this.sheetPrefix );

		// Handle joins
		if ( this.joinsConfig && this.joinsConfig.length > 0 ) {
			this.joinsConfig.forEach( joinConfig => {
				// Fetch joined data
				const joinTable = fetchData_( joinConfig.spreadsheetId, joinConfig.sheetNameOrIndex, joinConfig.as );
				// Perform the join operation
				const joinedTable = performJoin_( mainTable, joinTable, joinConfig.criterias );
				// Merge fields and data
				mainTable.fields = joinedTable.fields;
				mainTable.data = joinedTable.data;
			} );
		}

		// Apply filters to the dataset (WHERE clause)
		const filteredRows = filterTableData_( mainTable, this.whereFilters );

		// If a specific select of fields is provided, select only those fields
		if ( fields === "*" ) {
			return filteredRows.data
		} else {
			const normalizedFieldNames = validateSelectFields_( fields, mainTable.fields );
			const filteredTableFields = pickFields_( normalizedFieldNames, filteredRows );
			return filteredTableFields.data;
		}
	}

	insert( data ) {
		const spreadsheet = SpreadsheetApp.openById( this.spreadsheetId );
		const sheet = getObjectType_( this.sheetNameOrIndex ) === 'number' ? spreadsheet.getSheets()[ this.sheetNameOrIndex ] : spreadsheet.getSheetByName( this.sheetNameOrIndex );

		const fieldNames = sheet.getRange( 1, 1, 1, sheet.getLastColumn() ).getValues()[ 0 ];

		// Define a helper function to convert an object to a row based on fields.
		const objectToRow = ( obj, id ) => [ id ].concat( fieldNames.slice( 1 ).map( fieldName => obj[ fieldName ] || this.defaults[ fieldName ] || '' ) );

		const getNewSequentialId = () => {
			const lastRow = sheet.getLastRow();
			let lastId = lastRow > 1 ? sheet.getRange( lastRow, 1 ).getValue() : 0;
			return ( getObjectType_( lastId ) === 'number' ) ? lastId + 1 : ( parseInt( lastId, 10 ) || 0 ) + 1;
		}

		const generateId = () => {
			switch ( this.idStrategicType ) {
				case 'sequential':
					return getNewSequentialId();
				case 'uuid':
					return Utilities.getUuid();
				case 'timestamp':
					return new Date().getTime();
				default:
					throw new Error( 'Invalid ID strategy type' );
			}
		};

		// Process the data based on its type.
		let rowsToInsert = [];
		if ( getObjectType_( data ) === "array" ) {
			data.forEach( obj => {
				const validatedObj = validateRowObjectFields_( obj, fieldNames ); // Validar y obtener el objeto transformado
				rowsToInsert.push( objectToRow( validatedObj, generateId() ) );
			} );
		} else if ( getObjectType_( data ) === 'object' ) {
			const validatedData = validateRowObjectFields_( data, fieldNames );
			rowsToInsert = [ objectToRow( validatedData, generateId() ) ];
		} else {
			throw new Error( 'Invalid data type for insert' );
		}

		// Append the rows to the sheet.
		rowsToInsert.forEach( row => sheet.appendRow( row ) );

		return `Total inserted rows: ${ rowsToInsert.length }`;
	}

	update( newData ) {
		if ( !this.spreadsheetId || !this.sheetNameOrIndex ) {
			throw new Error( "Spreadsheet ID or Sheet name not provided" );
		}
		if ( !this.whereFilters || this.whereFilters.length === 0 ) {
			throw new Error( 'No filters set for update' );
		}

		let updatedRows = 0;
		const { fields: fieldNames, data } = fetchData_( this.spreadsheetId, this.sheetNameOrIndex )

		const normalizedNewData = validateRowObjectFields_( newData, fieldNames );
		// Apply filters to find the rows to update.
		const normalizedFilterFields = validateFiltersFields_( this.whereFilters, fieldNames );
		const rowsToUpdate = data.map( ( row, index ) => {
			const matches = normalizedFilterFields.every( filter => {
				const [ fieldName, comparisonOperator, filterValue ] = filter;
				const fieldIndex = fieldNames.indexOf( fieldName );

				if ( fieldIndex === -1 ) {
					throw new Error( `Field name is wrong: ${ fieldName }` );
				}

				const cellValue = row[ fieldIndex ];

				return evaluateFieldsOperation_( cellValue, comparisonOperator, filterValue );
			} );
			return {
				index: matches ? index + 2 : null, // +2 adjusts for array index and header
				oldValues: row
			}
		} )
			.filter( row => row.index !== null );

		if ( rowsToUpdate.length > 0 ) {
			const spreadsheet = SpreadsheetApp.openById( this.spreadsheetId );
			const sheet = getObjectType_( this.sheetNameOrIndex ) === 'number' ?
				spreadsheet.getSheets()[ this.sheetNameOrIndex ] : spreadsheet.getSheetByName( this.sheetNameOrIndex );

			if ( !sheet ) {
				throw new Error( `The sheet ${ this.sheetNameOrIndex } was not found in spreadsheet with ID ${ this.spreadsheetId }` );
			}

			rowsToUpdate.forEach( row => {
				const rowToUpdate = fieldNames.map( fieldName => {
					return Object.prototype.hasOwnProperty.call( normalizedNewData, fieldName ) ? normalizedNewData[ fieldName ] : row.oldValues[ fieldNames.indexOf( fieldName ) ];
				} );

				sheet.getRange( row.index, 1, 1, rowToUpdate.length ).setValues( [ rowToUpdate ] );
				updatedRows++
			} );
		}

		return `Total updated rows: ${ updatedRows }`;
	}

	delete() {
		if ( !this.spreadsheetId || !this.sheetNameOrIndex ) {
			throw new Error( "Spreadsheet ID or sheet name not provided" );
		}
		if ( !this.whereFilters || this.whereFilters.length === 0 ) {
			throw new Error( 'No filters set for delete' );
		}

		let deletedRows = 0;
		const { fields: fieldNames, data } = fetchData_( this.spreadsheetId, this.sheetNameOrIndex );
		const normalizedFilterFields = validateFiltersFields_( this.whereFilters, fieldNames );

		const rowsToDelete = data.map( ( row, index ) => {
			const matches = normalizedFilterFields.every( filter => {
				const [ fieldName, comparisonOperator, filterValue ] = filter;
				const fieldIndex = fieldNames.indexOf( fieldName );

				if ( fieldIndex === -1 ) {
					throw new Error( `Field name is wrong: ${ fieldName }` );
				}

				const cellValue = row[ fieldIndex ];
				return evaluateFieldsOperation_( cellValue, comparisonOperator, filterValue );
			} );

			return matches ? index + 2 : null; // +2 adjusts for array index and header
		} ).filter( index => index !== null );

		if ( rowsToDelete.length > 0 ) {
			const spreadsheet = SpreadsheetApp.openById( this.spreadsheetId );
			const sheet = getObjectType_( this.sheetNameOrIndex ) === 'number' ?
				spreadsheet.getSheets()[ this.sheetNameOrIndex ] : spreadsheet.getSheetByName( this.sheetNameOrIndex );

			if ( !sheet ) {
				throw new Error( `The sheet ${ this.sheetNameOrIndex } was not found in spreadsheet with ID ${ this.spreadsheetId }` );
			}

			// Start from the end to avoid index shifting issues
			rowsToDelete.reverse().forEach( rowIndex => {
				sheet.deleteRow( rowIndex );
				deletedRows++;
			} );
		}

		return `Total deleted rows: ${ deletedRows }`;
	}


}