// Original typographic animation; no real takeovers, metrics or purchases.
// Usage: SHARP_PACKAGE=/path/to/sharp FFMPEG=/path/to/ffmpeg node render-demo.mjs [output.mp4]
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
const require=createRequire(import.meta.url);
const sharp=require(process.env.SHARP_PACKAGE || 'sharp');
const output=resolve(process.argv[2] || 'takeover-demo.mp4');
mkdirSync(dirname(output),{recursive:true});
const fps=24, seconds=15;
const encoder=spawn(process.env.FFMPEG || 'ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','png','-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',output],{stdio:['pipe','inherit','inherit']});
const finished=once(encoder,'close');
const ink='#172016',lime='#ceff58',paper='#f5f4e9';
const text=(x,y,size,value,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" ${extra}>${value}</text>`;
const ease=x=>1-Math.pow(1-Math.max(0,Math.min(1,x)),3);
function frame(t){
 const end=t>=11.8;
 const shift=ease((t-5.3)/.75)*1050;
 let title=t<3?'ONE WEBSITE.':t<8?'THE NEXT TAKEOVER': 'WHAT WOULD';
 let title2=t<3?'ONLY ONE SPOT.':t<8?'REPLACES IT.':'YOU PUT HERE?';
 const card=(x,bg,line1,line2,label)=>`<g transform="translate(${x} 0)"><rect x="60" y="360" width="840" height="485" rx="8" fill="${bg}" stroke="${ink}" stroke-width="3"/><rect x="60" y="360" width="840" height="62" fill="${ink}"/>${text(91,400,21,label,`fill="${paper}" font-weight="700" letter-spacing="2"`)}${text(95,570,83,line1,'font-weight="900"')}${text(95,666,83,line2,'font-weight="900"')}${text(95,793,20,'EXAMPLE MESSAGE','letter-spacing="3"')}</g>`;
 const body=end?`${text(60,310,78,'ONE PAGE.','font-weight="900"')}${text(60,405,78,'ONE OWNER.','font-weight="900"')}<path d="M65 510H850M795 455l55 55-55 55" stroke="${ink}" stroke-width="7" fill="none"/>${text(60,650,42,'See who owns the wall.','font-weight="700"')}${text(60,745,66,'takethewall.com','font-weight="900"')}`:`${text(60,205,58,title,'font-weight="900"')}${text(60,280,58,title2,'font-weight="900"')}<clipPath id="stage"><rect x="0" y="350" width="960" height="510"/></clipPath><g clip-path="url(#stage)">${card(-shift,lime,'HELLO,','INTERNET.','EXAMPLE TAKEOVER A')}${card(1050-shift,paper,'SEND CAT','MEMES.','EXAMPLE TAKEOVER B')}</g>${text(60,942,31,t<5.3?'A message. A project. Something unexpected.':t<8?'One takeover replaces the previous owner.':'One spot on the internet. Your idea.','font-weight="600"')}`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1200"><rect width="960" height="1200" fill="${end?lime:paper}"/><g font-family="DejaVu Sans,sans-serif" fill="${ink}">${text(60,82,25,'TAKE THE WALL','font-weight="800" letter-spacing="4"')}<path d="M60 112H900" stroke="${ink}" stroke-width="2"/>${body}<path d="M60 1034H900" stroke="${ink}" stroke-width="2"/>${text(60,1085,20,'DEMO · EXAMPLE TAKEOVERS','font-weight="700" letter-spacing="2"')}${text(60,1132,23,'takethewall.com','font-weight="700"')}<rect x="60" y="1165" width="${840*Math.min(1,t/seconds)}" height="4" fill="${ink}"/></g></svg>`;
}
for(let i=0;i<fps*seconds;i++){
 const png=await sharp(Buffer.from(frame(i/fps))).png().toBuffer();
 if([24,156,228,312].includes(i)) writeFileSync(resolve(dirname(output),`preview-${i}.png`),png);
 if(!encoder.stdin.write(png)) await once(encoder.stdin,'drain');
}
encoder.stdin.end();
const [code]=await finished;
if(code!==0)throw Error(`ffmpeg exited ${code}`);
console.log(output);
