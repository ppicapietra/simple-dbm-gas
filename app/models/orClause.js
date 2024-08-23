class OrClause {

	constructor( orCriterias ) {
		this.orCriterias = orCriterias;
	}

	validate( fieldNames ) {
		this.orCriterias = Dbm.validateFilters( this.orCriterias, fieldNames );
		return this;
	}

	/**
	 * Evaluates the given filters over a row, returns true if one of the evaluation criteria are met. False otherwise.
	 *
	 * @param {Object} row - The row to evaluate.
	 * @param {Array} fieldNames - The array of field names of the table.
	 * @return {Boolean} Returns true if the evaluation criteria are met, otherwise false.
	 */
	evaluate( row, fieldNames ) {

		if ( this.orCriterias.length === 0 ) {
			return true;
		}

		return this.orCriterias.some( orCriteria => {
			const [ filterFieldName, comparisonOperator, filterFieldValue ] = orCriteria;
			const fieldIndex = fieldNames.indexOf( filterFieldName );

			if ( fieldIndex === -1 ) {
				throw new Error( `Field name is wrong: ${ filterFieldName }` );
			}

			const cellValue = row[ fieldIndex ];

			return Dbm.evaluateFieldsOperation( cellValue, comparisonOperator, filterFieldValue );
		} )
	}

	toJSON() {
		return this.orCriterias;
	}
}