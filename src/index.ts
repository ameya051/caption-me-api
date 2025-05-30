import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from "cors"
import router from "./routes/index"

dotenv.config();


const app: Express = express();
const port = process.env.PORT || 3000;

app.use(cors())
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server is running');
});

app.use("/api/",router)

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
