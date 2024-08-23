class DbException extends CommonException {}

// 404: Not Found
class DbExceptionNotFound extends DbException {
  constructor( message, context ) {
    super( Router.HttpStatusCode.NOT_FOUND, message || 'The requested resource was not found', context );
  }
}

class DbExceptionMissingOrWrongParams extends DbException {
  constructor( message, context ) {
    super( Router.HttpStatusCode.UNPROCESSABLE_CONTENT, message || 'There are missing params', context );
  }
}

// DB Table wrong structure
class DbExceptionTableUnexpedtedStructure extends DbException {
  constructor( message, context ) {
    super( Router.HttpStatusCode.INTERNAL_SERVER_ERROR, message || 'Table has missing field in his structure', context );
  }
}

class DbExceptionTimeout extends DbException {
  constructor( message, context ) {
    super( Router.HttpStatusCode.INTERNAL_SERVER_ERROR, message || 'Timeout wainting for response', context );
  }
}

// 500: Internal error
class DbExceptionInternalError extends DbException {
  constructor( message, context ) {
    super( Router.HttpStatusCode.INTERNAL_SERVER_ERROR, message || 'Internal error', context );
  }
}