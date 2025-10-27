import { Socket } from "socket.io";
import { ZodError } from "zod";

export class HandlerError {
  protected handleError(socket: Socket, e: any) {
    if (e instanceof ZodError) {
      const uniqueErrors: Record<string, string> = {};

      e.issues.forEach((err) => {
        const field: string = err.path.join(".");
        if (!uniqueErrors[field]) {
          uniqueErrors[field] = err.message;
        }
      });

      const errors = Object.entries(uniqueErrors).map(([field, message]) => ({
        field,
        message,
      }));

      socket.emit("error-message", errors.map((err) => err.message).join(", "));
    } else {
      socket.emit("error-message", "Something went wrong");
    }
  }
}
