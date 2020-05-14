class Error {
    message?: string;
    code?: number;
}

export class ErrorModel {
    error: Error = new Error();

    constructor(message: string, code?: number) {
        if (code) {
            this.error.code = code;
        }
        this.error.message = message;
    }
}