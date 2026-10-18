# Reviewed translation and reminders

Billing is explicitly deferred. This feature set includes no checkout, subscriptions, payment provider, or pricing.

Manual translation always works locally. The optional AI button sends guide title/instructions/alt text only after the user checks the consent box. It never sends screenshots, audio, video, or storage paths. The server requires a verified user session, caps input to 20 steps/12,000 characters, limits request rate, streams progress, and validates step IDs/order before returning a draft. The user reviews and saves a separate translated copy; the original is untouched.

To enable AI, set Functions-scoped `PATHIRA_AI_ENABLED=true`, `PATHIRA_AI_MODEL` to an available model, and provide Anthropic credentials through Netlify AI Gateway or `ANTHROPIC_API_KEY`. The official SDK uses injected provider credentials. No model is hardcoded and no AI calls run during builds. Keep the feature disabled until the model and provider are verified. The code is covered with a simulated provider; no paid live model call was made during implementation.

Assignments with due dates can download an ICS calendar reminder with an alarm one day before the due date. Import the file into your calendar; its reminder settings govern notifications. Dates are all-day dates, and an end date is exclusive. Calendar exports do not send email or invite other people.
