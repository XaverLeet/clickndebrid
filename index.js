const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const CryptoJS = require('crypto-js');
const AES = require('crypto-js/aes');
const superagent = require('superagent');

const RealDebridToken = process.env.REALDEBRID_TOKEN;
const CnLURL = process.env.CNL_URL;
const keyFunctionRegex = /return ["']([\dA-Fa-f]+)["']/;

function decryptcnl(jk, crypted) {
  var key = CryptoJS.enc.Hex.parse(jk.match(keyFunctionRegex)[1]);

  return AES.decrypt(crypted, key, {
    mode: CryptoJS.mode.CBC,
    iv: key,
  }).toString(CryptoJS.enc.Utf8).replace(/\s+/g, '\n');
}

function cryptcnl(jk, uncrypted) {
  var key = CryptoJS.enc.Hex.parse(jk.match(keyFunctionRegex)[1]);

  return AES.encrypt(uncrypted, key, {
    mode: CryptoJS.mode.CBC,
    iv: key,
  }).toString();
}

async function realdebrid(token, link) {
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
      return result.download;
    } catch (err) {
      // console.error(err);
      return link;
    }
  } else {
    // console.error('host not supported for ' + link);
    return link;
  }
}

// check if ENVs set
if (!RealDebridToken) {
  console.error('REALDEBRID_TOKEN not set. Exitting.');
  return;
}
if (!CnLURL) {
  console.error('CNL_URL not set. Exitting.');
  return;
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/flash/addcrypted2', async (req, res) => {
  let fakereq = req.body;

  fakereq.crypted = decryptcnl(fakereq.jk, fakereq.crypted);
  var links = fakereq.crypted.split('\n');
  var rdlinks = [];

  for (const l of links) {
    try {
      const res = await realdebrid(RealDebridToken, l);
      console.info('SUCCESS: ' +  l + ' ==> ' + res);
      rdlinks.push(res);
    } catch (err) {
      console.error('FAILURE: ' + l + ' (link kept)');
      rdlinks.push(l);
    }
  }

  var resultreq = fakereq;
  resultreq.crypted = rdlinks.join('\r\n');
  resultreq.crypted = cryptcnl(fakereq.jk, fakereq.crypted);
  // console.log(resultreq);

  try {
    const res = await superagent
      .post(CnLURL + '/flash/addcrypted2')
      .send(
        'passwords=' + resultreq.passwords +
          '&source=' + resultreq.source +
          '&package=' + resultreq.package +
          '&jk=' + resultreq.jk +
          '&crypted=' + resultreq.crypted,
      );
    console.info('SUBMITTED: ' + resultreq.package + ' to ' + CnLURL);
  } catch (err) {
    console.error('SUBMISSION FAILED: ' + resultreq.package + ' to ' + CnLURL);
  }
  res.send('OK');
});

app.get('/jdcheck.js', (req, res) => {
  res.send("jdownloader=true; var version='43307';");
});

app.listen(
  9666,
  () => console.log("Click'n'Load server is listening at 9666..."),
);