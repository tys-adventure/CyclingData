export function stravaResultMessage(result){
 const messages={
  connected:'Strava connected. Import your recent rides to see your progress.',
  denied:'Strava connection was canceled.',
  browser_session:'Your browser did not return the secure Strava connection session. Open ridevector.app directly in Safari or Chrome (outside a message or email preview), sign in, and start Connect with Strava again in that same browser.',
  state_mismatch:'A different Strava connection attempt replaced this session. Close older Strava tabs and start Connect with Strava again from ridevector.app in the same browser.',
  invalid_state:'This Strava authorization link is invalid. Start a new connection from ridevector.app instead of reusing a shared or saved Strava link.',
  expired:'This Strava connection attempt expired or was already used. Start Connect with Strava again and complete it within 10 minutes.',
  activity_permission:'Strava activity permission was not granted. Try connecting again and leave the permission to view all activities, including private activities, checked.',
  missing_code:'Strava did not return an authorization code. Start Connect with Strava again.',
  token_exchange:'Strava could not finish exchanging the authorization code. Start a fresh connection; if this repeats, ask the site owner to check the Strava app credentials and access limits.',
  token_response:'Strava returned an incomplete authorization response. Please start a new connection.',
  state_store:'The connection session could not be checked. Please retry shortly.',
  connection_save:'Strava authorization returned, but the connection could not be saved. Ask the site owner to check the callback logs; also make sure this Strava account is not already linked to another RideVector account.'
 };
 return messages[result]||'Strava connection could not be completed. Please try again.';
}
