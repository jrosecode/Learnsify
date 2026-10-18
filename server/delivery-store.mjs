import {getStore} from '@netlify/blobs';
export function deliveryStore(context={}){return getStore({name:'pathira-delivery-'+(context.deploy?.context||'local'),consistency:'strong'})}
