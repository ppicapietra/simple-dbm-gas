class DbException extends CommonException {}

// 404: Not Found
class DbExceptionNotFound extends DbException {
  constructor( message, context ) {
    super( 404, message || 'The requested resource was not found', context );
  }
}

class DbExceptionMissingOrWrongParams extends DbException {
  constructor( message, context ) {
    super( 422, message || 'There are missing params', context );
  }
}

// DB Table column has wrong type of data for operation
class DbExceptionFieldUnexpectedDataType extends DbException {
  constructor( message, context ) {
    super( 500, message || 'Field has unexpected data type for operation', context );
  }
}

// DB Table wrong structure
class DbExceptionTableUnexpedtedStructure extends DbException {
  constructor( message, context ) {
    super( 500, message || 'Table has missing field in his structure', context );
  }
}

class DbExceptionTimeout extends DbException {
  constructor( message, context ) {
    super( 500, message || 'Timeout wainting for response', context );
  }
}

// 500: Internal error
class DbExceptionInternalError extends DbException {
  constructor( message, context ) {
    super( 500, message || 'Internal error', context );
  }
}