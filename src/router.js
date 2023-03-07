import {handleMessage} from './message.js';
import {ENV} from './env.js';
import {setCommandForTelegram,sendPostForTelegram} from './command.js';
import {bindTelegramWebHook} from './telegram.js';

function ResponseJson(result,status = 200) {
  return new Response(JSON.stringify(result), {
    status,
    headers: {
      'content-type': 'application/json;charset=UTF-8',
    },
  });
}

async function bindWebHookAction() {
  let result = {};
  let domain = ENV.WORKERS_DOMAIN;
  if (domain.toLocaleLowerCase().startsWith('http')) {
    domain = new URL(domain).host;
  }
  for (let token of ENV.TELEGRAM_AVAILABLE_TOKENS) {
    token = token.replace("\n","")
    const url = `https://${domain}/telegram/${token}/webhook`;
    const id = token.split(':')[0];
    const webhook = await bindTelegramWebHook(token, url);
    const command =  await setCommandForTelegram(token);
    result[id] = {
      webhook ,
      command,
    };
  }
  return result;
}


async function handleAction(cmd,body = {}) {
  const result = {};
  for (let token of ENV.TELEGRAM_AVAILABLE_TOKENS) {
    token = token.replace("\n","")
    const id = token.split(':')[0];
    console.log({cmd,body})
    result[id] = await sendPostForTelegram(token,cmd,body)
    if(cmd === 'getWebhookInfo' && result[id].result.url){
      console.log(result[id].result.url)
      result[id].result.url = "xxx"
    }
  }
  return result
}

// 处理Telegram回调
async function telegramWebhookAction(request) {
  const resp = await handleMessage(request);
  return resp || new Response('NOT HANDLED', {status: 200});
}

async function defaultIndexAction() {
  const helpLink = 'https://github.com/TBXark/ChatGPT-Telegram-Workers/blob/master/DEPLOY.md';
  const issueLink = 'https://github.com/TBXark/ChatGPT-Telegram-Workers/issues';
  const initLink = './init';
  const HTML = `
<html>  
  <head>
    <title>ChatGPT-Telegram-Workers</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="ChatGPT-Telegram-Workers">
    <meta name="author" content="TBXark">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        font-size: 1rem;
        font-weight: 400;
        line-height: 1.5;
        color: #212529;
        text-align: left;
        background-color: #fff;
      }
      h1 {
        margin-top: 0;
        margin-bottom: 0.5rem;
      }
      p {
        margin-top: 0;
        margin-bottom: 1rem;
      }
      a {
        color: #007bff;
        text-decoration: none;
        background-color: transparent;
      }
      a:hover {
        color: #0056b3;
        text-decoration: underline;
      }
      strong {
        font-weight: bolder;
      }
    </style>
  </head>
  <body>
    <h1>ChatGPT-Telegram-Workers</h1>
    <p>Deployed Successfully!</p>
    <p>You must <strong><a href="${initLink}"> >>>>> init <<<<< </a></strong> first.</p>
    <p>For more information, please visit <a href="${helpLink}">${helpLink}</a></p>
    <p>If you have any questions, please visit <a href="${issueLink}">${issueLink}</a></p>
  </body>
</html>
  `;
  return new Response(HTML, {status: 200, headers: {'Content-Type': 'text/html'}});
}

export async function handleRequest(request) {
  const {pathname} = new URL(request.url);
  console.log(pathname)
  if (pathname === `/`) {
    return defaultIndexAction();
  }
  if (["/init"].indexOf(pathname) !== -1) {
    return ResponseJson(await bindWebHookAction());
  }

  if (["/getMe","/getWebhookInfo","/deleteWebhook"].indexOf(pathname) !== -1) {
    return ResponseJson(await handleAction(pathname.substring(1)));
  }

  if (pathname.startsWith(`/telegram`) && pathname.endsWith(`/webhook`)) {
    return telegramWebhookAction(request);
  }
  return null;
}
