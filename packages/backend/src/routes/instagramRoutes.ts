import { Router, json, Request, Response, NextFunction } from 'express';
import { receiveEvent, verifySubscription } from '../controllers/instagramWebhookController';

const captureRawBody = (req: Request, _res: Response, buf: Buffer): void => {
  (req as Request & { rawBody?: Buffer }).rawBody = buf;
};

const router = Router();

router.use(
  json({
    verify: captureRawBody,
  }),
);

router.get('/', verifySubscription);
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  void receiveEvent(req, res).catch(next);
});

export default router;
