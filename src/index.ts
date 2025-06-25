import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from "cors"
import router from "./routes/index"
import "./middlewares/passportConfig"
import passport from 'passport';
import cookieParser from 'cookie-parser';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://captionme.ameyashr.in']
  : ['http://localhost:3000', 'https://captionme.ameyashr.in'];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions))
app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

app.use("/api/",router)
app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server is running');
});


app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
