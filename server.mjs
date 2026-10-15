import http from 'node:http';
import path from 'node:path';
import { stat, realpath } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const realRoot=await realpath(root);
const port=Number(process.env.PORT||4323);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.pdf':'application/pdf','.bin':'application/octet-stream','.wasm':'application/wasm','.glb':'model/gltf-binary'};
const withinRoot=(base,target)=>{const relative=path.relative(base,target);return relative!==''&&!relative.startsWith(`..${path.sep}`)&&relative!=='..'&&!path.isAbsolute(relative);};
const matchesETag=(condition,etag)=>typeof condition==='string'&&condition.split(',').some(value=>value.trim()==='*'||value.trim().replace(/^W\//,'')===etag.replace(/^W\//,''));
http.createServer(async(req,res)=>{
  try {
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/'){res.writeHead(302,{Location:'/zh/'+url.search});return res.end();}
    let decoded;
    try {decoded=decodeURIComponent(url.pathname);}catch {res.writeHead(400);return res.end('Invalid path');}
    let target=path.resolve(root,'.'+decoded);
    if(!withinRoot(root,target)){res.writeHead(403);return res.end();}
    let info=await stat(target).catch(()=>null);
    if(info?.isDirectory()) {
      if(!url.pathname.endsWith('/')) {res.writeHead(308,{Location:url.pathname+'/'+url.search});return res.end();}
      target=path.join(target,'index.html');info=await stat(target).catch(()=>null);
    }
    let status=200;
    if(!info?.isFile()) {status=404;target=path.join(root,decoded.startsWith('/en/')?'en/404.html':'404.html');info=await stat(target);}
    const resolved=await realpath(target);
    if(!withinRoot(realRoot,resolved)){res.writeHead(403);return res.end();}
    const etag=`W/"${info.size.toString(16)}-${info.mtimeMs.toString(16)}"`;
    const headers={'Content-Type':types[path.extname(target).toLowerCase()]||'application/octet-stream','Cache-Control':'no-cache','ETag':etag,'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'"};
    if(status===200&&matchesETag(req.headers['if-none-match'],etag)){res.writeHead(304,headers);return res.end();}
    res.writeHead(status,{...headers,'Content-Length':info.size});
    if(req.method==='HEAD')return res.end();createReadStream(target).pipe(res);
  } catch(error) {res.writeHead(500);res.end('Local preview error');console.error(error.message);}
}).listen(port,'127.0.0.1',()=>console.log(`Bokai Zheng → http://127.0.0.1:${port}`));
