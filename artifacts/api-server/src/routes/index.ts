import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import emailsRouter from "./emails.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/emails", emailsRouter);

export default router;
