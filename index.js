/*
* clickndebrid - A Click'n'Load proxy server that converts links via real-debrid.com API and submits them to PyLoad et al.
* Copyright (C) 2023 XaverLeet
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const redis = require('redis');
const RedisClient = redis.createClient({
  url: process.env.REDIS_URL
});

const CryptoJS = require('crypto-js');
const AES = require('crypto-js/aes');
const superagent = require('superagent');

const keyFunctionRegex = /return ["']([\dA-Fa-f]+)["']/;

function decryptcnl(req) {
  var key = CryptoJS.enc.Hex.parse(req.jk.match(keyFunctionRegex)[1]);

  req.crypted = AES.decrypt(req.crypted, key, {
    mode: CryptoJS.mode.CBC,
    iv: key,
  }).toString(CryptoJS.enc.Utf8).replace(/\s+/g, '\n');

  return(req);
}

function cryptcnl(req) {
  var key = CryptoJS.enc.Hex.parse(req.jk.match(keyFunctionRegex)[1]);

  req.crypted = AES.encrypt(req.crypted, key, {
    mode: CryptoJS.mode.CBC,
    iv: key,
  }).toString();

  return(req);
}

async function realdebrid(token, link, package) {
  // check if cached by redis
  if( RedisClient.isReady ) {
    try {
      const cached = await RedisClient.hGetAll('link:'+link);
     
      if( JSON.stringify(cached) != '{}' ) {
        console.log("REDIS CACHE HIT:", cached.rdlink);
        return cached.rdlink;
      }    
    }
    catch {
      console.error('ERROR: Redis cache request failed - ' + err);
    }
  }
  else if (process.env.REDIS_URL)
  {
    console.error("ERROR: Redis client is not ready...");
  }
  
  // check if supported
  try {
    const res = await superagent.post(
      'https://api.real-debrid.com/rest/1.0/unrestrict/check',
    )
      .send('link=' + link)
      .set(
        'Authorization',
        'Bearer ' + token,
      );
    result = JSON.parse(res.res.text);
  } catch (err) {
    // console.error(err);
    console.error('ERROR: Connection to real-debrid.com failed on', link, '(', err.status, ')');
    return link;
  }

  // create real-debrid link
  if (result.supported == 1) {
    try {
      const res = await superagent.post(
        'https://api.real-debrid.com/rest/1.0/unrestrict/link',
      )
        .send('link=' + link)
        .set(
          'Authorization',
          'Bearer ' + token,
        );
      result = JSON.parse(res.res.text);

      // cache with redis
      if( RedisClient.isReady ) {
        
        await RedisClient.hSet('link:' + link, {
          package: package,
          rdlink: result.download }
        );
      }
      else if (process.env.REDIS_URL)
      {
        console.error("ERROR: Redis client is not ready...");
      }

      return result.download;
    } catch (err) {
      console.error(err);
      console.warn('WARNING: ' + link + ' could not be converted by API.');
      return link;
    }
  } else {
    // console.error('host not supported for ' + link);
    console.warn('WARNING: ' + link + ' not supported by hoster.');
    return link;
  }
}

async function process_request( req ) {
  req = decryptcnl(req);

  var links = req.crypted.split('\n');
  var rdlinks = [];
  var package = [];

  for (var l of links) {
    try {
      l = l.replace(/[^\x20-\x7E]+/g, '');
      const res = await realdebrid(process.env.REALDEBRID_TOKEN, l, req.package);
      console.info('SUCCESS: ' +  l + ' ==> ' + res);
      rdlinks.push(res);
      if( l != res ) {
        package.push({ link: l, rdlink: res});  
      }
    } catch (err) {
      console.error('ERROR: ' + err, l + ' (link kept)');
      rdlinks.push(l);
    }
  }

  req.crypted = rdlinks.join('\r\n');
  req = cryptcnl(req);

  // cache to redis
  if (package.length > 0) {

    if( RedisClient.isReady ) {
      try {
        try {
          await RedisClient.set( 'package:' + req.package, JSON.stringify(package) );
        } catch (err) {
          console.error('ERROR: ' + err);
        }
      }
      catch {
        console.error('ERROR: Redis cache request failed - ' + err);
      }
    }
    else if (process.env.REDIS_URL)
    {
      console.error("ERROR: Redis client is not ready...");
    }
  }

  // send request
  try {
    const res = await superagent
      .post(process.env.CNL_URL + '/flash/addcrypted2')
      .send(
        'passwords=' + req.passwords +
          '&source=' + req.source +
          '&package=' + req.package +
          '&jk=' + req.jk +
          '&crypted=' + req.crypted,
      );
    console.info('SUBMITTED: ' + req.package + ' to ' + process.env.CNL_URL);
  } catch (err) {
    console.error('SUBMISSION FAILED: ' + req.package + ' to ' + process.env.CNL_URL);
  }
}

// Main program

// check if ENVs set
if (!process.env.REALDEBRID_TOKEN) {
  console.error('REALDEBRID_TOKEN not set. Exitting.');
  return;
}

if (!process.env.CNL_URL) {
  console.error('CNL_URL not set. Exitting.');
  return;
}

if (!process.env.REDIS_URL) {
  console.warn('REDIS not set. Disabling functionality.');
}
else {
  RedisClient
  .on('error', err => console.log('Redis Client Error:' + err))
  .connect();
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Add hooks
process.on('exit', function() {
  console.log('About to exit.');
  RedisClient.disconnect();
});

app.post('/flash/addcrypted2', async (req, res) => {
  await process_request( req.body );
  res.send('OK');
});

app.get('/jdcheck.js', (req, res) => {
  res.send("jdownloader=true; var version='43307';");
});

app.listen(
  9666,
  () => console.log("Click'n'Load server is listening at 9666..."),
);