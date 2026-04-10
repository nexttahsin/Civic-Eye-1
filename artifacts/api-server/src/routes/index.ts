import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authorityRouter from "./authority/index.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authorityRouter);

export default router;
