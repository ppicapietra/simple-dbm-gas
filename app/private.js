function logger_( description, type = 'info' ) {
  if ( Config_.Logger ) {
    Config_.Logger.add( description, type );
  }
}

function fetchData_( spreadsheetId, sheetNameOrIndex, fieldNamePrefix = null ) {
  const spreadsheet = SpreadsheetApp.openById( spreadsheetId );
  const sheet = typeof sheetNameOrIndex === 'number' ?
    spreadsheet.getSheets()[ sheetNameOrIndex ] : spreadsheet.getSheetByName( sheetNameOrIndex );


  if ( !sheet ) {
    throw new Error( `The sheet ${ sheetNameOrIndex } was not found in spreadsheet with ID ${ spreadsheetId }` );
  }

  const prefix = fieldNamePrefix || sheet.getName();
  const range = sheet.getDataRange();
  const values = range.getValues();
  const withoutPrefixFieldNames = values.shift(); // Removes the first row and returns it

  // Prefixed field names
  fields = prefixFieldNames_( withoutPrefixFieldNames, prefix );

  return { fields, data: values };
}

function prefixFieldNames_( fieldNames, prefix ) {
  return fieldNames.map( fieldName => `${ prefix }.${ fieldName }` );
}

/**
 * 
 * @param {object} obj 
 * @returns objectType [string|number|array|object|function]
 */
function getObjectType_( obj ) {
  return Object.prototype.toString.call( obj ).toLowerCase().slice( 8, -1 );
}

/**
 * 
 * @param {Object} mainTable 
 * @param {Object} joinTable 
 * @param {string[][]} joinCriterias 
 * @returns 
 */
function performJoin_( mainTable, joinTable, joinCriterias ) {
  let joinedDataSet = [];


  const normalizedCriterias = validateCriteriaFields_( mainTable.fields, joinTable.fields, joinCriterias );

  mainTable.data.forEach( mainRow => {
    joinTable.data.forEach( joinRow => {
      if ( isRowMatch_( mainTable.fields, mainRow, joinTable.fields, joinRow, normalizedCriterias ) ) {
        joinedDataSet.push( [ ...mainRow, ...joinRow ] );
      }
    } );
  } );

  const joinedTableFields = [].concat( mainTable.fields, joinTable.fields );
  const data = joinedDataSet;

  return { fields: joinedTableFields, data };
}

function isRowMatch_( mainFields, mainRow, joinFields, joinRow, joinCriterias ) {
  return joinCriterias.every( joinCriteria => {
    const [ mainFieldName, comparisonOperator, joinFieldName ] = joinCriteria;

    const mainFieldIndex = mainFields.indexOf( mainFieldName );
    const joinFieldIndex = joinFields.indexOf( joinFieldName );

    if ( mainFieldIndex === -1 || joinFieldIndex === -1 ) {
      throw new Error( "Campo no encontrado en las cabeceras" );
    }

    return evaluateFieldsOperation_( mainRow[ mainFieldIndex ], comparisonOperator, joinRow[ joinFieldIndex ] );
  } );
}

function validateFieldName_( fieldName, fieldNames ) {
  const matchedFields = fieldNames.filter( name =>
    name === fieldName || name.endsWith( `.${ fieldName }` )
  );
  if ( matchedFields.length !== 1 ) {
    throw new Error( `Field name is ambiguous or wrong: ${ fieldName }` );
  }
  return matchedFields[ 0 ];
}

function validateRowObjectFields_( rowObj, fieldNames ) {
  const transformedRowObj = {};

  Object.keys( rowObj ).forEach( key => {
    const validatedKey = validateFieldName_( key, fieldNames );
    transformedRowObj[ validatedKey ] = rowObj[ key ];
  } );

  return transformedRowObj;
}


function validateCriteriaFields_( leftTableFieldNames, rightTableFieldNames, criterias ) {
  return criterias.map( criteria => {
    const [ leftFieldName, comparisonOperator, rightFieldName ] = criteria;

    try {
      const validatedLeftFieldName = validateFieldName_( leftFieldName, leftTableFieldNames );
      const validatedRightFieldName = validateFieldName_( rightFieldName, rightTableFieldNames );
      return [ validatedLeftFieldName, comparisonOperator, validatedRightFieldName ];
    }
    catch ( error ) {
      throw new Error( `One or more field names are ambiguous or wrong: ${ criteria }` );
    }
  } );
}

function validateFiltersFields_( filters, fieldNames ) {
  return filters.map( filter => {
    const [ filterName, comparisonOperator, filterValue ] = filter;

    const validatedFilterName = validateFieldName_( filterName, fieldNames );
    return [ validatedFilterName, comparisonOperator, filterValue ];
  } );
}

