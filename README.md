# candyjs-session-cookie

基于 cookie 的 session

## 安装

```
$ npm install @candyjs/session-cookie
```

## 使用

入口文件配置

```
// index.js
const CandyJs = require('candyjs');
const App = require('candyjs/web/Application');
const Hook = require('candyjs/core/Hook');
const Session = require('@candyjs/session-cookie');

Hook.addHook(Session.start({
    key: 'some secure strings',
    // 毫秒
    maxAge: 86400000
}));

new CandyJs(new App({
    'id': 1,
    'debug': true,
    'appPath': __dirname + '/app'

})).listen(2333, function(){
    console.log('listen on 2333');
});
```

使用

```
// IndexController.js
const Controller = require('candyjs/web/Controller');

class IndexController extends Controller {

    run(req, res) {
        let views = req.session.getAttribute('views');

        if(undefined === views) {
            views = 0;
        } else {
            views += 1;
        }

        req.session.setAttribute('views', views);

        res.write('views: ' + views);
        res.end();
    }

}
```

## API

```
session#getAttribute(name: string): any;
session#setAttribute(name, value): void;
session#deleteAttribute(name): void;
session#clear(): void;
```
