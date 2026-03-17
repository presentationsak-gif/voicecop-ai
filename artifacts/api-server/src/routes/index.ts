import { Router, type IRouter } from "express";
import healthRouter from "./health";
import junctionsRouter from "./junctions";
import signalsRouter from "./signals";
import commandsRouter from "./commands";
import incidentsRouter from "./incidents";
import alertsRouter from "./alerts";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(junctionsRouter);
router.use(signalsRouter);
router.use(commandsRouter);
router.use(incidentsRouter);
router.use(alertsRouter);
router.use(analyticsRouter);

export default router;
