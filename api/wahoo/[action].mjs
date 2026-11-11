import {route,method,identify,json,error} from '../../lib/server.mjs';
import {configured,connection} from '../../lib/wahoo.mjs';
import {createStart,createCallback,createSync,createDisconnect} from '../../lib/wahoo-routes.mjs';
// Keep the connector within the existing Vercel Hobby function allocation.
const handlers=new Map([
 ['start',createStart()],['callback',createCallback()],['sync',createSync()],['disconnect',createDisconnect()],
 ['status',async(req,res)=>{method(req,['GET']);const user=await identify(req),c=await connection(user);json(res,200,{configured:configured(),connected:Boolean(c),lastSynced:c?.last_synced_at||null,hasMore:Boolean(c?.next_page)});}]
]);
export default route(async(req,res)=>{const handler=handlers.get(req.query?.action);if(!handler)throw error('Wahoo endpoint not found.',404);await handler(req,res);});
