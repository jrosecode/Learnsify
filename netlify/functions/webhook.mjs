import {createWebhookHandler} from '../../server/webhooks.mjs';
export default createWebhookHandler();
export const config={rateLimit:{action:'rate_limit',aggregateBy:['domain','ip'],windowSize:60,windowLimit:10}};
