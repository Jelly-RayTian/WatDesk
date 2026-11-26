// OAuth "Web application" client ID from Google Cloud Console (public, not a secret). Leave empty to hide the connect button.
// Authorized redirect URI to register: https://<extension id>.chromiumapp.org/  (the Settings panel shows the exact value).
export const GOOGLE_CLIENT_ID='520522846841-s1m8kvhh6l8890lservndg5vsvmgnbo1.apps.googleusercontent.com';
// Narrowest Calendar scope: create secondary calendars and manage events on them only; the user's other calendars stay unreadable.
export const GOOGLE_SCOPE='https://www.googleapis.com/auth/calendar.app.created';
export const GOOGLE_CALENDAR_NAME='WatDesk';
export const GOOGLE_HOSTS=['https://www.googleapis.com/*','https://oauth2.googleapis.com/*'];
export const GOOGLE_STORE_KEY='watdesk.google';
