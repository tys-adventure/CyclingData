export const requestedScopes='read,activity:read,activity:read_all';
export function activityAccess(scope){
 const granted=typeof scope==='string'?scope.split(/[,\s]+/).filter(Boolean):[];
 return granted.includes('activity:read_all')?'all':granted.includes('activity:read')?'limited':'none';
}
