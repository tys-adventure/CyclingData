import {activityAccess} from '../../lib/strava-scopes.mjs';
import {route,method,identify,connection,configured,json} from '../../lib/server.mjs';
export default route(async(req,res)=>{method(req,['GET']);const user=await identify(req),c=await connection(user);json(res,200,{configured:configured(),connected:Boolean(c),activityAccess:c?activityAccess(c.scope):'none',lastSynced:c?.last_synced_at||null});});
