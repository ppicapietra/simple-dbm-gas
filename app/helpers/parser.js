class Parser {
	static prepareForStoring( value ) {
		if ( value === null || value === undefined ) {
			return "";
		}

		if ( typeof value === 'boolean' || typeof value === 'number' ) {
			return value.toString();
		}

		if ( value instanceof Date ) {
			return value.toUTCString();
		}

		if ( ObjectHelper.getType( value ) === 'array' ) {
			value = value.map( obj => {
				if ( ObjectHelper.getType( obj ) === "object" ) {
					return Parser._sortObjectKeys( obj );
				}
				return obj
			} );

			return JSON.stringify( value );
		}

		if ( ObjectHelper.getType( value ) === 'object' ) {
			let sortedObj = Parser._sortObjectKeys( value );
			return JSON.stringify( sortedObj );
		}

		// We assume the value is a string or string compatible, by default
		return value.toString();
	}

	static parse( value ) {
		// Check if the value is an empty string
		if ( value === "" ) {
			return null;
		}

		// Try converting to boolean
		if ( value?.toLowerCase() === "true" ) {
			return true;
		}
		if ( value?.toLowerCase() === "false" ) {
			return false;
		}

		// Try to convert a number
		const parsedNumber = Number( value );
		if ( !isNaN( parsedNumber ) ) {
			return parsedNumber;
		}

		// Try to convert a date
		if ( value?.includes( "GMT" ) ) {
			const parsedDate = new Date( value );
			if ( !isNaN( parsedDate.getTime() ) ) {
				return parsedDate;
			}
		}

		// Try to convert to JSON
		if ( ( value?.startsWith( "{" ) && value?.endsWith( "}" ) ) || ( value?.startsWith( "[" ) && value?.endsWith( "]" ) ) ) {
			try {
				const parsedJson = JSON.parse( value );
				if ( typeof parsedJson === "object" ) {
					return parsedJson;
				}
			} catch ( e ) {
				debug( "Parser", [ "Error parsing JSON", e ] );
			}
		}

		// Return as String if none of the above conditions are met
		return value;
	}

	static _sortObjectKeys( obj ) {
		const sortedObj = Object.keys( obj ).sort().reduce( ( result, key ) => {
			result[ key ] = obj[ key ];
			return result;
		}, {} );
		return sortedObj;
	}
}
