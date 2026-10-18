import {createGuidesHandler} from '../../server/guides-api.mjs';
export default createGuidesHandler();
export const config={rateLimit:{action:'rate_limit',aggregateBy:['domain','ip'],windowSize:60,windowLimit:120}};
