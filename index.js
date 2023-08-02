import { createReadStream, stat } from 'fs';
import Koa, { HttpError } from 'koa'
import jwt from 'koa-jwt';
import { extname, resolve } from "path"
import { promisify } from 'util';

const app = new Koa()



app.use(jwt({secret: 'mysecret', algorithms: ['HS256', 'HS512'], getToken({request}) {
    return request.query.token
}}))

app.use(({request}, next) => {
    if (!request.url.startsWith('/api/video') || !request.query.video || !request.query.video.match(/^[a-zA-Z0-9-_ ]+\.(mp4|mov)$/i)
    ) {
        //throw new HttpError('Missing parameter')
        return;
    } else {
        return next();
    }
})

// I can use ctx instead request and response but i prefered unbuild for more clarity.
app.use( async ({ request, response, state }, next) => {
  const range = request.header.range;
    const video = resolve('video', request.query.video);

    if (!range) {
        response.type = extname(video);
        response.body = createReadStream(video);
        return next();
    }

    console.log(state)

    // return an array in two size
    const parts = range.replace("bytes=", "").split('-');
    const videoStat = await promisify(stat)(video);

    const start = parseInt(parts[0], 10);
    const end = parts[1] ?  parseInt(parts[1], 10) : videoStat.size - 1;

    response.set('Content-Range', `bytes ${start}-${end}/${videoStat.size}`);
    response.set('Accept-Range', 'bytes');
    response.set('Content-Length', end - start + 1)
    response.status = 206;  // partial response

    response.body = createReadStream(video, {start, end});

})

app.on('error', (err, ctx) => {}); // Do nothing only for not display error when Koa try to read the stream but the connection is closed. 
app.listen(3000)