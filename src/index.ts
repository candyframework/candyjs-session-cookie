import * as crypto from 'crypto';

import ISession from 'candyjs/session/ISession';
import Request = require('candyjs/http/Request');
import Cookie = require('candyjs/http/Cookie');

/**
 * 基于 cookie 的 session
 */
export default class Session implements ISession {
    /**
     * 配置
     */
    public static options = {
        key: '',
        name: 'CJSESSION',
        // one day
        maxAge: 86400000,
        secure: false,
        httpOnly: true
    };

    /**
     * 数据
     */
    public static attributes: Map<String, any> = new Map();
    public static pure: boolean = false;

    /**
     * 请求对象
     */
    public request: any;

    /**
     * 输出对象
     */
    public response: any;

    // public hash: number = 0;

    constructor(req: any, res: any) {
        this.request = req;
        this.response = res;
    }

    static sha1(str: string): string {
        return crypto.createHash('sha1').update(str, 'utf8').digest('hex');
    }

    /**
     * 启动 session
     */
    static start(options: any = {}) {
        Object.assign(Session.options, options);

        if('' === Session.options.key) {
            throw new Error('lost config of "key"');
        }

        return (req, res, next) => {
            if(!req.session) {
                req.session = new Session(req, res);
            }

            next();
        };
    }

    /**
     * @inheritdoc
     */
    public getId(): string {
        return '';
    }

    /**
     * @inheritdoc
     */
    public getAttribute(name: string): any {
        this.loadSessionCookie();

        return Session.attributes.get(name);
    }

    /**
     * @inheritdoc
     */
    public setAttribute(name: string, value: any): void {
        this.loadSessionCookie();

        Session.attributes.set(name, value);
        this.saveCookie();
    }

    /**
     * @inheritdoc
     */
    public deleteAttribute(name: string) {
        this.loadSessionCookie();

        Session.attributes.delete(name);
        this.saveCookie();
    }

    /**
     * @inheritdoc
     */
    public clear(): void {
        this.loadSessionCookie();

        Session.attributes.clear();
        this.saveCookie();
    }

    public toJson() {
        let obj: any = {
            $expire: Date.now() + Session.options.maxAge
        };

        Session.attributes.forEach((v: any, k: any) => {
            obj[k] = v;
        });

        return obj;
    }

    private loadSessionCookie() {
        if(Session.pure) {
            return;
        }
        Session.pure = true;

        let r = new Request(this.request);
        let map = r.getCookies();
        let cookie = map.get(Session.options.name);
        let sign = map.get(Session.options.name + '.sig');

        if(!cookie || !sign) {
            return;
        }

        let json = null;

        try {
            let data = Buffer.from(cookie, 'base64').toString('utf8');
            json = JSON.parse(data);
        } catch(e) {
            return;
        }

        if(!this.valid(cookie, sign, json)) {
            return;
        }

        for(let k in json) {
            Session.attributes.set(k, json[k]);
        }
    }

    private saveCookie(): void {
        let userCookie = this.response.getHeader('Set-Cookie');
        let json = this.toJson();
        let base64 = Buffer.from(JSON.stringify(json)).toString('base64');
        let sign = Session.sha1(Session.options.key + base64);

        let valueCookie = new Cookie(
            Session.options.name,
            base64,
            Date.now() + Session.options.maxAge,
            '/',
            '',
            Session.options.secure,
            Session.options.httpOnly);
        let signCookie = new Cookie(
            Session.options.name + '.sig',
            sign,
            Date.now() + Session.options.maxAge,
            '/',
            '',
            Session.options.secure,
            Session.options.httpOnly);
        let header = [valueCookie.toString(), signCookie.toString()];

        // array or string
        if(userCookie) {
            header = header.concat(userCookie);
        }

        // overwrite
        this.response.setHeader('Set-Cookie', header);
    }

    private valid(cookie: string, sign: string, json: any): boolean {
        if(!json.$expire) {
            return false;
        }

        if(Date.now() > json.$expire) {
            return false;
        }

        let hash = Session.sha1(Session.options.key + cookie);
        if(hash !== sign) {
            return false;
        }

        return true;
    }
}
