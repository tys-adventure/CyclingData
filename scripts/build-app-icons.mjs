import fs from 'node:fs';
import {deflateSync} from 'node:zlib';
// Rasterize the existing geometric RideVector mark, with an opaque background
// and enough padding for iOS rounding and maskable-icon safe areas.
function crc(bytes){let value=0xffffffff;for(const byte of bytes){value^=byte;for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;}
function chunk(type,data){const label=Buffer.from(type),size=Buffer.alloc(4),sum=Buffer.alloc(4);size.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([label,data])));return Buffer.concat([size,label,data,sum]);}
function distance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);}
export function iconPNG(size){
 const rows=Buffer.alloc((size*4+1)*size),background=[36,75,60],foreground=[211,238,147],segments=[[[17,46],[45,18]],[[22,18],[45,18]],[[45,18],[45,41]]];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){let coverage=0;for(let sy=0;sy<4;sy++)for(let sx=0;sx<4;sx++){const px=(x+(sx+.5)/4)/size*64,py=(y+(sy+.5)/4)/size*64;if(segments.some(([a,b])=>distance(px,py,a,b)<=3))coverage++;}const index=y*(size*4+1)+1+x*4;for(let c=0;c<3;c++)rows[index+c]=Math.round(background[c]+(foreground[c]-background[c])*coverage/16);rows[index+3]=255;}
 const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
const directory=new URL('../public/icons/',import.meta.url);fs.mkdirSync(directory,{recursive:true});
for(const size of [180,192,512])fs.writeFileSync(new URL('icon-'+size+'.png',directory),iconPNG(size));
console.log('Built opaque Home Screen and maskable app icons.');
