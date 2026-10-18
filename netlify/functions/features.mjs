import {env,json} from '../../server/auth.mjs';
export default async()=>json({translation:env('PATHIRA_AI_ENABLED')==='true'&&!!env('PATHIRA_AI_MODEL')&&!!env('ANTHROPIC_API_KEY'),emailReminders:env('PATHIRA_REMINDERS_ENABLED')==='true'&&!!env('RESEND_API_KEY')&&!!env('PATHIRA_EMAIL_FROM')});
