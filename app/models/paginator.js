class Paginator {

	constructor( table = {} ) {
		this.table_ = table;
		this.transformed_ = false;
	}

	/**
	 * @param {string[]} table 
	 */
	set table( table ) {
		this.table_ = table;
	}

	/**
	 * @return {string[]} table rows
	 */
	get data() {
		return this.table_.data;
	}

	/**
	 * @return {string[]} table headers
	 */
	get fields() {
		return this.table_.fields;
	}

	/**
	 * 
	 * @param {int} resultsPerPage 
	 * @param {int} pageNumber 
	 * @returns {Object} Paginator
	 */
	paginate( resultsPerPage, pageNumber ) {
		const totalResults = this.table_.data.length;
		const totalPages = Math.ceil( totalResults / resultsPerPage );
		const startIndex = ( pageNumber - 1 ) * resultsPerPage;
		const endIndex = startIndex + resultsPerPage;

		const paginatedItems = this.table_.data.slice( startIndex, endIndex );

		return {
			currentPage: pageNumber,
			resultsPerPage: resultsPerPage,
			totalResults: totalResults,
			totalPages: totalPages,
			headers: this.table_.fields,
			data: paginatedItems
		};
	}

	/**
	 * 
	 * @returns {string[]} get the first ítem or throw an exception if there isn't one
	 */
	firstOrFail() {
		if ( this.table_.data.length !== 0 ) {
			return this.table_.data[ 0 ];
		} else {
			throw new Error( "There is no record to return" );
		}
	}

	/**
	 * 
	 * @returns {string[] | null} get the first item or null
	 */
	first() {
		if ( this.table_.data.length !== 0 ) {
			return this.table_.data[ 0 ];
		} else {
			return null
		}

	}

	get() {
		return this.table_.data;
	}

	/**
 * @returns {Object[]} All the records obtained in select as objects with nested fields.
 */
	getAllAsObjects() {
		const fields = this.table_.fields;
		const data = this.table_.data;

		if ( this.transformed_ ) {
			return data;
		}

		const objectsArray = data.map( row => {
			let obj = {};

			row.forEach( ( value, index ) => {
				const originalFieldName = fields[ index ];
				const [ tableName, fieldName ] = originalFieldName.split( '.' );

				// initialize table key if it isn't exist yet
				if ( !obj[ tableName ] ) {
					obj[ tableName ] = {};
				}

				// assign the field value in nested object
				obj[ tableName ][ fieldName ] = value;
				// keep the original field name in the main array of fields
				obj[ originalFieldName ] = value;
			} );

			return obj;
		} );

		return objectsArray;
	}

	/**
		 * Applies a transformation function to each object in the data set and stores the result.
		 * @param {function} callback - The function to apply to each object.
		 * @returns {Paginator} Paginator instance to allow method chaining.
		 */
	transform( callback ) {
		if ( getObjectType_( callback ) !== 'function' ) {
			throw new Error( 'Callback must be a function' );
		}

		// Get all the data as an array of objects
		const dataAsObjects = this.getAllAsObjects();

		this.transformed_ = true;

		// Apply the transformation function to each object and store the result
		this.table_.data = dataAsObjects.map( callback );

		return this;
	}

}