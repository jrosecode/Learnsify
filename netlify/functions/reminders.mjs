import {createReminderHandler} from '../../server/reminders.mjs';
export default createReminderHandler();
export const config={rateLimit:{action:'rate_limit',aggregateBy:['domain','ip'],windowSize:60,windowLimit:10}};
