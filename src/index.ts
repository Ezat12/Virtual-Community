import express, { Response, Request, NextFunction } from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/errorHandler";
import { ApiError } from "./utils/apiError";
import userRoute from "./routes/user.route";
import authRoute from "./routes/auth.route";
// import "./types/express";

import path from "path";
const app = express();

dotenv.config();

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/v1/users", userRoute);
app.use("/api/v1/auth", authRoute);

app.use((req: Request, res: Response, next: NextFunction) => {
  next(new ApiError("route is not success", 404));
});

app.use(errorHandler);

const port = process.env.PORT || 4040;

app.listen(port, () => {
  console.log(`server is ready on port ${port}`);
});
