"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const Request = require("candyjs/http/Request");
const Cookie = require("candyjs/http/Cookie");
/**
 * 基于 cookie 的 session
 */
class Session {
    // public hash: number = 0;
    constructor(req, res) {
        this.request = req;
        this.response = res;
    }
    static sha1(str) {
        return crypto.createHash('sha1').update(str, 'utf8').digest('hex');
    }
    /**
     * 启动 session
     */
    static start(options = {}) {
        Object.assign(Session.options, options);
        if ('' === Session.options.key) {
            throw new Error('lost config of "key"');
        }
        return (req, res, next) => {
            if (!req.session) {
                req.session = new Session(req, res);
            }
            next();
        };
    }
    /**
     * @inheritdoc
     */
    getId() {
        return '';
    }
    /**
     * @inheritdoc
     */
    getAttribute(name) {
        this.loadCookie();
        return Session.attributes.get(name);
    }
    /**
     * @inheritdoc
     */
    setAttribute(name, value) {
        this.loadCookie();
        Session.attributes.set(name, value);
        this.saveCookie();
    }
    /**
     * @inheritdoc
     */
    deleteAttribute(name) {
        this.loadCookie();
        Session.attributes.delete(name);
        this.saveCookie();
    }
    toJson() {
        let obj = {
            $expire: Date.now() + Session.options.maxAge
        };
        Session.attributes.forEach((v, k) => {
            obj[k] = v;
        });
        return obj;
    }
    loadCookie() {
        if (Session.pure) {
            return;
        }
        Session.pure = true;
        let r = new Request(this.request);
        let map = r.getCookies();
        let cookie = map.get(Session.options.name);
        let sign = map.get(Session.options.name + '.sig');
        if (!cookie || !sign) {
            return;
        }
        let json = null;
        try {
            let data = Buffer.from(cookie, 'base64').toString('utf8');
            json = JSON.parse(data);
        }
        catch (e) {
            return;
        }
        if (!this.valid(cookie, sign, json)) {
            return;
        }
        for (let k in json) {
            Session.attributes.set(k, json[k]);
        }
    }
    saveCookie() {
        let userCookie = this.response.getHeader('Set-Cookie');
        let json = this.toJson();
        let base64 = Buffer.from(JSON.stringify(json)).toString('base64');
        let sign = Session.sha1(Session.options.key + base64);
        let valueCookie = new Cookie(Session.options.name, base64, Date.now() + Session.options.maxAge, '/', '', Session.options.secure, Session.options.httpOnly);
        let signCookie = new Cookie(Session.options.name + '.sig', sign, Date.now() + Session.options.maxAge, '/', '', Session.options.secure, Session.options.httpOnly);
        let header = [valueCookie.toString(), signCookie.toString()];
        // array or string
        if (userCookie) {
            header = header.concat(userCookie);
        }
        // overwrite
        this.response.setHeader('Set-Cookie', header);
    }
    valid(cookie, sign, json) {
        if (!json.$expire) {
            return false;
        }
        if (Date.now() > json.$expire) {
            return false;
        }
        let hash = Session.sha1(Session.options.key + cookie);
        if (hash !== sign) {
            return false;
        }
        return true;
    }
}
exports.default = Session;
/**
 * 配置
 */
Session.options = {
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
Session.attributes = new Map();
Session.pure = false;
