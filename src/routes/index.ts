import { Router } from 'express';
import auth from './auth';
import user from './user';
import actions from './actions';
require('dotenv').config();

const uploadRouter = require('../middlewares/uploadRouter');

const routes = Router();

routes.use('/auth', auth);
routes.use('/users', user);
routes.use('/actions', actions);
routes.use('/api/upload', uploadRouter);

export default routes;
