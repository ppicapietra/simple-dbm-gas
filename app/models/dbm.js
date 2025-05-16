class Dbm {

	static get ID_STRATEGY_TYPES() {
		return {
			SEQUENTIAL: 1,
			UUID: 2,
			TIMESTAMP: 4
		}
	}

	static get ORDER_TYPES() {
		return {
			ASC: 1,
			DESC: 2
		}
	}

	/**
	 * ************************************
	 * ************************************
	 * STATIC FUNCTIONS
	 * ************************************
	 * ************************************
	 */

	static prefixFieldNames( fieldNames, prefix ) {
		return fieldNames.map( fieldName => `${ prefix }.${ fieldName }` );
	}

	/**
	 * 
	 * @param {Object} mainTable 
	 * @param {Object} joinTable 
	 * @param {string[][]} joinCriterias 
	 * @returns 
	 */
	static performJoin( mainTable, joinTable, joinCriterias ) {
		let joinedDataSet = [];


		const normalizedCriterias = Dbm.validateJoinCriteria( mainTable.fields, joinTable.fields, joinCriterias );

		mainTable.data.forEach( mainRow => {
			joinTable.data.forEach( joinRow => {
				if ( Dbm.isRowMatch( mainTable.fields, mainRow, joinTable.fields, joinRow, normalizedCriterias ) ) {
					joinedDataSet.push( [ ...mainRow, ...joinRow ] );
				}
			} );
		} );

		const joinedTableFields = [].concat( mainTable.fields, joinTable.fields );
		const data = joinedDataSet;

		return { fields: joinedTableFields, data };
	}

	static isRowMatch( mainFields, mainRow, joinFields, joinRow, joinCriterias ) {
		return joinCriterias.every( joinCriteria => {
			const [ mainFieldName, comparisonOperator, joinFieldName ] = joinCriteria;

			const mainFieldIndex = mainFields.indexOf( mainFieldName );
			const joinFieldIndex = joinFields.indexOf( joinFieldName );

			if ( mainFieldIndex === -1 || joinFieldIndex === -1 ) {
				throw new DbExceptionNotFound( "Campo no encontrado en las cabeceras" );
			}

			return Dbm.evaluateFieldsOperation( mainRow[ mainFieldIndex ], comparisonOperator, joinRow[ joinFieldIndex ] );
		} );
	}

	/**
	 * Validates a field name by checking if it exists in the provided field names.
	 * If the field name is found, it is returned. If the field name is not found,
	 * or if it is ambiguous (exists in multiple fields), an error is thrown if
	 * strict mode is enabled. Otherwise, undefined is returned.
	 *
	 * @param {string} fieldName - The name of the field to validate.
	 * @param {string[]} fieldNames - The list of field names to check against.
	 * @param {boolean} strictMode - Whether to throw an error if the field name is
	 *                               not found or ambiguous.
	 * @throws {DbExceptionMissingOrWrongParams} If the field name is not found or
	 *                                       ambiguous and strict mode is enabled.
	 * @return {string|undefined} The validated field name, or undefined if not found
	 *                            or ambiguous and strict mode is disabled.
	 */
	static validateFieldName( fieldName, fieldNames, strictMode ) {
		const matchedFields = fieldNames.filter( name =>
			name === fieldName || name.endsWith( `.${ fieldName }` )
		);
		if ( matchedFields.length !== 1 ) {
			if ( strictMode ) throw new DbExceptionMissingOrWrongParams( `Field name is wrong or ambiguous. Field name: ${ fieldName }. Fields: ${ fieldNames.join( ', ' ) }` );
			return undefined;
		}
		return matchedFields[ 0 ];
	}

	static validateRowObjectFields( rowObj, fieldNames, strictMode ) {
		const transformedRowObj = {};

		Object.keys( rowObj ).forEach( key => {
			const validatedKey = Dbm.validateFieldName( key, fieldNames, strictMode );
			if ( validatedKey ) transformedRowObj[ validatedKey ] = rowObj[ key ];
		} );

		return transformedRowObj;
	}

	/**
	 * 
	 * @param {String} phrase
	 * @returns {String} Hash for the phrase (SHA-256)
	 */
	static calculateStringHash( phrase ) {

		let hashBytes = Utilities.newBlob( phrase ).getBytes();
		const HashAlgorithm = Utilities.DigestAlgorithm.SHA_256;
		const hash = Utilities.computeDigest( HashAlgorithm, hashBytes );
		const hashHex = hash.map( function ( byte ) {
			return ( '0' + ( byte & 0xFF ).toString( 16 ) ).slice( -2 );
		} ).join( '' );

		return hashHex;
	}

	static validateJoinCriteria( leftTableFieldNames, rightTableFieldNames, criterias ) {
		return criterias.map( criteria => {
			const [ leftFieldName, comparisonOperator, rightFieldName ] = criteria;

			Dbm.validateComparisonOperator( comparisonOperator );
			try {
				// in joins validateFieldNames should always be strict
				const validatedLeftFieldName = Dbm.validateFieldName( leftFieldName, leftTableFieldNames, true );
				const validatedRightFieldName = Dbm.validateFieldName( rightFieldName, rightTableFieldNames, true );
				return [ validatedLeftFieldName, comparisonOperator, validatedRightFieldName ];
			}
			catch ( error ) {
				throw new DbExceptionMissingOrWrongParams( `One or more field names are ambiguous or wrong: ${ criteria }` );
			}
		} );
	}

	static validateFilters( filters, fieldNames ) {
		return filters.map( filter => {
			if ( filter instanceof OrClause ) return filter.validate( fieldNames ); // OrClause has its own validation method

			const [ filterFieldName, comparisonOperator, filterFieldValue ] = filter;

			Dbm.validateComparisonOperator( comparisonOperator );
			// validateFieldName should be strict here too
			const validatedFilterName = Dbm.validateFieldName( filterFieldName, fieldNames, true );
			return [ validatedFilterName, comparisonOperator, filterFieldValue ];
		} );
	}

	static validateComparisonOperator( operator ) {
		if ( ObjectHelper.getType( operator ) === "function" ) return;
		if ( typeof operator === "string"
			&& ![ "=", "!=", ">", "<", ">=", "<=", "not in", "in" ].includes( operator ) && !( /^\*\d+(<|>)?=$/.test( operator ) ) ) {
			throw new DbExceptionMissingOrWrongParams( "Comparison operator in filter isn't valid. operator: " + operator.toString() );
		}
	}

	static validateSelectFields( requestedFieldNames, tableFieldNames ) {
		const fieldsArray = ObjectHelper.getType( requestedFieldNames ) === "array" ? requestedFieldNames : [ requestedFieldNames ];

		return fieldsArray.map( fieldName => {
			return Dbm.validateFieldName( fieldName, tableFieldNames );
		} );
	}

	// Used for the WHERE clause
	static filterTableData( table, whereFilters ) {
		const { fields: fieldNames, data } = table;

		if ( !whereFilters || whereFilters.length === 0 ) return table;

		const normalizedWhereFilters = whereFilters.map( filters => Dbm.validateFilters( filters, fieldNames ) ); // for each filter group in where
		const filteredData = data.filter( row => {

			return normalizedWhereFilters.some( filters => { // for any OR filter group
				return filters.every( filter => { // for all AND filter group
					if ( filter instanceof OrClause ) return filter.evaluate( row, fieldNames ); // OrClause has its own evaluation method

					const [ filterFieldName, comparisonOperator, filterValue ] = filter;

					const fieldIndex = fieldNames.indexOf( filterFieldName );

					if ( fieldIndex === -1 ) {
						throw new DbExceptionMissingOrWrongParams( `Field name is wrong: ${ filterFieldName }` );
					}

					const value = row[ fieldIndex ];

					return Dbm.evaluateFieldsOperation( value, comparisonOperator, filterValue );
				} )

			} )
		} );

		return {
			fields: fieldNames,
			data: filteredData
		};
	}

	/**
	 * 
	 * @param {String} cellValue 
	 * @param {Any} operator string representing the comparisson or a function to apply to cell value and return a boolean or a regular expression to match against the cell value
	 * @param {Any} filterValue Date, String, Integer, Boolean, 
	 * @returns 
	 */
	static evaluateFieldsOperation( cellValue, operator, filterValue ) {
		// Helper function to parse and prepare values using DBParse class
		function parseAndPrepare( value ) {
			if ( ObjectHelper.getType( filterValue ) === "date" && typeof value === "string" ) {
				return new Date( value ).getTime();
			} else {
				return Parser.parse( Parser.prepareForStoring( value ) );
			}
		}
		// Helper function for numeric comparisons
		function evaluateNumericComparison( num1, num2, operator ) {
			switch ( operator ) {
				case ">":
					return num1 > num2;
				case "<":
					return num1 < num2;
				case ">=":
					return num1 >= num2;
				case "<=":
					return num1 <= num2;
			}
		}
		// Helper function for handling custom operators like "*n="
		function evaluateCustomOperators( str1, str2, operator ) {
			const match = /^(\*)\d+[=><]+$/.exec( operator );
			if ( match ) {
				const multiplier = parseInt( match[ 0 ].slice( 1, -1 ), 10 );
				switch ( operator.slice( -1 ) ) {
					case "=":
						return parseInt( str1 ) === parseInt( str2 ) * multiplier;
					case ">":
						return parseInt( str1 ) >= parseInt( str2 ) * multiplier;
					case "<":
						return parseInt( str1 ) <= parseInt( str2 ) * multiplier;
				}
			}
			throw new DbExceptionMissingOrWrongParams( `Unknown comparison type: ${ operator }` );
		}

		cellValue = parseAndPrepare( cellValue );
		filterValue = parseAndPrepare( filterValue );

		if ( ObjectHelper.getType( operator ) === "regexp" ) {
			return operator.test( cellValue );
		} else if ( ObjectHelper.getType( operator ) === "function" ) {
			return operator( cellValue );
		} else {
			switch ( operator ) {
				case "=":
					return cellValue === filterValue;
				case "!=":
					return cellValue !== filterValue;
				case ">":
				case "<":
				case ">=":
				case "<=":
					return evaluateNumericComparison( cellValue, filterValue, operator );
				case "not in":
					return Array.isArray( filterValue ) && !filterValue.includes( cellValue );
				case "in":
					return Array.isArray( filterValue ) && filterValue.includes( cellValue );
				default:
					return evaluateCustomOperators( cellValue, filterValue, operator );
			}
		}
	}

	// used for the SELECT clause
	static pickFields( fieldsToSelect, table ) {
		const { fields, data } = table;

		// Convert fieldsToSelect to an array if it's not already one
		fieldsToSelect = Array.isArray( fieldsToSelect ) ? fieldsToSelect : [ fieldsToSelect ];

		// Map the indices of the fields to select
		const selectedIndices = fieldsToSelect.map( field => fields.indexOf( field ) );

		// Map the data to only include the selected fields
		const selectedData = data.map( row => selectedIndices.map( index => row[ index ] ) );

		return { fields: fieldsToSelect, data: selectedData };
	}

	/**
	 * 
	 * @param {Object} table 
	 * @param {Object[]} orders 
	 * @returns {Object}
	 */
	static orderResults( table, orders ) {
		if ( !orders || orders.length === 0 ) return table;

		table.data.sort( ( a, b ) => {
			for ( let order of orders ) {
				const { field, type } = order;
				const fieldIndex = table.fields.indexOf( Dbm.validateFieldName( field, table.fields ) );
				if ( fieldIndex === -1 ) continue;

				const valueA = a[ fieldIndex ];
				const valueB = b[ fieldIndex ];

				if ( Dbm.evaluateFieldsOperation( valueA, "<", valueB ) ) return type === Dbm.ORDER_TYPES.ASC ? -1 : 1;
				if ( Dbm.evaluateFieldsOperation( valueA, ">", valueB ) ) return type === Dbm.ORDER_TYPES.ASC ? 1 : -1;
			}
			return 0;
		} );

		return table;
	}

	/**
	 * 
	 * @param {String[]} fieldNames row's fields names
	 * @param {Object} data Object with row data
	 * @returns {String} the hash of the row
	 */
	static calculateRowHash( fieldNames, data ) {
		const NOT_DESIRED_KEYS_HASH = [ 'id', 'hash', 'created_at', 'updated_at', 'deleted_at' ];
		let newHashPreliminar = fieldNames
			.filter( compoundFieldName => {
				let simpleFieldName = compoundFieldName.split( "." ).pop();
				return !NOT_DESIRED_KEYS_HASH.some( key => key === simpleFieldName );
			} )
			.reduce( ( hashString, fieldName ) => hashString + data[ fieldName ], "" );

		return Dbm.calculateStringHash( newHashPreliminar );
	}

	/**
	 * 
	 * @param {Object} obj 
	 * @param {String[]} tableFields 
	 */
	static filterObjectKeysWithTableFields( obj, tableFields ) {
		// TODO: Refactor logic to unificate filterObjectKeysWithTableFields and validateObjectFields
		let clone = { ...obj };
		let pureFieldNames = tableFields.map( fieldName => fieldName.includes( '.' ) ? fieldName.split( "." ).pop() : fieldName );
		Object.keys( clone ).forEach( objKey => {
			if ( !pureFieldNames.includes( objKey ) ) delete clone[ objKey ];
		} );

		return clone;
	}

	/**
	 * Takes an object with data used to update records, and return his key names transformed with the table prefix and allowing only those
	 * with the name matching one table field name
	 * @param {Object} obj 
	 * @param {String[]} tableFields 
	 * @param {Boolean} strictMode 
	 * @returns 
	 */
	static validateObjectFields( obj, tableFields ) {
		const transformedObj = {};
		const objKeys = Object.keys( obj );
		tableFields.forEach( tableFieldName => {
			const keyMatch = objKeys.some( key => tableFieldName === key || tableFieldName.endsWith( `.${ key }` ) );
			if ( keyMatch ) {
				transformedObj[ tableFieldName ] = obj[ tableFieldName.split( '.' )[ 1 ] ];
			}
		} )

		return transformedObj;
	}

	static spreadsheet( spreadsheetId ) {
		return new Dbm( spreadsheetId );
	}

	static source( spreadsheetId, sheetNameOrIndex, as = null ) {
		return new Dbm( spreadsheetId, sheetNameOrIndex, as );
	}

	constructor( spreadsheetId, sheetNameOrIndex = null, sheetAlias = null, idStrategicType = Dbm.ID_STRATEGY_TYPES.SEQUENTIAL, strictFieldsMatch = true ) {
		this.spreadsheetId = spreadsheetId;
		this.sheetNameOrIndex = sheetNameOrIndex;
		this.sheetAlias = sheetAlias;
		this.whereFilters = [];
		this.orders = [];
		this.defaults = {};
		this.idStrategicType = idStrategicType;
		this.strictFieldsMatch = strictFieldsMatch;
		this.includeDeleted = false;
		this.resultTable = null;
	}

	/**
		 * ************************************
		 * ************************************
		 * INSTANCE FUNCTIONS
		 * ************************************
		 * ************************************
		 */

	sheet( sheetNameOrIndex, as = null ) {
		this.sheetNameOrIndex = sheetNameOrIndex;
		this.sheetAlias = as;
		return this;
	}

	useIdStrategy( idStrategicType ) {
		if ( ![ Dbm.ID_STRATEGY_TYPES.SEQUENTIAL, Dbm.ID_STRATEGY_TYPES.TIMESTAMP, Dbm.ID_STRATEGY_TYPES.UUID ].includes( idStrategicType ) ) {
			throw new DbExceptionMissingOrWrongParams( 'ID strategy type not valid' );
		}
		this.idStrategicType = idStrategicType;
		return this;
	}

	resetQueryModifiers() {
		this.whereFilters = [];
		this.orders = [];
		this.defaults = {};
		this.includeDeleted = false;
	}

	_addNewFilterToGroup( filter ) {
		if ( this.whereFilters.length === 0 ) {
			this.whereFilters.push( [ filter ] );
		} else {
			this.whereFilters[ this.whereFilters.length - 1 ].push( filter );
		}
	}

	or() {
		if ( this.whereFilters.length !== 0 ) this.whereFilters.push( [] );
		return this;
	}

	orWhere( ...args ) {
		return this.or().where( ...args );
	}

	where( fieldName, comparisonOperator, filterValue ) {
		if ( arguments.length < 2 ) throw new DbExceptionMissingOrWrongParams( 'Missing arguments for with filter' );
		const longForm = arguments.length > 2;
		if ( longForm ) {
			this._addNewFilterToGroup( [ fieldName, comparisonOperator, filterValue ] );
		} else {
			// could be a RegExp or just the default form
			if ( ObjectHelper.getType( comparisonOperator ) === "regexp" ) {
				this._addNewFilterToGroup( [ fieldName, comparisonOperator, null ] );
			} else if ( ObjectHelper.getType( comparisonOperator ) === "function" ) {
				this._addNewFilterToGroup( [ fieldName, comparisonOperator ] );
			} else {
				this._addNewFilterToGroup( [ fieldName, "=", comparisonOperator ] );
			}
		}
		return this;
	}

	whereNotNull( fieldName ) {
		this._addNewFilterToGroup( [ fieldName, "!=", "" ] );
		return this;
	}

	whereNull( fieldName ) {
		this._addNewFilterToGroup( [ fieldName, "=", "" ] );
		return this;
	}

	whereIn( fieldName, values ) {
		this._addNewFilterToGroup( [ fieldName, "in", values ] );
		return this;
	}

	whereNotIn( fieldName, values ) {
		this._addNewFilterToGroup( [ fieldName, "not in", values ] );
		return this;
	}

	/**
	 * Adds one or more filtering conditions with an "OR" logic connector.
	 * @example whereAny( [ [ 'field1', '!=', 'val1' ], [ 'field2', '=', 'val2' ] ] );
	 * @param {...Object} args - The filtering conditions to be added.
	 * @return {Object} The Dbm instance for method chaining.
	 */
	whereAny( ...args ) {
		const lastGroup = this.whereFilters.length > 0 ? this.whereFilters[ this.whereFilters.length - 1 ] : [];
		let orFilters = [];
		for ( let i = 0; i < args.length; i++ ) {
			if ( args[ i ].length < 2 ) throw new DbExceptionMissingOrWrongParams( 'Missing arguments on one or more filters in whereAny clause' );
			let [ fieldName, comparisonOperator, filterValue ] = args[ i ];
			const longForm = args[ i ].length > 2;
			if ( longForm ) {
				orFilters.push( [ fieldName, comparisonOperator, filterValue ] );
			} else {
				// could be a RegExp or just the default form
				if ( ObjectHelper.getType( comparisonOperator ) === "regexp" || ObjectHelper.getType( comparisonOperator ) === "function" ) {
					orFilters.push( [ fieldName, comparisonOperator ] );
				} else {
					orFilters.push( [ fieldName, "=", comparisonOperator ] );
				}
			}
		}
		if ( this.whereFilters.length === 0 ) {
			this.whereFilters = [ [ new OrClause( orFilters ) ] ];
		}
		else {
			this.whereFilters[ this.whereFilters.length - 1 ] = [ ...lastGroup, new OrClause( orFilters ) ];
		}
		return this;
	}

	withDefaults( defaultValues ) {
		this.defaults = defaultValues;
		return this;
	}

	withTrash() {
		this.includeDeleted = true;
		return this;
	}

	orderBy( fieldName, orderType = Dbm.ORDER_TYPES.ASC ) {
		// Check if fieldName is defined
		if ( fieldName === undefined || fieldName === null ) {
			throw new DbExceptionMissingOrWrongParams( "The 'fieldName' parameter is required and cannot be null or undefined." );
		}
		if ( !this.orders ) {
			this.orders = [];
		}
		this.orders.push( { field: fieldName, type: orderType } );

		return this;
	}

	/**
	 * 
	 * @param {String} spreadsheetId Spreadsheet ID
	 * @param {String} sheetNameOrIndex Sheet ID or 0-index within its parent spreadsheet
	 * @param {Boolean} includeDeleted Indicates wheter or not it must include soft deleted records
	 * @param {String} fieldNamesPrefix Prefix to add to the field names. Default: Sheet Name
	 * @returns 
	 */
	fetchData( spreadsheetId, sheetNameOrIndex, includeDeleted = false, fieldNamesPrefix = null ) {
		logger( "spreadsheetId on fetchData: " + spreadsheetId, 'info' );
		logger( "sheetNameOrIndex on fetchData: " + sheetNameOrIndex, 'info' );
		const spreadsheet = SpreadsheetApp.openById( spreadsheetId );

		if ( !spreadsheet ) {
			throw new DbExceptionNotFound( `The spreadsheet with ID ${ spreadsheetId } doesn't exist` );
		}

		const sheet = typeof sheetNameOrIndex === 'number' ?
			spreadsheet.getSheets()[ sheetNameOrIndex ] : spreadsheet.getSheetByName( sheetNameOrIndex );


		if ( !sheet ) {
			throw new DbExceptionNotFound( `The sheet ${ sheetNameOrIndex } was not found in spreadsheet with ID ${ spreadsheetId }` );
		}

		const prefix = fieldNamesPrefix || sheet.getName();
		const range = sheet.getDataRange();
		let values = range.getDisplayValues();
		const withoutPrefixFieldNames = values.shift(); // Removes the first row and returns it

		//  filter deleted fields by default
		const deletedAtFieldIndex = withoutPrefixFieldNames.indexOf( "deleted_at" );
		if ( deletedAtFieldIndex !== -1 && !includeDeleted ) {
			values = values.filter( row => !row[ deletedAtFieldIndex ] || row[ deletedAtFieldIndex ] === 'null' )
		}

		// Prefixed field names
		const fields = Dbm.prefixFieldNames( withoutPrefixFieldNames, prefix );

		return { tablePrefix: prefix, fields, data: values };
	}

	/**
	 * 
	 * @param {String} spreadsheetId Spreadsheet ID
	 * @param {String} sheetNameOrIndex Sheet ID or 0-index within its parent spreadsheet
	 * @param {Boolean} includeDeleted Indicates wheter or not it must include soft deleted records
	 * @returns 
	 */
	fetchFormulas( spreadsheetId, sheetNameOrIndex, includeDeleted = false ) {
		const spreadsheet = SpreadsheetApp.openById( spreadsheetId );

		if ( !spreadsheet ) {
			throw new DbExceptionNotFound( `The spreadsheet with ID ${ spreadsheetId } doesn't exist` );
		}

		const sheet = typeof sheetNameOrIndex === 'number' ?
			spreadsheet.getSheets()[ sheetNameOrIndex ] : spreadsheet.getSheetByName( sheetNameOrIndex );


		if ( !sheet ) {
			throw new DbExceptionNotFound( `The sheet ${ sheetNameOrIndex } was not found in spreadsheet with ID ${ spreadsheetId }` );
		}

		const range = sheet.getDataRange();
		let values = range.getFormulas();
		const fields = values.shift(); // Removes the first row and returns it

		//  filter deleted fields by default
		const deletedAtFieldIndex = fields.indexOf( "deleted_at" );
		if ( deletedAtFieldIndex !== -1 && !includeDeleted ) {
			values = values.filter( row => !row[ deletedAtFieldIndex ] || row[ deletedAtFieldIndex ] === 'null' )
		}

		return { fields, data: values };
	}

	getTableFields() {
		logger( "spreadsheetId on fetchData: " + this.spreadsheetId, 'info' );
		logger( "sheetNameOrIndex on fetchData: " + this.sheetNameOrIndex, 'info' );
		const spreadsheet = SpreadsheetApp.openById( this.spreadsheetId );

		if ( !spreadsheet ) {
			throw new DbExceptionNotFound( `The spreadsheet with ID ${ this.spreadsheetId } doesn't exist` );
		}

		const sheet = typeof this.sheetNameOrIndex === 'number' ?
			spreadsheet.getSheets()[ this.sheetNameOrIndex ] : spreadsheet.getSheetByName( this.sheetNameOrIndex );


		if ( !sheet ) {
			throw new DbExceptionNotFound( `The sheet ${ this.sheetNameOrIndex } was not found in spreadsheet with ID ${ this.spreadsheetId }` );
		}

		const range = sheet.getRange( 1, 1, 1, sheet.getLastColumn() );
		let values = range.getDisplayValues();
		return values[ 0 ];
	}

	/**
	 * Defines an update/insert helper function to get a row structure from an object passed as argument,
	 * filtering fields to only get the ones for the table and parsing values to be saved.
	 * @param {Object} obj 
	 * @returns 
	 */
	objectToRow( obj, tableFields, id ) {

		obj.id = id;
		// normalize the object's values
		tableFields.forEach( fieldName => {
			obj[ fieldName ] = Parser.prepareForStoring( ( obj[ fieldName ] !== null && obj[ fieldName ] !== undefined ) ? obj[ fieldName ] : this.defaults[ fieldName ] );
		} )
		// get the hash value
		obj.hash = Dbm.calculateRowHash( tableFields, obj );
		// return the row array form of the object
		return tableFields.map( fieldName => obj[ fieldName ] );
	}

	/**
	 * Adds a join configuration to combine data from another spreadsheet.
	 * 
	 * @param {string} spreadsheetId - ID of the spreadsheet to join.
	 * @param {string|number} sheetNameOrIndex - Name or index of the sheet in the spreadsheet to join.
	 * @param {Array} criterias - Array of criteria for performing the join. Each criterion is an array that can contain two or three elements: the field name from the main table, optional comparison operator (default '='), and the field name from the table to join.
	 * @param {string|null} [as=null] - Optional alias to be used as a prefix for field names from the joined spreadsheet.
	 * @returns {Dbm} The Dbm instance to allow method chaining.
	 */
	join( spreadsheetId, sheetNameOrIndex, criterias, as = null ) {
		if ( !this.joinsConfig ) {
			this.joinsConfig = [];
		}
		// normalize criteria
		if ( ObjectHelper.getType( criterias ) === "array" ) { // it would be the correct value here
			if ( criterias[ 0 ] && ObjectHelper.getType( criterias[ 0 ] ) === 'string' ) { // Case 2: Array of strings
				criterias = [ criterias ];
			}
			else if ( ObjectHelper.getType( criterias[ 0 ] ) !== 'array' ) {
				throw new DbExceptionMissingOrWrongParams( `Invalid join criteria argument: ${ JSON.stringify( criterias[ 0 ] ) }` );
			}
		}
		else {
			throw new DbExceptionMissingOrWrongParams( `Invalid join criteria argument: ${ JSON.stringify( criterias ) }` );
		}

		criterias = criterias.map( criteria => {
			if ( 2 > criteria.length || criteria.length > 3 ) {
				throw new DbExceptionMissingOrWrongParams( `Invalid join criteria number of arguments: ${ JSON.stringify( criteria ) }` );
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

	//#region Query Methods

	/**
	 * 
	 * @param {[String | String[]]} fields fields to retrieve
	 * @returns {Dbm} the instance to allow method chaining
	 */
	select( fields = "*" ) {
		// Fetch main data and fields
		const mainTable = this.fetchData( this.spreadsheetId, this.sheetNameOrIndex, this.includeDeleted, this.sheetAlias );

		// Handle joins
		if ( this.joinsConfig && this.joinsConfig.length > 0 ) {
			this.joinsConfig.forEach( joinConfig => {
				// Fetch joined data
				const joinTable = this.fetchData( joinConfig.spreadsheetId, joinConfig.sheetNameOrIndex, false, joinConfig.as );
				// Perform the join operation
				const joinedTable = Dbm.performJoin( mainTable, joinTable, joinConfig.criterias );
				// Merge fields and data
				mainTable.fields = joinedTable.fields;
				mainTable.data = joinedTable.data;
			} );
		}

		// Apply filters to the dataset (WHERE clause)
		const filteredTable = Dbm.filterTableData( mainTable, this.whereFilters );

		// Apply defined orderings
		Dbm.orderResults( filteredTable, this.orders );

		// If a specific select of fields is provided, select only those fields
		this.resultTable = fields === "*" ?
			filteredTable
			: Dbm.pickFields( Dbm.validateSelectFields( fields, mainTable.fields ), filteredTable );

		// reset filters in Dbm instance
		this.resetQueryModifiers();

		logger( `SELECT. Total affected rows: ${ this.resultTable.data.length }`, 'info' );
		return this;
	}

	/**
	 * 
	 * @param {[String | String[]]} fields fields to retrieve
	 * @returns {Object} get the first item or throw an exception if there isn't one
	 */
	firstOrFail( fields = "*" ) {
		this.select( fields );
		if ( this.resultTable.data.length !== 0 ) {
			let row = this.resultTable.data[ 0 ];
			let parsedData = {};
			for ( let fieldIndex = 0; fieldIndex < row.length; fieldIndex++ ) {
				parsedData[ this.resultTable.fields[ fieldIndex ] ] = Parser.parse( row[ fieldIndex ] );
			}
			return parsedData;
		} else {
			throw new Error( "There is no record to return" );
		}
	}

	/**
	 * 
	 * @returns {Number} get the total number of records
	 */
	count() {
		this.select();
		return this.resultTable.data.length;
	}

	/**
	 * @param {[String | String[]]} fields fields to retrieve
	 * @returns {Object | null} get the first item or null
	 */
	first( fields = "*" ) {
		this.select( fields );
		if ( this.resultTable.data.length !== 0 ) {
			let row = this.resultTable.data[ 0 ];
			return this._rowArrayToObject( row );
		} else {
			return null
		}
	}

	/**
	 * @param {[String | String[]]} fields fields to retrieve
	 * @returns {Object | null} get the last item or null
	 */
	last( fields = "*" ) {
		this.select( fields );
		if ( this.resultTable.data.length !== 0 ) {
			let row = this.resultTable.data.pop();
			return this._rowArrayToObject( row );
		} else {
			return null
		}
	}

	_rowArrayToObject(row) {
		let parsedData = {};
		for ( let fieldIndex = 0; fieldIndex < row.length; fieldIndex++ ) {
			const parsedValue = Parser.parse( row[ fieldIndex ] );
			const originalFieldName = this.resultTable.fields[ fieldIndex ];
			const [ tableName, fieldName ] = originalFieldName.split( '.' );

			// initialize table key if it isn't exist yet
			if ( !parsedData[ tableName ] ) {
				parsedData[ tableName ] = {};
			}
			parsedData[ tableName ][ fieldName ] = parsedValue;
			parsedData[ originalFieldName ] = parsedValue;
		}
		return parsedData;
	}


	/**
		 * This method returns the result of the query as an array of arrays, without field names.
		 * @param {[String | String[]]} fields fields to retrieve
		 * @returns {Object[]} the result of the query
		 */
	get( fields = "*" ) {
		this.select( fields );
		let data = this.resultTable.data;
		let parsedData = [];
		for ( let i = 0; i < data.length; i++ ) {
			let row = data[ i ];
			let parsedRow = [];
			for ( let j = 0; j < row.length; j++ ) {
				parsedRow.push( Parser.parse( row[ j ] ) );
			}
			parsedData.push( parsedRow );
		}
		return parsedData;
	}

	/**
	 * Alias for getAllAsObjects
	 * @returns {Object[]} get all records as objects
	 */
	getAsObjects() {
		return this.getAllAsObjects();
	}

	/**
	 * 
	 * @returns {Object[]} get all records as objects
	 */
	getAllAsObjects() {
		this.select();
		const fields = this.resultTable.fields;
		let data = this.resultTable.data;
		let result = [];

		data.forEach( row => {
			result.push( this._rowArrayToObject( row ) );
		} );

		return result;
	}

	/**
	 * 
	 * @param {int} resultsPerPage 
	 * @param {int} pageNumber 
	 * @returns {Object} Paginator
	 */
	paginate( resultsPerPage, pageNumber ) {
		this.select( fields );
		const totalResults = this.resultTable.data.length;
		const totalPages = Math.ceil( totalResults / resultsPerPage );
		const startIndex = ( pageNumber - 1 ) * resultsPerPage;
		const endIndex = startIndex + resultsPerPage;

		const paginatedItems = this.resultTable.data.slice( startIndex, endIndex );

		return {
			currentPage: pageNumber,
			resultsPerPage: resultsPerPage,
			totalResults: totalResults,
			totalPages: totalPages,
			headers: this.resultTable.fields,
			data: paginatedItems
		};
	}
	//#endregion

	/**
	 * 
	 * @param {Object | Object[]} data to be inserted into DB
	 * @returns {Number} last id inserted
	 */
	insert( data ) {
		const timestampOperation = new Date();
		let lastSecuentialIdGenerated;
		var lock = LockService.getScriptLock();
		try {
			if ( lock.tryLock( 30000 ) ) {
				const spreadsheet = SpreadsheetApp.openById( this.spreadsheetId );
				const sheet = ObjectHelper.getType( this.sheetNameOrIndex ) === 'number' ? spreadsheet.getSheets()[ this.sheetNameOrIndex ] : spreadsheet.getSheetByName( this.sheetNameOrIndex );

				const fieldNames = sheet.getRange( 1, 1, 1, sheet.getLastColumn() ).getDisplayValues()[ 0 ];
				const getNewSequentialId = () => {
					if ( !lastSecuentialIdGenerated ) {
						const lastRow = sheet.getLastRow();
						const lastId = parseInt( lastRow > 1 ? sheet.getRange( lastRow, 1 ).getValue() : 0, 10 );
						lastSecuentialIdGenerated = lastId;
					}
					return ++lastSecuentialIdGenerated;
				}

				const generateId = () => {
					switch ( this.idStrategicType ) {
						case Dbm.ID_STRATEGY_TYPES.SEQUENTIAL:
							return getNewSequentialId();
						case Dbm.ID_STRATEGY_TYPES.UUID:
							return Utilities.getUuid();
						case Dbm.ID_STRATEGY_TYPES.TIMESTAMP:
							return new Date().getTime();
						default:
							throw new DbExceptionMissingOrWrongParams( 'Invalid ID strategy type' );
					}
				};

				// Process the data based on its type.
				let rowsToInsert = [];

				if ( ObjectHelper.getType( data ) === "array" ) {
					data.forEach( obj => {
						let validatedObj = Dbm.filterObjectKeysWithTableFields( obj, fieldNames );
						// add the timestamp markers
						if ( fieldNames.includes( 'updated_at' ) ) {
							validatedObj.updated_at = Parser.prepareForStoring( timestampOperation );
						}
						if ( fieldNames.includes( 'created_at' ) ) {
							validatedObj.created_at = Parser.prepareForStoring( timestampOperation );
						}

						const newId = generateId();
						const objRow = this.objectToRow( validatedObj, fieldNames, newId );

						rowsToInsert.push( objRow );
					} );
				} else if ( ObjectHelper.getType( data ) === 'object' ) {
					const validatedData = Dbm.filterObjectKeysWithTableFields( data, fieldNames );

					// add the timestamp markers
					if ( fieldNames.includes( 'updated_at' ) ) {
						validatedData.updated_at = Parser.prepareForStoring( timestampOperation );;
					}
					if ( fieldNames.includes( 'created_at' ) ) {
						validatedData.created_at = Parser.prepareForStoring( timestampOperation );;
					}
					const newId = generateId();
					rowsToInsert = [ this.objectToRow( validatedData, fieldNames, newId ) ];
				} else {
					throw new DbExceptionMissingOrWrongParams( 'Invalid argument for insert' );
				}

				const idFieldIndex = fieldNames.findIndex( field => field === "id" );

				if ( idFieldIndex === -1 ) {
					throw new DbExceptionTableUnexpedtedStructure( 'No ID field in table' )
				}

				// Append the rows to the sheet.
				rowsToInsert.forEach( row => {
					sheet.appendRow( row )
				} );


				// reset filters in Dbm instance
				this.resetQueryModifiers();

				logger( `INSERT. Total affected rows: ${ rowsToInsert.length }`, 'info' );
				const lastInsertedId = rowsToInsert[ rowsToInsert.length - 1 ][ idFieldIndex ];
				return lastInsertedId;
			}
			else {
				throw new DbExceptionTimeout( 'timeout. Try again' );
			}
		}
		catch ( error ) {
			logger( error.message, 'error' );
			lock.releaseLock()
			throw new DbExceptionInternalError( error.message, error );
		}
	}

	/**
	 * 
	 * @param {Object} originalData fields values
	 * @returns {Number} last id updated
	 */
	update( originalData ) {
		if ( !this.spreadsheetId || !this.sheetNameOrIndex ) {
			throw new DbExceptionMissingOrWrongParams( "Spreadsheet ID or Sheet name not provided" );
		}

		let affectedRows = 0;
		const { fields: fieldNames, data, tablePrefix } = this.fetchData( this.spreadsheetId, this.sheetNameOrIndex, true )
		const { fields: fieldNamesFormulas, data: dataFormulas } = this.fetchFormulas( this.spreadsheetId, this.sheetNameOrIndex, true )
		const timestampOperation = new Date();
		debug( 'fieldNames for filter obj fields', fieldNames )
		let newData = Dbm.validateObjectFields( originalData, fieldNames );

		if ( newData[ tablePrefix + '.id' ] ) {
			// clean all the current filters for ID if I have an ID defined to match against records
			this.whereFilters = this.whereFilters.map( whereFiltersGroup => whereFiltersGroup.filter( ( [ filterFieldName ] ) => filterFieldName !== "id" ) );
			if ( this.whereFilters.length === 0 ) {
				this.whereFilters.push( [ [ 'id', '=', newData[ tablePrefix + '.id' ] ] ] );
			}
			else {
				this.whereFilters[ 0 ] = [ 'id', '=', newData[ tablePrefix + '.id' ] ]; // if an object with ID is defined, the first filter is updated to match the record with that ID
			}
		}

		if ( !Array.isArray( this.whereFilters ) || this.whereFilters.length === 0 ) {
			throw new DbExceptionMissingOrWrongParams( 'No filters set for update' );
		}

		// remove data fields aren't allowed to update by this method
		delete newData[ tablePrefix + '.id' ];
		delete newData[ tablePrefix + '.updated_at' ];
		delete newData[ tablePrefix + '.created_at' ];

		// Apply filters to find the rows to update.
		const normalizedFilters = this.whereFilters.map( filterGroup => Dbm.validateFilters( filterGroup, fieldNames ) );
		let rowsToUpdate = data.map( ( row, index ) => {
			const match = normalizedFilters.some( filterGroup => filterGroup.every( filter => {
				if ( filter instanceof OrClause ) return filter.evaluate( row, fieldNames ); // orClause has its own evaluation method
				const [ filterFieldName, comparisonOperator, filterFieldValue ] = filter;
				const fieldIndex = fieldNames.indexOf( filterFieldName );

				if ( fieldIndex === -1 ) {
					throw new Error( `Field name is wrong: ${ filterFieldName }` );
				}

				const cellValue = row[ fieldIndex ];

				return Dbm.evaluateFieldsOperation( cellValue, comparisonOperator, filterFieldValue );
			} ) );
			return {
				index: match ? index + 2 : null, // why 2?: data first record is the 2nd row of the sheet, so row index 2, for array index 0. we just add 1 for headers row
				oldValues: row,
				values: {}
			}
		} )
			.filter( row => row.index !== null );

		if ( rowsToUpdate.length > 0 ) {
			var lock = LockService.getScriptLock();
			try {
				if ( lock.tryLock( 30000 ) ) {

					const spreadsheet = SpreadsheetApp.openById( this.spreadsheetId );
					const sheet = ObjectHelper.getType( this.sheetNameOrIndex ) === 'number' ?
						spreadsheet.getSheets()[ this.sheetNameOrIndex ] : spreadsheet.getSheetByName( this.sheetNameOrIndex );

					if ( !sheet ) {
						throw new Error( `The sheet ${ this.sheetNameOrIndex } was not found in spreadsheet with ID ${ this.spreadsheetId }` );
					}

					// we merge data and create the rows objects with the merged data
					let rowsObjToUpdate = rowsToUpdate.map( row => {
						fieldNames.forEach( ( fieldName, fieldIndex ) => {
							// values with undefined value, are discarded
							row.values[ fieldName ] = fieldName in newData && newData[ fieldName ] !== undefined ? Parser.prepareForStoring( newData[ fieldName ] ) : ( dataFormulas[ row.index - 2 ][ fieldIndex ] || row.oldValues[ fieldIndex ] );
						} );
						return row
					} );

					const HASH_COLUMN_NAME = tablePrefix + '.hash';
					const UPDATED_AT_COLUMN_NAME = tablePrefix + '.updated_at';
					// adds the new hash to each row for later comparissions
					let rowsToUpdateWithNewHash = rowsObjToUpdate.map( row => {
						row.values[ HASH_COLUMN_NAME ] = Dbm.calculateRowHash( fieldNames, row.values );
						return row;
					} )
						.map( row => { // should we update update_at field?
							if ( row.values[ HASH_COLUMN_NAME ] !== row.oldValues[ HASH_COLUMN_NAME ] ) {
								row.values[ UPDATED_AT_COLUMN_NAME ] = Parser.prepareForStoring( timestampOperation );
							}
							return row;
						} )

					rowsToUpdateWithNewHash.forEach( row => {
						const rowToUpdate = fieldNames.map( fieldName => row.values[ fieldName ] );

						sheet.getRange( row.index, 1, 1, rowToUpdate.length ).setValues( [ rowToUpdate ] );
						affectedRows++
					} );

					// reset filters in Dbm instance and unlock the sheet
					this.resetQueryModifiers();
					lock.releaseLock();

					logger( `UPDATE. Total affected rows: ${ affectedRows }`, 'info' );
					const lastUpdatedId = rowsToUpdate[ rowsToUpdate.length - 1 ].id;
					return lastUpdatedId;
				}
				else {
					throw new DbExceptionTimeout( 'timaout. Try again' );
				}
			}
			catch ( error ) {
				lock.releaseLock();
				throw new DbExceptionInternalError( error.message, error );
			}
		}
		else {
			logger( `UPDATE. Total affected rows: 0`, 'info' );
		}
	}

	delete( hardDelete = false ) {

		const timestampOperation = new Date();

		if ( !this.spreadsheetId || !this.sheetNameOrIndex ) {
			throw new DbExceptionMissingOrWrongParams( "Spreadsheet ID or sheet name not provided" );
		}
		if ( !this.whereFilters || this.whereFilters.length === 0 ) {
			throw new DbExceptionMissingOrWrongParams( 'No filters set for delete' );
		}

		let affectedRows = 0;

		if ( !hardDelete ) { // is a soft delete
			return this.update( { deleted_at: Parser.prepareForStoring( timestampOperation ) } );
		}

		const { fields: fieldNames, data } = this.fetchData( this.spreadsheetId, this.sheetNameOrIndex );
		const normalizedFilterFields = this.whereFilters.map( filterGroup => Dbm.validateFilters( filterGroup, fieldNames ) );

		const rowsToDelete = data.map( ( row, index ) => {
			const matches = normalizedFilterFields.some( filterGroup => filterGroup.every( filter => {
				if ( filter instanceof OrClause ) return filter.evaluate( row, fieldNames ); // orClause has its own evaluation method
				const [ fieldName, comparisonOperator, filterValue ] = filter;
				const fieldIndex = fieldNames.indexOf( fieldName );

				if ( fieldIndex === -1 ) {
					throw new DbExceptionMissingOrWrongParams( `Field name is wrong: ${ fieldName }` );
				}

				const cellValue = row[ fieldIndex ];
				return Dbm.evaluateFieldsOperation( cellValue, comparisonOperator, filterValue );
			} ) );

			return matches ? index + 2 : null; // +2 adjusts for array index and header
		} ).filter( index => index !== null );

		if ( rowsToDelete.length > 0 ) {

			var lock = LockService.getScriptLock();
			try {
				if ( lock.tryLock( 30000 ) ) {

					const spreadsheet = SpreadsheetApp.openById( this.spreadsheetId );
					const sheet = ObjectHelper.getType( this.sheetNameOrIndex ) === 'number' ?
						spreadsheet.getSheets()[ this.sheetNameOrIndex ] : spreadsheet.getSheetByName( this.sheetNameOrIndex );

					if ( !sheet ) {
						throw new DbExceptionNotFound( `The sheet ${ this.sheetNameOrIndex } was not found in spreadsheet with ID ${ this.spreadsheetId }` );
					}

					// Start from the end to avoid index shifting issues
					rowsToDelete.reverse().forEach( rowIndex => {
						sheet.deleteRow( rowIndex );
						affectedRows++;
					} );

					// reset filters in Dbm instance
					this.resetQueryModifiers();

					logger( `DELETE. Total affected rows: ${ affectedRows }`, 'info' );
					const lastDeletedId = rowsToDelete[ rowsToDelete.length - 1 ].id;
					return lastDeletedId;
				}
			}
			catch ( error ) {
				lock.releaseLock();
				throw new DbExceptionInternalError( error.message, error )
			}
		}
		else {
			logger( `DELETE. Total affected rows: 0`, 'info' );
		}
	}
}

function spreadsheet( spreadsheetId ) {
	return new Dbm( spreadsheetId );
}

function source( spreadsheetId, sheetNameOrIndex, as = null ) {
	return new Dbm( spreadsheetId, sheetNameOrIndex, as );
}