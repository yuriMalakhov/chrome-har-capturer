'use strict';

const CHC = require('..');

const validate = require('har-validator');

const assert = require('assert');
const http = require('http');
const url = require('url');
const zlib = require('zlib');

function checkedRun(done, urls, options, check) {
    let nLoad = 0;
    let nDone = 0;
    let nFail = 0;
    let nPreHook = 0;
    let nPostHook = 0;
    if (options) {
        options.preHook = (url, client, index, _urls) => {
            nPreHook++;
            try {
                assert.strictEqual(typeof url, 'string');
                assert.strictEqual(typeof client.close, 'function');
                assert.strictEqual(urls[index], url);
                assert.deepStrictEqual(_urls, urls);
            } catch (err) {
                done(err);
            }
        };
        options.postHook = (url, client, index, _urls) => {
            nPostHook++;
            try {
                assert.strictEqual(typeof url, 'string');
                assert.strictEqual(typeof client.close, 'function');
                assert.strictEqual(_urls[index], url);
                assert.deepStrictEqual(_urls, urls);
            } catch (err) {
                done(err);
            }
        };
    }
    CHC.run(
        urls,
        options
    ).on('load', (url, index, _urls) => {
        nLoad++;
        try {
            assert.strictEqual(typeof url, 'string');
            assert.strictEqual(_urls[index], url);
            assert.deepStrictEqual(_urls, urls);
        } catch (err) {
            done(err);
        }
    }).on('done', (url, index, _urls) => {
        nDone++;
        try {
            assert.strictEqual(typeof url, 'string');
            assert.strictEqual(_urls[index], url);
            assert.deepStrictEqual(_urls, urls);
        } catch (err) {
            done(err);
        }
    }).on('fail', (url, err, index, _urls) => {
        nFail++;
        try {
            assert.strictEqual(typeof url, 'string');
            assert(err instanceof Error);
            assert.strictEqual(_urls[index], url);
            assert.deepStrictEqual(_urls, urls);
        } catch (err) {
            done(err);
        }
    }).on('har', async (har) => {
        try {
            await validate.har(har);
            if (typeof check === 'object') {
                assert.strictEqual(nLoad, check.nLoad, 'load');
                assert.strictEqual(nDone, check.nDone, 'done');
                assert.strictEqual(nFail, check.nFail, 'fail');
                assert.strictEqual(nPreHook, check.nPreHook, 'preHook');
                assert.strictEqual(nPostHook, check.nPostHook, 'postHook');
                assert.strictEqual(har.log.pages.length, check.nPages, 'pages');
                assert.strictEqual(har.log.entries.length, check.nEntries, 'entries');
            } else if (typeof check === 'function') {
                await check(har);
            }
            done();
        } catch (err) {
            if (err.name === 'HARError') {
                console.error(JSON.stringify(har, null, 4));
                console.error(JSON.stringify(err.errors, null, 4));
            }
            done(err);
        }
    });
}

function data(size) {
    return Buffer.alloc(size, 'x');
}

function createTestServer(done) {
    return http.createServer((request, response) => {
        const urlObject = url.parse(request.url, true);
        switch (urlObject.pathname) {
        case '/get':
            {
                response.end();
            }
            break;
        case '/data':
            {
                const size = Number(urlObject.query.size);
                const chunks = Number(urlObject.query.chunks);
                const gzip = !!(urlObject.query.gzip);
                const send = (chunk, end) => {
                    if (end) {
                        response.end(chunk);
                    } else {
                        response.write(chunk);
                    }
                };
                // enable compression
                if (gzip) {
                    response.setHeader('content-encoding', 'gzip');
                    const gzipStream = zlib.createGzip();
                    gzipStream.pipe(response);
                    response = gzipStream;
                }
                // trasfer-encoding: chunked
                if (chunks) {
                    for (let i = 0; i < chunks; i++) {
                        const chunk = data(size);
                        send(chunk, false);
                    }
                    response.end();
                }
                // set content-length
                else {
                    const chunk = data(size);
                    send(chunk, true);
                }
            }
            break;
        }
    }).listen(8000, done);
}

module.exports = {checkedRun, createTestServer};