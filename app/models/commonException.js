class CommonException extends Error {

	constructor( statusCode, message, context = {} ) {
		super( message );
		// this.name = "HttpException";
		this.message = message;
		this.statusCode = statusCode;
		this.context = context;
	}

	toJSON() {
    return {
      name: this.name,
      statusCode: this.statusCode,
      message: this.message,
      stack: this.stack,
      context: this.context
    };
  }
}