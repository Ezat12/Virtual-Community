export class ApiError extends Error {
  state: string;

  constructor(public message: string, public statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.state = statusCode.toString().startsWith("4") ? "fail" : "error";
  }
}
