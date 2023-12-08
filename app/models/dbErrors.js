class DbError extends Error {

	static get Status() {
    return {
      NOT_FOUND: 404,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      INTERNAL_SERVER_ERROR: 500,
      REDIRECTION_ERROR: 301
    };
  }

	constructor(statusCode, message) {
		super(message);
		this.statusCode = statusCode;
	}
}

// 404: Not Found
class DbErrorNotFound extends DbError {
  constructor() {
    super(DbError.Status.NOT_FOUND, 'The requested resource was not found');
  }
}

// 500: Internal error
class DbErrorInternalError extends DbError {
  constructor() {
    super(DbError.Status.INTERNAL_SERVER_ERROR, 'Internal error');
  }
}