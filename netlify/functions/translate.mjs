import {createTranslationHandler} from '../../server/translation.mjs';
export default createTranslationHandler();
export const config={rateLimit:{action:'rate_limit',aggregateBy:['domain','ip'],windowSize:60,windowLimit:5}};