function validateSelectFields_( requestedFieldNames, tableFieldNames ) {
  const fieldsArray = getObjectType_( requestedFieldNames ) === "array" ? requestedFieldNames : [ requestedFieldNames ];

  return fieldsArray.map( fieldName => {
    return validateFieldName_( fieldName, tableFieldNames );
  } );
}

// Used for the WHERE clause
function filterTableData_( table, whereFilters ) {
  const { fields: fieldNames, data } = table;

  const normalizedWhereFilters = validateFiltersFields_( whereFilters, fieldNames );
  const filteredData = data.filter( row => {

    return normalizedWhereFilters.every( filter => {
      const [ filterFieldName, comparisonOperator, filterValue ] = filter;

      const fieldIndex = fieldNames.indexOf( filterFieldName );

      if ( fieldIndex === -1 ) {
        throw new Error( `Field name is wrong: ${ filterFieldName }` );
      }

      const value = row[ fieldIndex ];

      return evaluateFieldsOperation_( value, comparisonOperator, filterValue );
    } )
  } );

  return {
    fields: fieldNames,
    data: filteredData
  };
}

function evaluateFieldsOperation_( cellValue, operator, filterValue ) {

  if ( getObjectType_( cellValue ) === "date" ) {
    cellValue = cellValue.getTime();
  }
  if ( getObjectType_( filterValue ) === "date" ) {
    filterValue = filterValue.getTime();
  }

  const numCellValue = parseFloat( cellValue );
  const numFilterValue = parseFloat( filterValue );
  const bothAreNumbers = !isNaN( numCellValue ) && !isNaN( numFilterValue );

  if ( getObjectType_( operator ) === "regexp" ) {
    return operator.test( String( cellValue ) );
  } else if ( getObjectType_( operator ) === "function" ) {
    return operator( cellValue, filterValue );
  } else {
    switch ( operator ) {
      case "=":
        return String( cellValue ) === String( filterValue );
      case "!=":
        return String( cellValue ) !== String( filterValue );
      case ">":
        return bothAreNumbers ? numCellValue > numFilterValue : String( cellValue ) > String( filterValue );
      case "<":
        return bothAreNumbers ? numCellValue < numFilterValue : String( cellValue ) < String( filterValue );
      case ">=":
        return bothAreNumbers ? numCellValue >= numFilterValue : String( cellValue ) >= String( filterValue );
      case "<=":
        return bothAreNumbers ? numCellValue <= numFilterValue : String( cellValue ) <= String( filterValue );

      default:

        if ( /^\*\d+=$/.test( operator ) ) {
          const match = /^\*(\d+)>=$/.exec( operator );
          if ( match ) {
            const multiplier = parseInt( match[ 1 ], 10 );
            const isEqual = ( str1, str2 ) => !isNaN( parseInt( str1 ) ) && !isNaN( parseInt( str2 ) ) && parseInt( str1 ) === ( parseInt( str2 ) * multiplier );
            return isEqual( cellValue, filterValue );
          }
        }
        else if ( /^\*\d+>=$/.test( operator ) ) {
          const match = /^\*(\d+)>=$/.exec( operator );
          if ( match ) {
            const multiplier = parseInt( match[ 1 ], 10 );
            const isEqualOrGreater = ( str1, str2 ) => !isNaN( parseInt( str1 ) ) && !isNaN( parseInt( str2 ) ) && parseInt( str1 ) >= ( parseInt( str2 ) * multiplier );
            return isEqualOrGreater( cellValue, filterValue );
          }
        }
        else if ( /^\*\d+<=$/.test( operator ) ) {
          const match = /^\*(\d+)>=$/.exec( operator );
          if ( match ) {
            const multiplier = parseInt( match[ 1 ], 10 );
            const isEqualOrMinor = ( str1, str2 ) => !isNaN( parseInt( str1 ) ) && !isNaN( parseInt( str2 ) ) && parseInt( str1 ) <= ( parseInt( str2 ) * multiplier );
            return isEqualOrMinor( cellValue, filterValue );
          }
        }
        else {
          throw new Error( `Unknown comparison type: ${ operator }` );
        }
    }
  }
}

// used for the SELECT clause
function pickFields_( fieldsToSelect, table ) {
  const { fields, data } = table;

  // If fieldsToSelect is a string, convert it to an array with one element
  const fieldsArray = getObjectType_( fieldsToSelect ) === "array" ? fieldsToSelect : [ fieldsToSelect ];

  // Map the data to only include the selected fields in the order they are specified
  const selectedData = data.map( row => {
    const resultArray = fieldsArray.map( field => {
      const index = fields.indexOf( field );
      return index !== -1 ? row[ index ] : undefined;
    } );
    return resultArray.length !== 1 ? resultArray : resultArray[ 0 ];
  } );

  return { fields, data: selectedData };
}


