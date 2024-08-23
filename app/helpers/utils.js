const UtilsHelper = ( function () {
	return {
		/**
		 * 
		 * @param {object} obj 
		 * @returns objectType [string|number|array|object|function]
		 */
		getObjectType( obj ) {
			return Object.prototype.toString.call( obj ).toLowerCase().slice( 8, -1 );
		}
	}
} )();

function logger( description, type = 'info' ) {
	if ( _Config.Logger ) {
		if ( Array.isArray( description ) ) {
			description = description
				.reduce( ( finalString, current ) => finalString += ( typeof current !== "string" ? JSON.stringify( current ) : current ) + " ", "" )
				.trim();
		}
		description = "[SimpleDBM] " + description;
		_Config.Logger.add( description, type );
	}
}