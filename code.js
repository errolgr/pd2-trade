var Dv = Object.defineProperty
    , Bv = Object.defineProperties;
var Nv = Object.getOwnPropertyDescriptors;
var Go = Object.getOwnPropertySymbols;
var Yu = Object.prototype.hasOwnProperty
    , Xu = Object.prototype.propertyIsEnumerable;
var Ju = (e, t, r) => t in e ? Dv(e, t, {
    enumerable: !0,
    configurable: !0,
    writable: !0,
    value: r
}) : e[t] = r
    , z = (e, t) => {
    for (var r in t || (t = {}))
        Yu.call(t, r) && Ju(e, r, t[r]);
    if (Go)
        for (var r of Go(t))
            Xu.call(t, r) && Ju(e, r, t[r]);
    return e
}
    , Qe = (e, t) => Bv(e, Nv(t));
var Ft = (e, t) => {
        var r = {};
        for (var n in e)
            Yu.call(e, n) && t.indexOf(n) < 0 && (r[n] = e[n]);
        if (e != null && Go)
            for (var n of Go(e))
                t.indexOf(n) < 0 && Xu.call(e, n) && (r[n] = e[n]);
        return r
    }
;
function $a(e, t) {
    const r = Object.create(null)
        , n = e.split(",");
    for (let o = 0; o < n.length; o++)
        r[n[o]] = !0;
    return t ? o => !!r[o.toLowerCase()] : o => !!r[o]
}
const Lv = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly"
    , jv = $a(Lv);
function Qu(e) {
    return !!e || e === ""
}
function Yo(e) {
    if (te(e)) {
        const t = {};
        for (let r = 0; r < e.length; r++) {
            const n = e[r]
                , o = qe(n) ? Wv(n) : Yo(n);
            if (o)
                for (const i in o)
                    t[i] = o[i]
        }
        return t
    } else {
        if (qe(e))
            return e;
        if (Ne(e))
            return e
    }
}
const Hv = /;(?![^(]*\))/g
    , Uv = /:(.+)/;
function Wv(e) {
    const t = {};
    return e.split(Hv).forEach(r => {
            if (r) {
                const n = r.split(Uv);
                n.length > 1 && (t[n[0].trim()] = n[1].trim())
            }
        }
    ),
        t
}
function Ma(e) {
    let t = "";
    if (qe(e))
        t = e;
    else if (te(e))
        for (let r = 0; r < e.length; r++) {
            const n = Ma(e[r]);
            n && (t += n + " ")
        }
    else if (Ne(e))
        for (const r in e)
            e[r] && (t += r + " ");
    return t.trim()
}
function qv(e, t) {
    if (e.length !== t.length)
        return !1;
    let r = !0;
    for (let n = 0; r && n < e.length; n++)
        r = xr(e[n], t[n]);
    return r
}
function xr(e, t) {
    if (e === t)
        return !0;
    let r = ec(e)
        , n = ec(t);
    if (r || n)
        return r && n ? e.getTime() === t.getTime() : !1;
    if (r = te(e),
        n = te(t),
    r || n)
        return r && n ? qv(e, t) : !1;
    if (r = Ne(e),
        n = Ne(t),
    r || n) {
        if (!r || !n)
            return !1;
        const o = Object.keys(e).length
            , i = Object.keys(t).length;
        if (o !== i)
            return !1;
        for (const a in e) {
            const s = e.hasOwnProperty(a)
                , l = t.hasOwnProperty(a);
            if (s && !l || !s && l || !xr(e[a], t[a]))
                return !1
        }
    }
    return String(e) === String(t)
}
function Ra(e, t) {
    return e.findIndex(r => xr(r, t))
}
const zv = e => e == null ? "" : te(e) || Ne(e) && (e.toString === rc || !de(e.toString)) ? JSON.stringify(e, Zu, 2) : String(e)
    , Zu = (e, t) => t && t.__v_isRef ? Zu(e, t.value) : Qr(t) ? {
        [`Map(${t.size})`]: [...t.entries()].reduce( (r, [n,o]) => (r[`${n} =>`] = o,
            r), {})
    } : Zr(t) ? {
        [`Set(${t.size})`]: [...t.values()]
    } : Ne(t) && !te(t) && !nc(t) ? String(t) : t
    , Ae = {}
    , Jr = []
    , At = () => {}
    , Vv = () => !1
    , Kv = /^on[^a-z]/
    , ro = e => Kv.test(e)
    , Ia = e => e.startsWith("onUpdate:")
    , Ze = Object.assign
    , Da = (e, t) => {
        const r = e.indexOf(t);
        r > -1 && e.splice(r, 1)
    }
    , Gv = Object.prototype.hasOwnProperty
    , ge = (e, t) => Gv.call(e, t)
    , te = Array.isArray
    , Qr = e => Xo(e) === "[object Map]"
    , Zr = e => Xo(e) === "[object Set]"
    , ec = e => e instanceof Date
    , de = e => typeof e == "function"
    , qe = e => typeof e == "string"
    , Ba = e => typeof e == "symbol"
    , Ne = e => e !== null && typeof e == "object"
    , tc = e => Ne(e) && de(e.then) && de(e.catch)
    , rc = Object.prototype.toString
    , Xo = e => rc.call(e)
    , Yv = e => Xo(e).slice(8, -1)
    , nc = e => Xo(e) === "[object Object]"
    , Na = e => qe(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e
    , no = $a(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted")
    , Jo = e => {
        const t = Object.create(null);
        return r => t[r] || (t[r] = e(r))
    }
    , Xv = /-(\w)/g
    , Bt = Jo(e => e.replace(Xv, (t, r) => r ? r.toUpperCase() : ""))
    , Jv = /\B([A-Z])/g
    , Sr = Jo(e => e.replace(Jv, "-$1").toLowerCase())
    , Qo = Jo(e => e.charAt(0).toUpperCase() + e.slice(1))
    , La = Jo(e => e ? `on${Qo(e)}` : "")
    , oo = (e, t) => !Object.is(e, t)
    , Zo = (e, t) => {
        for (let r = 0; r < e.length; r++)
            e[r](t)
    }
    , ei = (e, t, r) => {
        Object.defineProperty(e, t, {
            configurable: !0,
            enumerable: !1,
            value: r
        })
    }
    , io = e => {
        const t = parseFloat(e);
        return isNaN(t) ? e : t
    }
;
let oc;
const Qv = () => oc || (oc = typeof globalThis != "undefined" ? globalThis : typeof self != "undefined" ? self : typeof window != "undefined" ? window : typeof global != "undefined" ? global : {});
let Or;
const ti = [];
class Zv {
    constructor(t=!1) {
        this.active = !0,
            this.effects = [],
            this.cleanups = [],
        !t && Or && (this.parent = Or,
            this.index = (Or.scopes || (Or.scopes = [])).push(this) - 1)
    }
    run(t) {
        if (this.active)
            try {
                return this.on(),
                    t()
            } finally {
                this.off()
            }
    }
    on() {
        this.active && (ti.push(this),
            Or = this)
    }
    off() {
        this.active && (ti.pop(),
            Or = ti[ti.length - 1])
    }
    stop(t) {
        if (this.active) {
            if (this.effects.forEach(r => r.stop()),
                this.cleanups.forEach(r => r()),
            this.scopes && this.scopes.forEach(r => r.stop(!0)),
            this.parent && !t) {
                const r = this.parent.scopes.pop();
                r && r !== this && (this.parent.scopes[this.index] = r,
                    r.index = this.index)
            }
            this.active = !1
        }
    }
}
function em(e, t) {
    t = t || Or,
    t && t.active && t.effects.push(e)
}
const ja = e => {
    const t = new Set(e);
    return t.w = 0,
        t.n = 0,
        t
}
    , ic = e => (e.w & Qt) > 0
    , ac = e => (e.n & Qt) > 0
    , tm = ({deps: e}) => {
    if (e.length)
        for (let t = 0; t < e.length; t++)
            e[t].w |= Qt
}
    , rm = e => {
    const {deps: t} = e;
    if (t.length) {
        let r = 0;
        for (let n = 0; n < t.length; n++) {
            const o = t[n];
            ic(o) && !ac(o) ? o.delete(e) : t[r++] = o,
                o.w &= ~Qt,
                o.n &= ~Qt
        }
        t.length = r
    }
}
    , Ha = new WeakMap;
let ao = 0
    , Qt = 1;
const Ua = 30
    , so = [];
let Er;
const Fr = Symbol("")
    , Wa = Symbol("");
class qa {
    constructor(t, r=null, n) {
        this.fn = t,
            this.scheduler = r,
            this.active = !0,
            this.deps = [],
            em(this, n)
    }
    run() {
        if (!this.active)
            return this.fn();
        if (!so.includes(this))
            try {
                return so.push(Er = this),
                    nm(),
                    Qt = 1 << ++ao,
                    ao <= Ua ? tm(this) : sc(this),
                    this.fn()
            } finally {
                ao <= Ua && rm(this),
                    Qt = 1 << --ao,
                    Ar(),
                    so.pop();
                const t = so.length;
                Er = t > 0 ? so[t - 1] : void 0
            }
    }
    stop() {
        this.active && (sc(this),
        this.onStop && this.onStop(),
            this.active = !1)
    }
}
function sc(e) {
    const {deps: t} = e;
    if (t.length) {
        for (let r = 0; r < t.length; r++)
            t[r].delete(e);
        t.length = 0
    }
}
let en = !0;
const za = [];
function tn() {
    za.push(en),
        en = !1
}
function nm() {
    za.push(en),
        en = !0
}
function Ar() {
    const e = za.pop();
    en = e === void 0 ? !0 : e
}
function dt(e, t, r) {
    if (!lc())
        return;
    let n = Ha.get(e);
    n || Ha.set(e, n = new Map);
    let o = n.get(r);
    o || n.set(r, o = ja()),
        uc(o)
}
function lc() {
    return en && Er !== void 0
}
function uc(e, t) {
    let r = !1;
    ao <= Ua ? ac(e) || (e.n |= Qt,
        r = !ic(e)) : r = !e.has(Er),
    r && (e.add(Er),
        Er.deps.push(e))
}
function zt(e, t, r, n, o, i) {
    const a = Ha.get(e);
    if (!a)
        return;
    let s = [];
    if (t === "clear")
        s = [...a.values()];
    else if (r === "length" && te(e))
        a.forEach( (l, c) => {
                (c === "length" || c >= n) && s.push(l)
            }
        );
    else
        switch (r !== void 0 && s.push(a.get(r)),
            t) {
            case "add":
                te(e) ? Na(r) && s.push(a.get("length")) : (s.push(a.get(Fr)),
                Qr(e) && s.push(a.get(Wa)));
                break;
            case "delete":
                te(e) || (s.push(a.get(Fr)),
                Qr(e) && s.push(a.get(Wa)));
                break;
            case "set":
                Qr(e) && s.push(a.get(Fr));
                break
        }
    if (s.length === 1)
        s[0] && Va(s[0]);
    else {
        const l = [];
        for (const c of s)
            c && l.push(...c);
        Va(ja(l))
    }
}
function Va(e, t) {
    for (const r of te(e) ? e : [...e])
        (r !== Er || r.allowRecurse) && (r.scheduler ? r.scheduler() : r.run())
}
const om = $a("__proto__,__v_isRef,__isVue")
    , cc = new Set(Object.getOwnPropertyNames(Symbol).map(e => Symbol[e]).filter(Ba))
    , im = Ka()
    , am = Ka(!1, !0)
    , sm = Ka(!0)
    , fc = lm();
function lm() {
    const e = {};
    return ["includes", "indexOf", "lastIndexOf"].forEach(t => {
            e[t] = function(...r) {
                const n = ce(this);
                for (let i = 0, a = this.length; i < a; i++)
                    dt(n, "get", i + "");
                const o = n[t](...r);
                return o === -1 || o === !1 ? n[t](...r.map(ce)) : o
            }
        }
    ),
        ["push", "pop", "shift", "unshift", "splice"].forEach(t => {
                e[t] = function(...r) {
                    tn();
                    const n = ce(this)[t].apply(this, r);
                    return Ar(),
                        n
                }
            }
        ),
        e
}
function Ka(e=!1, t=!1) {
    return function(n, o, i) {
        if (o === "__v_isReactive")
            return !e;
        if (o === "__v_isReadonly")
            return e;
        if (o === "__v_raw" && i === (e ? t ? Sm : wc : t ? bc : yc).get(n))
            return n;
        const a = te(n);
        if (!e && a && ge(fc, o))
            return Reflect.get(fc, o, i);
        const s = Reflect.get(n, o, i);
        return (Ba(o) ? cc.has(o) : om(o)) || (e || dt(n, "get", o),
            t) ? s : et(s) ? !a || !Na(o) ? s.value : s : Ne(s) ? e ? Cc(s) : er(s) : s
    }
}
const um = dc()
    , cm = dc(!0);
function dc(e=!1) {
    return function(r, n, o, i) {
        let a = r[n];
        if (!e && !Ja(o) && (o = ce(o),
            a = ce(a),
        !te(r) && et(a) && !et(o)))
            return a.value = o,
                !0;
        const s = te(r) && Na(n) ? Number(n) < r.length : ge(r, n)
            , l = Reflect.set(r, n, o, i);
        return r === ce(i) && (s ? oo(o, a) && zt(r, "set", n, o) : zt(r, "add", n, o)),
            l
    }
}
function fm(e, t) {
    const r = ge(e, t);
    e[t];
    const n = Reflect.deleteProperty(e, t);
    return n && r && zt(e, "delete", t, void 0),
        n
}
function dm(e, t) {
    const r = Reflect.has(e, t);
    return (!Ba(t) || !cc.has(t)) && dt(e, "has", t),
        r
}
function pm(e) {
    return dt(e, "iterate", te(e) ? "length" : Fr),
        Reflect.ownKeys(e)
}
const pc = {
    get: im,
    set: um,
    deleteProperty: fm,
    has: dm,
    ownKeys: pm
}
    , hm = {
    get: sm,
    set(e, t) {
        return !0
    },
    deleteProperty(e, t) {
        return !0
    }
}
    , vm = Ze({}, pc, {
    get: am,
    set: cm
})
    , Ga = e => e
    , ri = e => Reflect.getPrototypeOf(e);
function ni(e, t, r=!1, n=!1) {
    e = e.__v_raw;
    const o = ce(e)
        , i = ce(t);
    t !== i && !r && dt(o, "get", t),
    !r && dt(o, "get", i);
    const {has: a} = ri(o)
        , s = n ? Ga : r ? Qa : lo;
    if (a.call(o, t))
        return s(e.get(t));
    if (a.call(o, i))
        return s(e.get(i));
    e !== o && e.get(t)
}
function oi(e, t=!1) {
    const r = this.__v_raw
        , n = ce(r)
        , o = ce(e);
    return e !== o && !t && dt(n, "has", e),
    !t && dt(n, "has", o),
        e === o ? r.has(e) : r.has(e) || r.has(o)
}
function ii(e, t=!1) {
    return e = e.__v_raw,
    !t && dt(ce(e), "iterate", Fr),
        Reflect.get(e, "size", e)
}
function hc(e) {
    e = ce(e);
    const t = ce(this);
    return ri(t).has.call(t, e) || (t.add(e),
        zt(t, "add", e, e)),
        this
}
function vc(e, t) {
    t = ce(t);
    const r = ce(this)
        , {has: n, get: o} = ri(r);
    let i = n.call(r, e);
    i || (e = ce(e),
        i = n.call(r, e));
    const a = o.call(r, e);
    return r.set(e, t),
        i ? oo(t, a) && zt(r, "set", e, t) : zt(r, "add", e, t),
        this
}
function mc(e) {
    const t = ce(this)
        , {has: r, get: n} = ri(t);
    let o = r.call(t, e);
    o || (e = ce(e),
        o = r.call(t, e)),
    n && n.call(t, e);
    const i = t.delete(e);
    return o && zt(t, "delete", e, void 0),
        i
}
function gc() {
    const e = ce(this)
        , t = e.size !== 0
        , r = e.clear();
    return t && zt(e, "clear", void 0, void 0),
        r
}
function ai(e, t) {
    return function(n, o) {
        const i = this
            , a = i.__v_raw
            , s = ce(a)
            , l = t ? Ga : e ? Qa : lo;
        return !e && dt(s, "iterate", Fr),
            a.forEach( (c, u) => n.call(o, l(c), l(u), i))
    }
}
function si(e, t, r) {
    return function(...n) {
        const o = this.__v_raw
            , i = ce(o)
            , a = Qr(i)
            , s = e === "entries" || e === Symbol.iterator && a
            , l = e === "keys" && a
            , c = o[e](...n)
            , u = r ? Ga : t ? Qa : lo;
        return !t && dt(i, "iterate", l ? Wa : Fr),
            {
                next() {
                    const {value: f, done: d} = c.next();
                    return d ? {
                        value: f,
                        done: d
                    } : {
                        value: s ? [u(f[0]), u(f[1])] : u(f),
                        done: d
                    }
                },
                [Symbol.iterator]() {
                    return this
                }
            }
    }
}
function Zt(e) {
    return function(...t) {
        return e === "delete" ? !1 : this
    }
}
function mm() {
    const e = {
        get(i) {
            return ni(this, i)
        },
        get size() {
            return ii(this)
        },
        has: oi,
        add: hc,
        set: vc,
        delete: mc,
        clear: gc,
        forEach: ai(!1, !1)
    }
        , t = {
        get(i) {
            return ni(this, i, !1, !0)
        },
        get size() {
            return ii(this)
        },
        has: oi,
        add: hc,
        set: vc,
        delete: mc,
        clear: gc,
        forEach: ai(!1, !0)
    }
        , r = {
        get(i) {
            return ni(this, i, !0)
        },
        get size() {
            return ii(this, !0)
        },
        has(i) {
            return oi.call(this, i, !0)
        },
        add: Zt("add"),
        set: Zt("set"),
        delete: Zt("delete"),
        clear: Zt("clear"),
        forEach: ai(!0, !1)
    }
        , n = {
        get(i) {
            return ni(this, i, !0, !0)
        },
        get size() {
            return ii(this, !0)
        },
        has(i) {
            return oi.call(this, i, !0)
        },
        add: Zt("add"),
        set: Zt("set"),
        delete: Zt("delete"),
        clear: Zt("clear"),
        forEach: ai(!0, !0)
    };
    return ["keys", "values", "entries", Symbol.iterator].forEach(i => {
            e[i] = si(i, !1, !1),
                r[i] = si(i, !0, !1),
                t[i] = si(i, !1, !0),
                n[i] = si(i, !0, !0)
        }
    ),
        [e, r, t, n]
}
const [gm,ym,bm,wm] = mm();
function Ya(e, t) {
    const r = t ? e ? wm : bm : e ? ym : gm;
    return (n, o, i) => o === "__v_isReactive" ? !e : o === "__v_isReadonly" ? e : o === "__v_raw" ? n : Reflect.get(ge(r, o) && o in n ? r : n, o, i)
}
const Cm = {
    get: Ya(!1, !1)
}
    , _m = {
    get: Ya(!1, !0)
}
    , xm = {
    get: Ya(!0, !1)
}
    , yc = new WeakMap
    , bc = new WeakMap
    , wc = new WeakMap
    , Sm = new WeakMap;
function Om(e) {
    switch (e) {
        case "Object":
        case "Array":
            return 1;
        case "Map":
        case "Set":
        case "WeakMap":
        case "WeakSet":
            return 2;
        default:
            return 0
    }
}
function Em(e) {
    return e.__v_skip || !Object.isExtensible(e) ? 0 : Om(Yv(e))
}
function er(e) {
    return e && e.__v_isReadonly ? e : Xa(e, !1, pc, Cm, yc)
}
function Fm(e) {
    return Xa(e, !1, vm, _m, bc)
}
function Cc(e) {
    return Xa(e, !0, hm, xm, wc)
}
function Xa(e, t, r, n, o) {
    if (!Ne(e) || e.__v_raw && !(t && e.__v_isReactive))
        return e;
    const i = o.get(e);
    if (i)
        return i;
    const a = Em(e);
    if (a === 0)
        return e;
    const s = new Proxy(e,a === 2 ? n : r);
    return o.set(e, s),
        s
}
function rn(e) {
    return Ja(e) ? rn(e.__v_raw) : !!(e && e.__v_isReactive)
}
function Ja(e) {
    return !!(e && e.__v_isReadonly)
}
function _c(e) {
    return rn(e) || Ja(e)
}
function ce(e) {
    const t = e && e.__v_raw;
    return t ? ce(t) : e
}
function xc(e) {
    return ei(e, "__v_skip", !0),
        e
}
const lo = e => Ne(e) ? er(e) : e
    , Qa = e => Ne(e) ? Cc(e) : e;
function Sc(e) {
    lc() && (e = ce(e),
    e.dep || (e.dep = ja()),
        uc(e.dep))
}
function Oc(e, t) {
    e = ce(e),
    e.dep && Va(e.dep)
}
function et(e) {
    return Boolean(e && e.__v_isRef === !0)
}
function U(e) {
    return Ec(e, !1)
}
function Am(e) {
    return Ec(e, !0)
}
function Ec(e, t) {
    return et(e) ? e : new km(e,t)
}
class km {
    constructor(t, r) {
        this._shallow = r,
            this.dep = void 0,
            this.__v_isRef = !0,
            this._rawValue = r ? t : ce(t),
            this._value = r ? t : lo(t)
    }
    get value() {
        return Sc(this),
            this._value
    }
    set value(t) {
        t = this._shallow ? t : ce(t),
        oo(t, this._rawValue) && (this._rawValue = t,
            this._value = this._shallow ? t : lo(t),
            Oc(this))
    }
}
function lt(e) {
    return et(e) ? e.value : e
}
const Pm = {
    get: (e, t, r) => lt(Reflect.get(e, t, r)),
    set: (e, t, r, n) => {
        const o = e[t];
        return et(o) && !et(r) ? (o.value = r,
            !0) : Reflect.set(e, t, r, n)
    }
};
function Fc(e) {
    return rn(e) ? e : new Proxy(e,Pm)
}
function Ac(e) {
    const t = te(e) ? new Array(e.length) : {};
    for (const r in e)
        t[r] = $m(e, r);
    return t
}
class Tm {
    constructor(t, r, n) {
        this._object = t,
            this._key = r,
            this._defaultValue = n,
            this.__v_isRef = !0
    }
    get value() {
        const t = this._object[this._key];
        return t === void 0 ? this._defaultValue : t
    }
    set value(t) {
        this._object[this._key] = t
    }
}
function $m(e, t, r) {
    const n = e[t];
    return et(n) ? n : new Tm(e,t,r)
}
class Mm {
    constructor(t, r, n) {
        this._setter = r,
            this.dep = void 0,
            this._dirty = !0,
            this.__v_isRef = !0,
            this.effect = new qa(t, () => {
                    this._dirty || (this._dirty = !0,
                        Oc(this))
                }
            ),
            this.__v_isReadonly = n
    }
    get value() {
        const t = ce(this);
        return Sc(t),
        t._dirty && (t._dirty = !1,
            t._value = t.effect.run()),
            t._value
    }
    set value(t) {
        this._setter(t)
    }
}
function W(e, t) {
    let r, n;
    const o = de(e);
    return o ? (r = e,
        n = At) : (r = e.get,
        n = e.set),
        new Mm(r,n,o || !n)
}
Promise.resolve();
function Rm(e, t, ...r) {
    const n = e.vnode.props || Ae;
    let o = r;
    const i = t.startsWith("update:")
        , a = i && t.slice(7);
    if (a && a in n) {
        const u = `${a === "modelValue" ? "model" : a}Modifiers`
            , {number: f, trim: d} = n[u] || Ae;
        d ? o = r.map(p => p.trim()) : f && (o = r.map(io))
    }
    let s, l = n[s = La(t)] || n[s = La(Bt(t))];
    !l && i && (l = n[s = La(Sr(t))]),
    l && yt(l, e, 6, o);
    const c = n[s + "Once"];
    if (c) {
        if (!e.emitted)
            e.emitted = {};
        else if (e.emitted[s])
            return;
        e.emitted[s] = !0,
            yt(c, e, 6, o)
    }
}
function kc(e, t, r=!1) {
    const n = t.emitsCache
        , o = n.get(e);
    if (o !== void 0)
        return o;
    const i = e.emits;
    let a = {}
        , s = !1;
    if (!de(e)) {
        const l = c => {
                const u = kc(c, t, !0);
                u && (s = !0,
                    Ze(a, u))
            }
        ;
        !r && t.mixins.length && t.mixins.forEach(l),
        e.extends && l(e.extends),
        e.mixins && e.mixins.forEach(l)
    }
    return !i && !s ? (n.set(e, null),
        null) : (te(i) ? i.forEach(l => a[l] = null) : Ze(a, i),
        n.set(e, a),
        a)
}
function Za(e, t) {
    return !e || !ro(t) ? !1 : (t = t.slice(2).replace(/Once$/, ""),
    ge(e, t[0].toLowerCase() + t.slice(1)) || ge(e, Sr(t)) || ge(e, t))
}
let pt = null
    , li = null;
function ui(e) {
    const t = pt;
    return pt = e,
        li = e && e.type.__scopeId || null,
        t
}
function CA(e) {
    li = e
}
function _A() {
    li = null
}
function Pc(e, t=pt, r) {
    if (!t || e._n)
        return e;
    const n = (...o) => {
            n._d && rf(-1);
            const i = ui(t)
                , a = e(...o);
            return ui(i),
            n._d && rf(1),
                a
        }
    ;
    return n._n = !0,
        n._c = !0,
        n._d = !0,
        n
}
function es(e) {
    const {type: t, vnode: r, proxy: n, withProxy: o, props: i, propsOptions: [a], slots: s, attrs: l, emit: c, render: u, renderCache: f, data: d, setupState: p, ctx: g, inheritAttrs: m} = e;
    let h, v;
    const w = ui(e);
    try {
        if (r.shapeFlag & 4) {
            const b = o || n;
            h = kt(u.call(b, b, f, i, p, d, g)),
                v = l
        } else {
            const b = t;
            h = kt(b.length > 1 ? b(i, {
                attrs: l,
                slots: s,
                emit: c
            }) : b(i, null)),
                v = t.props ? l : Im(l)
        }
    } catch (b) {
        po.length = 0,
            Si(b, e, 1),
            h = V(mt)
    }
    let S = h;
    if (v && m !== !1) {
        const b = Object.keys(v)
            , {shapeFlag: O} = S;
        b.length && O & (1 | 6) && (a && b.some(Ia) && (v = Dm(v, a)),
            S = Mr(S, v))
    }
    return r.dirs && (S.dirs = S.dirs ? S.dirs.concat(r.dirs) : r.dirs),
    r.transition && (S.transition = r.transition),
        h = S,
        ui(w),
        h
}
const Im = e => {
        let t;
        for (const r in e)
            (r === "class" || r === "style" || ro(r)) && ((t || (t = {}))[r] = e[r]);
        return t
    }
    , Dm = (e, t) => {
        const r = {};
        for (const n in e)
            (!Ia(n) || !(n.slice(9)in t)) && (r[n] = e[n]);
        return r
    }
;
function Bm(e, t, r) {
    const {props: n, children: o, component: i} = e
        , {props: a, children: s, patchFlag: l} = t
        , c = i.emitsOptions;
    if (t.dirs || t.transition)
        return !0;
    if (r && l >= 0) {
        if (l & 1024)
            return !0;
        if (l & 16)
            return n ? Tc(n, a, c) : !!a;
        if (l & 8) {
            const u = t.dynamicProps;
            for (let f = 0; f < u.length; f++) {
                const d = u[f];
                if (a[d] !== n[d] && !Za(c, d))
                    return !0
            }
        }
    } else
        return (o || s) && (!s || !s.$stable) ? !0 : n === a ? !1 : n ? a ? Tc(n, a, c) : !0 : !!a;
    return !1
}
function Tc(e, t, r) {
    const n = Object.keys(t);
    if (n.length !== Object.keys(e).length)
        return !0;
    for (let o = 0; o < n.length; o++) {
        const i = n[o];
        if (t[i] !== e[i] && !Za(r, i))
            return !0
    }
    return !1
}
function Nm({vnode: e, parent: t}, r) {
    for (; t && t.subTree === e; )
        (e = t.vnode).el = r,
            t = t.parent
}
const Lm = e => e.__isSuspense;
function $c(e, t) {
    t && t.pendingBranch ? te(e) ? t.effects.push(...e) : t.effects.push(e) : Dg(e)
}
function Me(e, t) {
    if (Ke) {
        let r = Ke.provides;
        const n = Ke.parent && Ke.parent.provides;
        n === r && (r = Ke.provides = Object.create(n)),
            r[e] = t
    }
}
function Ce(e, t, r=!1) {
    const n = Ke || pt;
    if (n) {
        const o = n.parent == null ? n.vnode.appContext && n.vnode.appContext.provides : n.parent.provides;
        if (o && e in o)
            return o[e];
        if (arguments.length > 1)
            return r && de(t) ? t.call(n.proxy) : t
    }
}
function jm() {
    const e = {
        isMounted: !1,
        isLeaving: !1,
        isUnmounting: !1,
        leavingVNodes: new Map
    };
    return Pe( () => {
            e.isMounted = !0
        }
    ),
        uo( () => {
                e.isUnmounting = !0
            }
        ),
        e
}
const vt = [Function, Array]
    , Hm = {
    name: "BaseTransition",
    props: {
        mode: String,
        appear: Boolean,
        persisted: Boolean,
        onBeforeEnter: vt,
        onEnter: vt,
        onAfterEnter: vt,
        onEnterCancelled: vt,
        onBeforeLeave: vt,
        onLeave: vt,
        onAfterLeave: vt,
        onLeaveCancelled: vt,
        onBeforeAppear: vt,
        onAppear: vt,
        onAfterAppear: vt,
        onAppearCancelled: vt
    },
    setup(e, {slots: t}) {
        const r = ms()
            , n = jm();
        let o;
        return () => {
            const i = t.default && Dc(t.default(), !0);
            if (!i || !i.length)
                return;
            const a = ce(e)
                , {mode: s} = a
                , l = i[0];
            if (n.isLeaving)
                return rs(l);
            const c = Ic(l);
            if (!c)
                return rs(l);
            const u = ts(c, a, n, r);
            ns(c, u);
            const f = r.subTree
                , d = f && Ic(f);
            let p = !1;
            const {getTransitionKey: g} = c.type;
            if (g) {
                const m = g();
                o === void 0 ? o = m : m !== o && (o = m,
                    p = !0)
            }
            if (d && d.type !== mt && (!$r(c, d) || p)) {
                const m = ts(d, a, n, r);
                if (ns(d, m),
                s === "out-in")
                    return n.isLeaving = !0,
                        m.afterLeave = () => {
                            n.isLeaving = !1,
                                r.update()
                        }
                        ,
                        rs(l);
                s === "in-out" && c.type !== mt && (m.delayLeave = (h, v, w) => {
                        const S = Rc(n, d);
                        S[String(d.key)] = d,
                            h._leaveCb = () => {
                                v(),
                                    h._leaveCb = void 0,
                                    delete u.delayedLeave
                            }
                            ,
                            u.delayedLeave = w
                    }
                )
            }
            return l
        }
    }
}
    , Mc = Hm;
function Rc(e, t) {
    const {leavingVNodes: r} = e;
    let n = r.get(t.type);
    return n || (n = Object.create(null),
        r.set(t.type, n)),
        n
}
function ts(e, t, r, n) {
    const {appear: o, mode: i, persisted: a=!1, onBeforeEnter: s, onEnter: l, onAfterEnter: c, onEnterCancelled: u, onBeforeLeave: f, onLeave: d, onAfterLeave: p, onLeaveCancelled: g, onBeforeAppear: m, onAppear: h, onAfterAppear: v, onAppearCancelled: w} = t
        , S = String(e.key)
        , b = Rc(r, e)
        , O = (_, E) => {
        _ && yt(_, n, 9, E)
    }
        , C = {
        mode: i,
        persisted: a,
        beforeEnter(_) {
            let E = s;
            if (!r.isMounted)
                if (o)
                    E = m || s;
                else
                    return;
            _._leaveCb && _._leaveCb(!0);
            const A = b[S];
            A && $r(e, A) && A.el._leaveCb && A.el._leaveCb(),
                O(E, [_])
        },
        enter(_) {
            let E = l
                , A = c
                , M = u;
            if (!r.isMounted)
                if (o)
                    E = h || l,
                        A = v || c,
                        M = w || u;
                else
                    return;
            let I = !1;
            const F = _._enterCb = B => {
                    I || (I = !0,
                        B ? O(M, [_]) : O(A, [_]),
                    C.delayedLeave && C.delayedLeave(),
                        _._enterCb = void 0)
                }
            ;
            E ? (E(_, F),
            E.length <= 1 && F()) : F()
        },
        leave(_, E) {
            const A = String(e.key);
            if (_._enterCb && _._enterCb(!0),
                r.isUnmounting)
                return E();
            O(f, [_]);
            let M = !1;
            const I = _._leaveCb = F => {
                    M || (M = !0,
                        E(),
                        F ? O(g, [_]) : O(p, [_]),
                        _._leaveCb = void 0,
                    b[A] === e && delete b[A])
                }
            ;
            b[A] = e,
                d ? (d(_, I),
                d.length <= 1 && I()) : I()
        },
        clone(_) {
            return ts(_, t, r, n)
        }
    };
    return C
}
function rs(e) {
    if (fi(e))
        return e = Mr(e),
            e.children = null,
            e
}
function Ic(e) {
    return fi(e) ? e.children ? e.children[0] : void 0 : e
}
function ns(e, t) {
    e.shapeFlag & 6 && e.component ? ns(e.component.subTree, t) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent),
        e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t
}
function Dc(e, t=!1) {
    let r = []
        , n = 0;
    for (let o = 0; o < e.length; o++) {
        const i = e[o];
        i.type === at ? (i.patchFlag & 128 && n++,
            r = r.concat(Dc(i.children, t))) : (t || i.type !== mt) && r.push(i)
    }
    if (n > 1)
        for (let o = 0; o < r.length; o++)
            r[o].patchFlag = -2;
    return r
}
function ie(e) {
    return de(e) ? {
        setup: e,
        name: e.name
    } : e
}
const ci = e => !!e.type.__asyncLoader
    , fi = e => e.type.__isKeepAlive;
function Um(e, t) {
    Bc(e, "a", t)
}
function Wm(e, t) {
    Bc(e, "da", t)
}
function Bc(e, t, r=Ke) {
    const n = e.__wdc || (e.__wdc = () => {
            let o = r;
            for (; o; ) {
                if (o.isDeactivated)
                    return;
                o = o.parent
            }
            return e()
        }
    );
    if (di(t, n, r),
        r) {
        let o = r.parent;
        for (; o && o.parent; )
            fi(o.parent.vnode) && qm(n, t, r, o),
                o = o.parent
    }
}
function qm(e, t, r, n) {
    const o = di(t, e, n, !0);
    Ve( () => {
            Da(n[t], o)
        }
        , r)
}
function di(e, t, r=Ke, n=!1) {
    if (r) {
        const o = r[e] || (r[e] = [])
            , i = t.__weh || (t.__weh = (...a) => {
                if (r.isUnmounted)
                    return;
                tn(),
                    on(r);
                const s = yt(t, r, e, a);
                return Rr(),
                    Ar(),
                    s
            }
        );
        return n ? o.unshift(i) : o.push(i),
            i
    }
}
const Vt = e => (t, r=Ke) => (!xi || e === "sp") && di(e, t, r)
    , zm = Vt("bm")
    , Pe = Vt("m")
    , Vm = Vt("bu")
    , os = Vt("u")
    , uo = Vt("bum")
    , Ve = Vt("um")
    , Km = Vt("sp")
    , Gm = Vt("rtg")
    , Ym = Vt("rtc");
function Xm(e, t=Ke) {
    di("ec", e, t)
}
let is = !0;
function Jm(e) {
    const t = jc(e)
        , r = e.proxy
        , n = e.ctx;
    is = !1,
    t.beforeCreate && Nc(t.beforeCreate, e, "bc");
    const {data: o, computed: i, methods: a, watch: s, provide: l, inject: c, created: u, beforeMount: f, mounted: d, beforeUpdate: p, updated: g, activated: m, deactivated: h, beforeDestroy: v, beforeUnmount: w, destroyed: S, unmounted: b, render: O, renderTracked: C, renderTriggered: _, errorCaptured: E, serverPrefetch: A, expose: M, inheritAttrs: I, components: F, directives: B, filters: K} = t;
    if (c && Qm(c, n, null, e.appContext.config.unwrapInjectedRef),
        a)
        for (const ne in a) {
            const se = a[ne];
            de(se) && (n[ne] = se.bind(r))
        }
    if (o) {
        const ne = o.call(r, r);
        Ne(ne) && (e.data = er(ne))
    }
    if (is = !0,
        i)
        for (const ne in i) {
            const se = i[ne]
                , xe = de(se) ? se.bind(r, r) : de(se.get) ? se.get.bind(r, r) : At
                , Be = !de(se) && de(se.set) ? se.set.bind(r) : At
                , We = W({
                get: xe,
                set: Be
            });
            Object.defineProperty(n, ne, {
                enumerable: !0,
                configurable: !0,
                get: () => We.value,
                set: Xe => We.value = Xe
            })
        }
    if (s)
        for (const ne in s)
            Lc(s[ne], n, r, ne);
    if (l) {
        const ne = de(l) ? l.call(r) : l;
        Reflect.ownKeys(ne).forEach(se => {
                Me(se, ne[se])
            }
        )
    }
    u && Nc(u, e, "c");
    function ee(ne, se) {
        te(se) ? se.forEach(xe => ne(xe.bind(r))) : se && ne(se.bind(r))
    }
    if (ee(zm, f),
        ee(Pe, d),
        ee(Vm, p),
        ee(os, g),
        ee(Um, m),
        ee(Wm, h),
        ee(Xm, E),
        ee(Ym, C),
        ee(Gm, _),
        ee(uo, w),
        ee(Ve, b),
        ee(Km, A),
        te(M))
        if (M.length) {
            const ne = e.exposed || (e.exposed = {});
            M.forEach(se => {
                    Object.defineProperty(ne, se, {
                        get: () => r[se],
                        set: xe => r[se] = xe
                    })
                }
            )
        } else
            e.exposed || (e.exposed = {});
    O && e.render === At && (e.render = O),
    I != null && (e.inheritAttrs = I),
    F && (e.components = F),
    B && (e.directives = B)
}
function Qm(e, t, r=At, n=!1) {
    te(e) && (e = as(e));
    for (const o in e) {
        const i = e[o];
        let a;
        Ne(i) ? "default"in i ? a = Ce(i.from || o, i.default, !0) : a = Ce(i.from || o) : a = Ce(i),
            et(a) && n ? Object.defineProperty(t, o, {
                enumerable: !0,
                configurable: !0,
                get: () => a.value,
                set: s => a.value = s
            }) : t[o] = a
    }
}
function Nc(e, t, r) {
    yt(te(e) ? e.map(n => n.bind(t.proxy)) : e.bind(t.proxy), t, r)
}
function Lc(e, t, r, n) {
    const o = n.includes(".") ? wf(r, n) : () => r[n];
    if (qe(e)) {
        const i = t[e];
        de(i) && st(o, i)
    } else if (de(e))
        st(o, e.bind(r));
    else if (Ne(e))
        if (te(e))
            e.forEach(i => Lc(i, t, r, n));
        else {
            const i = de(e.handler) ? e.handler.bind(r) : t[e.handler];
            de(i) && st(o, i, e)
        }
}
function jc(e) {
    const t = e.type
        , {mixins: r, extends: n} = t
        , {mixins: o, optionsCache: i, config: {optionMergeStrategies: a}} = e.appContext
        , s = i.get(t);
    let l;
    return s ? l = s : !o.length && !r && !n ? l = t : (l = {},
    o.length && o.forEach(c => pi(l, c, a, !0)),
        pi(l, t, a)),
        i.set(t, l),
        l
}
function pi(e, t, r, n=!1) {
    const {mixins: o, extends: i} = t;
    i && pi(e, i, r, !0),
    o && o.forEach(a => pi(e, a, r, !0));
    for (const a in t)
        if (!(n && a === "expose")) {
            const s = Zm[a] || r && r[a];
            e[a] = s ? s(e[a], t[a]) : t[a]
        }
    return e
}
const Zm = {
    data: Hc,
    props: kr,
    emits: kr,
    methods: kr,
    computed: kr,
    beforeCreate: it,
    created: it,
    beforeMount: it,
    mounted: it,
    beforeUpdate: it,
    updated: it,
    beforeDestroy: it,
    beforeUnmount: it,
    destroyed: it,
    unmounted: it,
    activated: it,
    deactivated: it,
    errorCaptured: it,
    serverPrefetch: it,
    components: kr,
    directives: kr,
    watch: tg,
    provide: Hc,
    inject: eg
};
function Hc(e, t) {
    return t ? e ? function() {
            return Ze(de(e) ? e.call(this, this) : e, de(t) ? t.call(this, this) : t)
        }
        : t : e
}
function eg(e, t) {
    return kr(as(e), as(t))
}
function as(e) {
    if (te(e)) {
        const t = {};
        for (let r = 0; r < e.length; r++)
            t[e[r]] = e[r];
        return t
    }
    return e
}
function it(e, t) {
    return e ? [...new Set([].concat(e, t))] : t
}
function kr(e, t) {
    return e ? Ze(Ze(Object.create(null), e), t) : t
}
function tg(e, t) {
    if (!e)
        return t;
    if (!t)
        return e;
    const r = Ze(Object.create(null), e);
    for (const n in t)
        r[n] = it(e[n], t[n]);
    return r
}
function rg(e, t, r, n=!1) {
    const o = {}
        , i = {};
    ei(i, bi, 1),
        e.propsDefaults = Object.create(null),
        Uc(e, t, o, i);
    for (const a in e.propsOptions[0])
        a in o || (o[a] = void 0);
    r ? e.props = n ? o : Fm(o) : e.type.props ? e.props = o : e.props = i,
        e.attrs = i
}
function ng(e, t, r, n) {
    const {props: o, attrs: i, vnode: {patchFlag: a}} = e
        , s = ce(o)
        , [l] = e.propsOptions;
    let c = !1;
    if ((n || a > 0) && !(a & 16)) {
        if (a & 8) {
            const u = e.vnode.dynamicProps;
            for (let f = 0; f < u.length; f++) {
                let d = u[f];
                const p = t[d];
                if (l)
                    if (ge(i, d))
                        p !== i[d] && (i[d] = p,
                            c = !0);
                    else {
                        const g = Bt(d);
                        o[g] = ss(l, s, g, p, e, !1)
                    }
                else
                    p !== i[d] && (i[d] = p,
                        c = !0)
            }
        }
    } else {
        Uc(e, t, o, i) && (c = !0);
        let u;
        for (const f in s)
            (!t || !ge(t, f) && ((u = Sr(f)) === f || !ge(t, u))) && (l ? r && (r[f] !== void 0 || r[u] !== void 0) && (o[f] = ss(l, s, f, void 0, e, !0)) : delete o[f]);
        if (i !== s)
            for (const f in i)
                (!t || !ge(t, f)) && (delete i[f],
                    c = !0)
    }
    c && zt(e, "set", "$attrs")
}
function Uc(e, t, r, n) {
    const [o,i] = e.propsOptions;
    let a = !1, s;
    if (t)
        for (let l in t) {
            if (no(l))
                continue;
            const c = t[l];
            let u;
            o && ge(o, u = Bt(l)) ? !i || !i.includes(u) ? r[u] = c : (s || (s = {}))[u] = c : Za(e.emitsOptions, l) || (!(l in n) || c !== n[l]) && (n[l] = c,
                a = !0)
        }
    if (i) {
        const l = ce(r)
            , c = s || Ae;
        for (let u = 0; u < i.length; u++) {
            const f = i[u];
            r[f] = ss(o, l, f, c[f], e, !ge(c, f))
        }
    }
    return a
}
function ss(e, t, r, n, o, i) {
    const a = e[r];
    if (a != null) {
        const s = ge(a, "default");
        if (s && n === void 0) {
            const l = a.default;
            if (a.type !== Function && de(l)) {
                const {propsDefaults: c} = o;
                r in c ? n = c[r] : (on(o),
                    n = c[r] = l.call(null, t),
                    Rr())
            } else
                n = l
        }
        a[0] && (i && !s ? n = !1 : a[1] && (n === "" || n === Sr(r)) && (n = !0))
    }
    return n
}
function Wc(e, t, r=!1) {
    const n = t.propsCache
        , o = n.get(e);
    if (o)
        return o;
    const i = e.props
        , a = {}
        , s = [];
    let l = !1;
    if (!de(e)) {
        const u = f => {
                l = !0;
                const [d,p] = Wc(f, t, !0);
                Ze(a, d),
                p && s.push(...p)
            }
        ;
        !r && t.mixins.length && t.mixins.forEach(u),
        e.extends && u(e.extends),
        e.mixins && e.mixins.forEach(u)
    }
    if (!i && !l)
        return n.set(e, Jr),
            Jr;
    if (te(i))
        for (let u = 0; u < i.length; u++) {
            const f = Bt(i[u]);
            qc(f) && (a[f] = Ae)
        }
    else if (i)
        for (const u in i) {
            const f = Bt(u);
            if (qc(f)) {
                const d = i[u]
                    , p = a[f] = te(d) || de(d) ? {
                    type: d
                } : d;
                if (p) {
                    const g = Kc(Boolean, p.type)
                        , m = Kc(String, p.type);
                    p[0] = g > -1,
                        p[1] = m < 0 || g < m,
                    (g > -1 || ge(p, "default")) && s.push(f)
                }
            }
        }
    const c = [a, s];
    return n.set(e, c),
        c
}
function qc(e) {
    return e[0] !== "$"
}
function zc(e) {
    const t = e && e.toString().match(/^\s*function (\w+)/);
    return t ? t[1] : e === null ? "null" : ""
}
function Vc(e, t) {
    return zc(e) === zc(t)
}
function Kc(e, t) {
    return te(t) ? t.findIndex(r => Vc(r, e)) : de(t) && Vc(t, e) ? 0 : -1
}
const Gc = e => e[0] === "_" || e === "$stable"
    , ls = e => te(e) ? e.map(kt) : [kt(e)]
    , og = (e, t, r) => {
        const n = Pc( (...o) => ls(t(...o)), r);
        return n._c = !1,
            n
    }
    , Yc = (e, t, r) => {
        const n = e._ctx;
        for (const o in e) {
            if (Gc(o))
                continue;
            const i = e[o];
            if (de(i))
                t[o] = og(o, i, n);
            else if (i != null) {
                const a = ls(i);
                t[o] = () => a
            }
        }
    }
    , Xc = (e, t) => {
        const r = ls(t);
        e.slots.default = () => r
    }
    , ig = (e, t) => {
        if (e.vnode.shapeFlag & 32) {
            const r = t._;
            r ? (e.slots = ce(t),
                ei(t, "_", r)) : Yc(t, e.slots = {})
        } else
            e.slots = {},
            t && Xc(e, t);
        ei(e.slots, bi, 1)
    }
    , ag = (e, t, r) => {
        const {vnode: n, slots: o} = e;
        let i = !0
            , a = Ae;
        if (n.shapeFlag & 32) {
            const s = t._;
            s ? r && s === 1 ? i = !1 : (Ze(o, t),
            !r && s === 1 && delete o._) : (i = !t.$stable,
                Yc(t, o)),
                a = t
        } else
            t && (Xc(e, t),
                a = {
                    default: 1
                });
        if (i)
            for (const s in o)
                !Gc(s) && !(s in a) && delete o[s]
    }
;
function sg(e, t) {
    const r = pt;
    if (r === null)
        return e;
    const n = r.proxy
        , o = e.dirs || (e.dirs = []);
    for (let i = 0; i < t.length; i++) {
        let[a,s,l,c=Ae] = t[i];
        de(a) && (a = {
            mounted: a,
            updated: a
        }),
        a.deep && Ir(s),
            o.push({
                dir: a,
                instance: n,
                value: s,
                oldValue: void 0,
                arg: l,
                modifiers: c
            })
    }
    return e
}
function Nt(e, t, r, n) {
    const o = e.dirs
        , i = t && t.dirs;
    for (let a = 0; a < o.length; a++) {
        const s = o[a];
        i && (s.oldValue = i[a].value);
        let l = s.dir[n];
        l && (tn(),
            yt(l, r, 8, [e.el, s, e, t]),
            Ar())
    }
}
function Jc() {
    return {
        app: null,
        config: {
            isNativeTag: Vv,
            performance: !1,
            globalProperties: {},
            optionMergeStrategies: {},
            errorHandler: void 0,
            warnHandler: void 0,
            compilerOptions: {}
        },
        mixins: [],
        components: {},
        directives: {},
        provides: Object.create(null),
        optionsCache: new WeakMap,
        propsCache: new WeakMap,
        emitsCache: new WeakMap
    }
}
let lg = 0;
function ug(e, t) {
    return function(n, o=null) {
        o != null && !Ne(o) && (o = null);
        const i = Jc()
            , a = new Set;
        let s = !1;
        const l = i.app = {
            _uid: lg++,
            _component: n,
            _props: o,
            _container: null,
            _context: i,
            _instance: null,
            version: Hg,
            get config() {
                return i.config
            },
            set config(c) {},
            use(c, ...u) {
                return a.has(c) || (c && de(c.install) ? (a.add(c),
                    c.install(l, ...u)) : de(c) && (a.add(c),
                    c(l, ...u))),
                    l
            },
            mixin(c) {
                return i.mixins.includes(c) || i.mixins.push(c),
                    l
            },
            component(c, u) {
                return u ? (i.components[c] = u,
                    l) : i.components[c]
            },
            directive(c, u) {
                return u ? (i.directives[c] = u,
                    l) : i.directives[c]
            },
            mount(c, u, f) {
                if (!s) {
                    const d = V(n, o);
                    return d.appContext = i,
                        u && t ? t(d, c) : e(d, c, f),
                        s = !0,
                        l._container = c,
                        c.__vue_app__ = l,
                    gs(d.component) || d.component.proxy
                }
            },
            unmount() {
                s && (e(null, l._container),
                    delete l._container.__vue_app__)
            },
            provide(c, u) {
                return i.provides[c] = u,
                    l
            }
        };
        return l
    }
}
function hi(e, t, r, n, o=!1) {
    if (te(e)) {
        e.forEach( (d, p) => hi(d, t && (te(t) ? t[p] : t), r, n, o));
        return
    }
    if (ci(n) && !o)
        return;
    const i = n.shapeFlag & 4 ? gs(n.component) || n.component.proxy : n.el
        , a = o ? null : i
        , {i: s, r: l} = e
        , c = t && t.r
        , u = s.refs === Ae ? s.refs = {} : s.refs
        , f = s.setupState;
    if (c != null && c !== l && (qe(c) ? (u[c] = null,
    ge(f, c) && (f[c] = null)) : et(c) && (c.value = null)),
        de(l))
        nr(l, s, 12, [a, u]);
    else {
        const d = qe(l)
            , p = et(l);
        if (d || p) {
            const g = () => {
                    if (e.f) {
                        const m = d ? u[l] : l.value;
                        o ? te(m) && Da(m, i) : te(m) ? m.includes(i) || m.push(i) : d ? u[l] = [i] : (l.value = [i],
                        e.k && (u[e.k] = l.value))
                    } else
                        d ? (u[l] = a,
                        ge(f, l) && (f[l] = a)) : et(l) && (l.value = a,
                        e.k && (u[e.k] = a))
                }
            ;
            a ? (g.id = -1,
                ut(g, r)) : g()
        }
    }
}
let tr = !1;
const vi = e => /svg/.test(e.namespaceURI) && e.tagName !== "foreignObject"
    , us = e => e.nodeType === 8;
function cg(e) {
    const {mt: t, p: r, o: {patchProp: n, nextSibling: o, parentNode: i, remove: a, insert: s, createComment: l}} = e
        , c = (h, v) => {
            if (!v.hasChildNodes()) {
                r(null, h, v),
                    Ei();
                return
            }
            tr = !1,
                u(v.firstChild, h, null, null, null),
                Ei(),
            tr && console.error("Hydration completed but contains mismatches.")
        }
        , u = (h, v, w, S, b, O=!1) => {
            const C = us(h) && h.data === "["
                , _ = () => g(h, v, w, S, b, C)
                , {type: E, ref: A, shapeFlag: M} = v
                , I = h.nodeType;
            v.el = h;
            let F = null;
            switch (E) {
                case fo:
                    I !== 3 ? F = _() : (h.data !== v.children && (tr = !0,
                        h.data = v.children),
                        F = o(h));
                    break;
                case mt:
                    I !== 8 || C ? F = _() : F = o(h);
                    break;
                case nn:
                    if (I !== 1)
                        F = _();
                    else {
                        F = h;
                        const B = !v.children.length;
                        for (let K = 0; K < v.staticCount; K++)
                            B && (v.children += F.outerHTML),
                            K === v.staticCount - 1 && (v.anchor = F),
                                F = o(F);
                        return F
                    }
                    break;
                case at:
                    C ? F = p(h, v, w, S, b, O) : F = _();
                    break;
                default:
                    if (M & 1)
                        I !== 1 || v.type.toLowerCase() !== h.tagName.toLowerCase() ? F = _() : F = f(h, v, w, S, b, O);
                    else if (M & 6) {
                        v.slotScopeIds = b;
                        const B = i(h);
                        if (t(v, B, null, w, S, vi(B), O),
                            F = C ? m(h) : o(h),
                            ci(v)) {
                            let K;
                            C ? (K = V(at),
                                K.anchor = F ? F.previousSibling : B.lastChild) : K = h.nodeType === 3 ? ps("") : V("div"),
                                K.el = h,
                                v.component.subTree = K
                        }
                    } else
                        M & 64 ? I !== 8 ? F = _() : F = v.type.hydrate(h, v, w, S, b, O, e, d) : M & 128 && (F = v.type.hydrate(h, v, w, S, vi(i(h)), b, O, e, u))
            }
            return A != null && hi(A, null, S, v),
                F
        }
        , f = (h, v, w, S, b, O) => {
            O = O || !!v.dynamicChildren;
            const {type: C, props: _, patchFlag: E, shapeFlag: A, dirs: M} = v
                , I = C === "input" && M || C === "option";
            if (I || E !== -1) {
                if (M && Nt(v, null, w, "created"),
                    _)
                    if (I || !O || E & (16 | 32))
                        for (const B in _)
                            (I && B.endsWith("value") || ro(B) && !no(B)) && n(h, B, null, _[B], !1, void 0, w);
                    else
                        _.onClick && n(h, "onClick", null, _.onClick, !1, void 0, w);
                let F;
                if ((F = _ && _.onVnodeBeforeMount) && gt(F, w, v),
                M && Nt(v, null, w, "beforeMount"),
                ((F = _ && _.onVnodeMounted) || M) && $c( () => {
                        F && gt(F, w, v),
                        M && Nt(v, null, w, "mounted")
                    }
                    , S),
                A & 16 && !(_ && (_.innerHTML || _.textContent))) {
                    let B = d(h.firstChild, v, h, w, S, b, O);
                    for (; B; ) {
                        tr = !0;
                        const K = B;
                        B = B.nextSibling,
                            a(K)
                    }
                } else
                    A & 8 && h.textContent !== v.children && (tr = !0,
                        h.textContent = v.children)
            }
            return h.nextSibling
        }
        , d = (h, v, w, S, b, O, C) => {
            C = C || !!v.dynamicChildren;
            const _ = v.children
                , E = _.length;
            for (let A = 0; A < E; A++) {
                const M = C ? _[A] : _[A] = kt(_[A]);
                if (h)
                    h = u(h, M, S, b, O, C);
                else {
                    if (M.type === fo && !M.children)
                        continue;
                    tr = !0,
                        r(null, M, w, null, S, b, vi(w), O)
                }
            }
            return h
        }
        , p = (h, v, w, S, b, O) => {
            const {slotScopeIds: C} = v;
            C && (b = b ? b.concat(C) : C);
            const _ = i(h)
                , E = d(o(h), v, _, w, S, b, O);
            return E && us(E) && E.data === "]" ? o(v.anchor = E) : (tr = !0,
                s(v.anchor = l("]"), _, E),
                E)
        }
        , g = (h, v, w, S, b, O) => {
            if (tr = !0,
                v.el = null,
                O) {
                const E = m(h);
                for (; ; ) {
                    const A = o(h);
                    if (A && A !== E)
                        a(A);
                    else
                        break
                }
            }
            const C = o(h)
                , _ = i(h);
            return a(h),
                r(null, v, _, C, w, S, vi(_), b),
                C
        }
        , m = h => {
            let v = 0;
            for (; h; )
                if (h = o(h),
                h && us(h) && (h.data === "[" && v++,
                h.data === "]")) {
                    if (v === 0)
                        return o(h);
                    v--
                }
            return h
        }
    ;
    return [c, u]
}
const ut = $c;
function fg(e) {
    return dg(e, cg)
}
function dg(e, t) {
    const r = Qv();
    r.__VUE__ = !0;
    const {insert: n, remove: o, patchProp: i, createElement: a, createText: s, createComment: l, setText: c, setElementText: u, parentNode: f, nextSibling: d, setScopeId: p=At, cloneNode: g, insertStaticContent: m} = e
        , h = (y, x, k, T=null, $=null, N=null, q=!1, L=null, H=!!x.dynamicChildren) => {
        if (y === x)
            return;
        y && !$r(y, x) && (T = Y(y),
            Je(y, $, N, !0),
            y = null),
        x.patchFlag === -2 && (H = !1,
            x.dynamicChildren = null);
        const {type: D, ref: J, shapeFlag: X} = x;
        switch (D) {
            case fo:
                v(y, x, k, T);
                break;
            case mt:
                w(y, x, k, T);
                break;
            case nn:
                y == null && S(x, k, T, q);
                break;
            case at:
                B(y, x, k, T, $, N, q, L, H);
                break;
            default:
                X & 1 ? C(y, x, k, T, $, N, q, L, H) : X & 6 ? K(y, x, k, T, $, N, q, L, H) : (X & 64 || X & 128) && D.process(y, x, k, T, $, N, q, L, H, we)
        }
        J != null && $ && hi(J, y && y.ref, N, x || y, !x)
    }
        , v = (y, x, k, T) => {
        if (y == null)
            n(x.el = s(x.children), k, T);
        else {
            const $ = x.el = y.el;
            x.children !== y.children && c($, x.children)
        }
    }
        , w = (y, x, k, T) => {
        y == null ? n(x.el = l(x.children || ""), k, T) : x.el = y.el
    }
        , S = (y, x, k, T) => {
        [y.el,y.anchor] = m(y.children, x, k, T)
    }
        , b = ({el: y, anchor: x}, k, T) => {
        let $;
        for (; y && y !== x; )
            $ = d(y),
                n(y, k, T),
                y = $;
        n(x, k, T)
    }
        , O = ({el: y, anchor: x}) => {
        let k;
        for (; y && y !== x; )
            k = d(y),
                o(y),
                y = k;
        o(x)
    }
        , C = (y, x, k, T, $, N, q, L, H) => {
        q = q || x.type === "svg",
            y == null ? _(x, k, T, $, N, q, L, H) : M(y, x, $, N, q, L, H)
    }
        , _ = (y, x, k, T, $, N, q, L) => {
        let H, D;
        const {type: J, props: X, shapeFlag: Q, transition: ae, patchFlag: me, dirs: Ie} = y;
        if (y.el && g !== void 0 && me === -1)
            H = y.el = g(y.el);
        else {
            if (H = y.el = a(y.type, N, X && X.is, X),
                Q & 8 ? u(H, y.children) : Q & 16 && A(y.children, H, null, T, $, N && J !== "foreignObject", q, L),
            Ie && Nt(y, null, T, "created"),
                X) {
                for (const $e in X)
                    $e !== "value" && !no($e) && i(H, $e, null, X[$e], N, y.children, T, $, j);
                "value"in X && i(H, "value", null, X.value),
                (D = X.onVnodeBeforeMount) && gt(D, T, y)
            }
            E(H, y, y.scopeId, q, T)
        }
        Ie && Nt(y, null, T, "beforeMount");
        const Fe = (!$ || $ && !$.pendingBranch) && ae && !ae.persisted;
        Fe && ae.beforeEnter(H),
            n(H, x, k),
        ((D = X && X.onVnodeMounted) || Fe || Ie) && ut( () => {
                D && gt(D, T, y),
                Fe && ae.enter(H),
                Ie && Nt(y, null, T, "mounted")
            }
            , $)
    }
        , E = (y, x, k, T, $) => {
        if (k && p(y, k),
            T)
            for (let N = 0; N < T.length; N++)
                p(y, T[N]);
        if ($) {
            let N = $.subTree;
            if (x === N) {
                const q = $.vnode;
                E(y, q, q.scopeId, q.slotScopeIds, $.parent)
            }
        }
    }
        , A = (y, x, k, T, $, N, q, L, H=0) => {
        for (let D = H; D < y.length; D++) {
            const J = y[D] = L ? rr(y[D]) : kt(y[D]);
            h(null, J, x, k, T, $, N, q, L)
        }
    }
        , M = (y, x, k, T, $, N, q) => {
        const L = x.el = y.el;
        let {patchFlag: H, dynamicChildren: D, dirs: J} = x;
        H |= y.patchFlag & 16;
        const X = y.props || Ae
            , Q = x.props || Ae;
        let ae;
        k && Pr(k, !1),
        (ae = Q.onVnodeBeforeUpdate) && gt(ae, k, x, y),
        J && Nt(x, y, k, "beforeUpdate"),
        k && Pr(k, !0);
        const me = $ && x.type !== "foreignObject";
        if (D ? I(y.dynamicChildren, D, L, k, T, me, N) : q || xe(y, x, L, null, k, T, me, N, !1),
        H > 0) {
            if (H & 16)
                F(L, x, X, Q, k, T, $);
            else if (H & 2 && X.class !== Q.class && i(L, "class", null, Q.class, $),
            H & 4 && i(L, "style", X.style, Q.style, $),
            H & 8) {
                const Ie = x.dynamicProps;
                for (let Fe = 0; Fe < Ie.length; Fe++) {
                    const $e = Ie[Fe]
                        , Et = X[$e]
                        , Xr = Q[$e];
                    (Xr !== Et || $e === "value") && i(L, $e, Et, Xr, $, y.children, k, T, j)
                }
            }
            H & 1 && y.children !== x.children && u(L, x.children)
        } else
            !q && D == null && F(L, x, X, Q, k, T, $);
        ((ae = Q.onVnodeUpdated) || J) && ut( () => {
                ae && gt(ae, k, x, y),
                J && Nt(x, y, k, "updated")
            }
            , T)
    }
        , I = (y, x, k, T, $, N, q) => {
        for (let L = 0; L < x.length; L++) {
            const H = y[L]
                , D = x[L]
                , J = H.el && (H.type === at || !$r(H, D) || H.shapeFlag & (6 | 64)) ? f(H.el) : k;
            h(H, D, J, null, T, $, N, q, !0)
        }
    }
        , F = (y, x, k, T, $, N, q) => {
        if (k !== T) {
            for (const L in T) {
                if (no(L))
                    continue;
                const H = T[L]
                    , D = k[L];
                H !== D && L !== "value" && i(y, L, D, H, q, x.children, $, N, j)
            }
            if (k !== Ae)
                for (const L in k)
                    !no(L) && !(L in T) && i(y, L, k[L], null, q, x.children, $, N, j);
            "value"in T && i(y, "value", k.value, T.value)
        }
    }
        , B = (y, x, k, T, $, N, q, L, H) => {
        const D = x.el = y ? y.el : s("")
            , J = x.anchor = y ? y.anchor : s("");
        let {patchFlag: X, dynamicChildren: Q, slotScopeIds: ae} = x;
        ae && (L = L ? L.concat(ae) : ae),
            y == null ? (n(D, k, T),
                n(J, k, T),
                A(x.children, k, J, $, N, q, L, H)) : X > 0 && X & 64 && Q && y.dynamicChildren ? (I(y.dynamicChildren, Q, k, $, N, q, L),
            (x.key != null || $ && x === $.subTree) && cs(y, x, !0)) : xe(y, x, k, J, $, N, q, L, H)
    }
        , K = (y, x, k, T, $, N, q, L, H) => {
        x.slotScopeIds = L,
            y == null ? x.shapeFlag & 512 ? $.ctx.activate(x, k, T, q, H) : oe(x, k, T, $, N, q, H) : ee(y, x, H)
    }
        , oe = (y, x, k, T, $, N, q) => {
        const L = y.component = Eg(y, T, $);
        if (fi(y) && (L.ctx.renderer = we),
            Fg(L),
            L.asyncDep) {
            if ($ && $.registerDep(L, ne),
                !y.el) {
                const H = L.subTree = V(mt);
                w(null, H, x, k)
            }
            return
        }
        ne(L, y, x, k, $, N, q)
    }
        , ee = (y, x, k) => {
        const T = x.component = y.component;
        if (Bm(y, x, k))
            if (T.asyncDep && !T.asyncResolved) {
                se(T, x, k);
                return
            } else
                T.next = x,
                    Rg(T.update),
                    T.update();
        else
            x.component = y.component,
                x.el = y.el,
                T.vnode = x
    }
        , ne = (y, x, k, T, $, N, q) => {
        const L = () => {
            if (y.isMounted) {
                let {next: J, bu: X, u: Q, parent: ae, vnode: me} = y, Ie = J, Fe;
                Pr(y, !1),
                    J ? (J.el = me.el,
                        se(y, J, q)) : J = me,
                X && Zo(X),
                (Fe = J.props && J.props.onVnodeBeforeUpdate) && gt(Fe, ae, J, me),
                    Pr(y, !0);
                const $e = es(y)
                    , Et = y.subTree;
                y.subTree = $e,
                    h(Et, $e, f(Et.el), Y(Et), y, $, N),
                    J.el = $e.el,
                Ie === null && Nm(y, $e.el),
                Q && ut(Q, $),
                (Fe = J.props && J.props.onVnodeUpdated) && ut( () => gt(Fe, ae, J, me), $)
            } else {
                let J;
                const {el: X, props: Q} = x
                    , {bm: ae, m: me, parent: Ie} = y
                    , Fe = ci(x);
                if (Pr(y, !1),
                ae && Zo(ae),
                !Fe && (J = Q && Q.onVnodeBeforeMount) && gt(J, Ie, x),
                    Pr(y, !0),
                X && le) {
                    const $e = () => {
                            y.subTree = es(y),
                                le(X, y.subTree, y, $, null)
                        }
                    ;
                    Fe ? x.type.__asyncLoader().then( () => !y.isUnmounted && $e()) : $e()
                } else {
                    const $e = y.subTree = es(y);
                    h(null, $e, k, T, y, $, N),
                        x.el = $e.el
                }
                if (me && ut(me, $),
                !Fe && (J = Q && Q.onVnodeMounted)) {
                    const $e = x;
                    ut( () => gt(J, Ie, $e), $)
                }
                x.shapeFlag & 256 && y.a && ut(y.a, $),
                    y.isMounted = !0,
                    x = k = T = null
            }
        }
            , H = y.effect = new qa(L, () => vf(y.update),y.scope)
            , D = y.update = H.run.bind(H);
        D.id = y.uid,
            Pr(y, !0),
            D()
    }
        , se = (y, x, k) => {
        x.component = y;
        const T = y.vnode.props;
        y.vnode = x,
            y.next = null,
            ng(y, x.props, T, k),
            ag(y, x.children, k),
            tn(),
            Cs(void 0, y.update),
            Ar()
    }
        , xe = (y, x, k, T, $, N, q, L, H=!1) => {
        const D = y && y.children
            , J = y ? y.shapeFlag : 0
            , X = x.children
            , {patchFlag: Q, shapeFlag: ae} = x;
        if (Q > 0) {
            if (Q & 128) {
                We(D, X, k, T, $, N, q, L, H);
                return
            } else if (Q & 256) {
                Be(D, X, k, T, $, N, q, L, H);
                return
            }
        }
        ae & 8 ? (J & 16 && j(D, $, N),
        X !== D && u(k, X)) : J & 16 ? ae & 16 ? We(D, X, k, T, $, N, q, L, H) : j(D, $, N, !0) : (J & 8 && u(k, ""),
        ae & 16 && A(X, k, T, $, N, q, L, H))
    }
        , Be = (y, x, k, T, $, N, q, L, H) => {
        y = y || Jr,
            x = x || Jr;
        const D = y.length
            , J = x.length
            , X = Math.min(D, J);
        let Q;
        for (Q = 0; Q < X; Q++) {
            const ae = x[Q] = H ? rr(x[Q]) : kt(x[Q]);
            h(y[Q], ae, k, null, $, N, q, L, H)
        }
        D > J ? j(y, $, N, !0, !1, X) : A(x, k, T, $, N, q, L, H, X)
    }
        , We = (y, x, k, T, $, N, q, L, H) => {
        let D = 0;
        const J = x.length;
        let X = y.length - 1
            , Q = J - 1;
        for (; D <= X && D <= Q; ) {
            const ae = y[D]
                , me = x[D] = H ? rr(x[D]) : kt(x[D]);
            if ($r(ae, me))
                h(ae, me, k, null, $, N, q, L, H);
            else
                break;
            D++
        }
        for (; D <= X && D <= Q; ) {
            const ae = y[X]
                , me = x[Q] = H ? rr(x[Q]) : kt(x[Q]);
            if ($r(ae, me))
                h(ae, me, k, null, $, N, q, L, H);
            else
                break;
            X--,
                Q--
        }
        if (D > X) {
            if (D <= Q) {
                const ae = Q + 1
                    , me = ae < J ? x[ae].el : T;
                for (; D <= Q; )
                    h(null, x[D] = H ? rr(x[D]) : kt(x[D]), k, me, $, N, q, L, H),
                        D++
            }
        } else if (D > Q)
            for (; D <= X; )
                Je(y[D], $, N, !0),
                    D++;
        else {
            const ae = D
                , me = D
                , Ie = new Map;
            for (D = me; D <= Q; D++) {
                const ft = x[D] = H ? rr(x[D]) : kt(x[D]);
                ft.key != null && Ie.set(ft.key, D)
            }
            let Fe, $e = 0;
            const Et = Q - me + 1;
            let Xr = !1
                , Vu = 0;
            const to = new Array(Et);
            for (D = 0; D < Et; D++)
                to[D] = 0;
            for (D = ae; D <= X; D++) {
                const ft = y[D];
                if ($e >= Et) {
                    Je(ft, $, N, !0);
                    continue
                }
                let Dt;
                if (ft.key != null)
                    Dt = Ie.get(ft.key);
                else
                    for (Fe = me; Fe <= Q; Fe++)
                        if (to[Fe - me] === 0 && $r(ft, x[Fe])) {
                            Dt = Fe;
                            break
                        }
                Dt === void 0 ? Je(ft, $, N, !0) : (to[Dt - me] = D + 1,
                    Dt >= Vu ? Vu = Dt : Xr = !0,
                    h(ft, x[Dt], k, null, $, N, q, L, H),
                    $e++)
            }
            const Ku = Xr ? pg(to) : Jr;
            for (Fe = Ku.length - 1,
                     D = Et - 1; D >= 0; D--) {
                const ft = me + D
                    , Dt = x[ft]
                    , Gu = ft + 1 < J ? x[ft + 1].el : T;
                to[D] === 0 ? h(null, Dt, k, Gu, $, N, q, L, H) : Xr && (Fe < 0 || D !== Ku[Fe] ? Xe(Dt, k, Gu, 2) : Fe--)
            }
        }
    }
        , Xe = (y, x, k, T, $=null) => {
        const {el: N, type: q, transition: L, children: H, shapeFlag: D} = y;
        if (D & 6) {
            Xe(y.component.subTree, x, k, T);
            return
        }
        if (D & 128) {
            y.suspense.move(x, k, T);
            return
        }
        if (D & 64) {
            q.move(y, x, k, we);
            return
        }
        if (q === at) {
            n(N, x, k);
            for (let X = 0; X < H.length; X++)
                Xe(H[X], x, k, T);
            n(y.anchor, x, k);
            return
        }
        if (q === nn) {
            b(y, x, k);
            return
        }
        if (T !== 2 && D & 1 && L)
            if (T === 0)
                L.beforeEnter(N),
                    n(N, x, k),
                    ut( () => L.enter(N), $);
            else {
                const {leave: X, delayLeave: Q, afterLeave: ae} = L
                    , me = () => n(N, x, k)
                    , Ie = () => {
                        X(N, () => {
                                me(),
                                ae && ae()
                            }
                        )
                    }
                ;
                Q ? Q(N, me, Ie) : Ie()
            }
        else
            n(N, x, k)
    }
        , Je = (y, x, k, T=!1, $=!1) => {
        const {type: N, props: q, ref: L, children: H, dynamicChildren: D, shapeFlag: J, patchFlag: X, dirs: Q} = y;
        if (L != null && hi(L, null, k, y, !0),
        J & 256) {
            x.ctx.deactivate(y);
            return
        }
        const ae = J & 1 && Q
            , me = !ci(y);
        let Ie;
        if (me && (Ie = q && q.onVnodeBeforeUnmount) && gt(Ie, x, y),
        J & 6)
            G(y.component, k, T);
        else {
            if (J & 128) {
                y.suspense.unmount(k, T);
                return
            }
            ae && Nt(y, null, x, "beforeUnmount"),
                J & 64 ? y.type.remove(y, x, k, $, we, T) : D && (N !== at || X > 0 && X & 64) ? j(D, x, k, !1, !0) : (N === at && X & (128 | 256) || !$ && J & 16) && j(H, x, k),
            T && Ot(y)
        }
        (me && (Ie = q && q.onVnodeUnmounted) || ae) && ut( () => {
                Ie && gt(Ie, x, y),
                ae && Nt(y, null, x, "unmounted")
            }
            , k)
    }
        , Ot = y => {
        const {type: x, el: k, anchor: T, transition: $} = y;
        if (x === at) {
            P(k, T);
            return
        }
        if (x === nn) {
            O(y);
            return
        }
        const N = () => {
                o(k),
                $ && !$.persisted && $.afterLeave && $.afterLeave()
            }
        ;
        if (y.shapeFlag & 1 && $ && !$.persisted) {
            const {leave: q, delayLeave: L} = $
                , H = () => q(k, N);
            L ? L(y.el, N, H) : H()
        } else
            N()
    }
        , P = (y, x) => {
        let k;
        for (; y !== x; )
            k = d(y),
                o(y),
                y = k;
        o(x)
    }
        , G = (y, x, k) => {
        const {bum: T, scope: $, update: N, subTree: q, um: L} = y;
        T && Zo(T),
            $.stop(),
        N && (N.active = !1,
            Je(q, y, x, k)),
        L && ut(L, x),
            ut( () => {
                    y.isUnmounted = !0
                }
                , x),
        x && x.pendingBranch && !x.isUnmounted && y.asyncDep && !y.asyncResolved && y.suspenseId === x.pendingId && (x.deps--,
        x.deps === 0 && x.resolve())
    }
        , j = (y, x, k, T=!1, $=!1, N=0) => {
        for (let q = N; q < y.length; q++)
            Je(y[q], x, k, T, $)
    }
        , Y = y => y.shapeFlag & 6 ? Y(y.component.subTree) : y.shapeFlag & 128 ? y.suspense.next() : d(y.anchor || y.el)
        , be = (y, x, k) => {
        y == null ? x._vnode && Je(x._vnode, null, null, !0) : h(x._vnode || null, y, x, null, null, null, k),
            Ei(),
            x._vnode = y
    }
        , we = {
        p: h,
        um: Je,
        m: Xe,
        r: Ot,
        mt: oe,
        mc: A,
        pc: xe,
        pbc: I,
        n: Y,
        o: e
    };
    let fe, le;
    return t && ([fe,le] = t(we)),
        {
            render: be,
            hydrate: fe,
            createApp: ug(be, fe)
        }
}
function Pr({effect: e, update: t}, r) {
    e.allowRecurse = t.allowRecurse = r
}
function cs(e, t, r=!1) {
    const n = e.children
        , o = t.children;
    if (te(n) && te(o))
        for (let i = 0; i < n.length; i++) {
            const a = n[i];
            let s = o[i];
            s.shapeFlag & 1 && !s.dynamicChildren && ((s.patchFlag <= 0 || s.patchFlag === 32) && (s = o[i] = rr(o[i]),
                s.el = a.el),
            r || cs(a, s))
        }
}
function pg(e) {
    const t = e.slice()
        , r = [0];
    let n, o, i, a, s;
    const l = e.length;
    for (n = 0; n < l; n++) {
        const c = e[n];
        if (c !== 0) {
            if (o = r[r.length - 1],
            e[o] < c) {
                t[n] = o,
                    r.push(n);
                continue
            }
            for (i = 0,
                     a = r.length - 1; i < a; )
                s = i + a >> 1,
                    e[r[s]] < c ? i = s + 1 : a = s;
            c < e[r[i]] && (i > 0 && (t[n] = r[i - 1]),
                r[i] = n)
        }
    }
    for (i = r.length,
             a = r[i - 1]; i-- > 0; )
        r[i] = a,
            a = t[a];
    return r
}
const hg = e => e.__isTeleport
    , co = e => e && (e.disabled || e.disabled === "")
    , Qc = e => typeof SVGElement != "undefined" && e instanceof SVGElement
    , fs = (e, t) => {
    const r = e && e.to;
    return qe(r) ? t ? t(r) : null : r
}
    , vg = {
    __isTeleport: !0,
    process(e, t, r, n, o, i, a, s, l, c) {
        const {mc: u, pc: f, pbc: d, o: {insert: p, querySelector: g, createText: m, createComment: h}} = c
            , v = co(t.props);
        let {shapeFlag: w, children: S, dynamicChildren: b} = t;
        if (e == null) {
            const O = t.el = m("")
                , C = t.anchor = m("");
            p(O, r, n),
                p(C, r, n);
            const _ = t.target = fs(t.props, g)
                , E = t.targetAnchor = m("");
            _ && (p(E, _),
                a = a || Qc(_));
            const A = (M, I) => {
                    w & 16 && u(S, M, I, o, i, a, s, l)
                }
            ;
            v ? A(r, C) : _ && A(_, E)
        } else {
            t.el = e.el;
            const O = t.anchor = e.anchor
                , C = t.target = e.target
                , _ = t.targetAnchor = e.targetAnchor
                , E = co(e.props)
                , A = E ? r : C
                , M = E ? O : _;
            if (a = a || Qc(C),
                b ? (d(e.dynamicChildren, b, A, o, i, a, s),
                    cs(e, t, !0)) : l || f(e, t, A, M, o, i, a, s, !1),
                v)
                E || mi(t, r, O, c, 1);
            else if ((t.props && t.props.to) !== (e.props && e.props.to)) {
                const I = t.target = fs(t.props, g);
                I && mi(t, I, null, c, 0)
            } else
                E && mi(t, C, _, c, 1)
        }
    },
    remove(e, t, r, n, {um: o, o: {remove: i}}, a) {
        const {shapeFlag: s, children: l, anchor: c, targetAnchor: u, target: f, props: d} = e;
        if (f && i(u),
        (a || !co(d)) && (i(c),
        s & 16))
            for (let p = 0; p < l.length; p++) {
                const g = l[p];
                o(g, t, r, !0, !!g.dynamicChildren)
            }
    },
    move: mi,
    hydrate: mg
};
function mi(e, t, r, {o: {insert: n}, m: o}, i=2) {
    i === 0 && n(e.targetAnchor, t, r);
    const {el: a, anchor: s, shapeFlag: l, children: c, props: u} = e
        , f = i === 2;
    if (f && n(a, t, r),
    (!f || co(u)) && l & 16)
        for (let d = 0; d < c.length; d++)
            o(c[d], t, r, 2);
    f && n(s, t, r)
}
function mg(e, t, r, n, o, i, {o: {nextSibling: a, parentNode: s, querySelector: l}}, c) {
    const u = t.target = fs(t.props, l);
    if (u) {
        const f = u._lpa || u.firstChild;
        t.shapeFlag & 16 && (co(t.props) ? (t.anchor = c(a(e), t, s(e), r, n, o, i),
            t.targetAnchor = f) : (t.anchor = a(e),
            t.targetAnchor = c(f, t, u, r, n, o, i)),
            u._lpa = t.targetAnchor && a(t.targetAnchor))
    }
    return t.anchor && a(t.anchor)
}
const gg = vg
    , ds = "components";
function xA(e, t) {
    return ef(ds, e, !0, t) || e
}
const Zc = Symbol();
function SA(e) {
    return qe(e) ? ef(ds, e, !1) || e : e || Zc
}
function ef(e, t, r=!0, n=!1) {
    const o = pt || Ke;
    if (o) {
        const i = o.type;
        if (e === ds) {
            const s = Pg(i);
            if (s && (s === t || s === Bt(t) || s === Qo(Bt(t))))
                return i
        }
        const a = tf(o[e] || i[e], t) || tf(o.appContext[e], t);
        return !a && n ? i : a
    }
}
function tf(e, t) {
    return e && (e[t] || e[Bt(t)] || e[Qo(Bt(t))])
}
const at = Symbol(void 0)
    , fo = Symbol(void 0)
    , mt = Symbol(void 0)
    , nn = Symbol(void 0)
    , po = [];
let Tr = null;
function Z(e=!1) {
    po.push(Tr = e ? null : [])
}
function yg() {
    po.pop(),
        Tr = po[po.length - 1] || null
}
let gi = 1;
function rf(e) {
    gi += e
}
function nf(e) {
    return e.dynamicChildren = gi > 0 ? Tr || Jr : null,
        yg(),
    gi > 0 && Tr && Tr.push(e),
        e
}
function of(e, t, r, n, o, i) {
    return nf(Ci(e, t, r, n, o, i, !0))
}
function re(e, t, r, n, o) {
    return nf(V(e, t, r, n, o, !0))
}
function yi(e) {
    return e ? e.__v_isVNode === !0 : !1
}
function $r(e, t) {
    return e.type === t.type && e.key === t.key
}
const bi = "__vInternal"
    , af = ({key: e}) => e != null ? e : null
    , wi = ({ref: e, ref_key: t, ref_for: r}) => e != null ? qe(e) || et(e) || de(e) ? {
    i: pt,
    r: e,
    k: t,
    f: !!r
} : e : null;
function Ci(e, t=null, r=null, n=0, o=null, i=e === at ? 0 : 1, a=!1, s=!1) {
    const l = {
        __v_isVNode: !0,
        __v_skip: !0,
        type: e,
        props: t,
        key: t && af(t),
        ref: t && wi(t),
        scopeId: li,
        slotScopeIds: null,
        children: r,
        component: null,
        suspense: null,
        ssContent: null,
        ssFallback: null,
        dirs: null,
        transition: null,
        el: null,
        anchor: null,
        target: null,
        targetAnchor: null,
        staticCount: 0,
        shapeFlag: i,
        patchFlag: n,
        dynamicProps: o,
        dynamicChildren: null,
        appContext: null
    };
    return s ? (hs(l, r),
    i & 128 && e.normalize(l)) : r && (l.shapeFlag |= qe(r) ? 8 : 16),
    gi > 0 && !a && Tr && (l.patchFlag > 0 || i & 6) && l.patchFlag !== 32 && Tr.push(l),
        l
}
const V = bg;
function bg(e, t=null, r=null, n=0, o=null, i=!1) {
    if ((!e || e === Zc) && (e = mt),
        yi(e)) {
        const s = Mr(e, t, !0);
        return r && hs(s, r),
            s
    }
    if (Tg(e) && (e = e.__vccOpts),
        t) {
        t = wg(t);
        let {class: s, style: l} = t;
        s && !qe(s) && (t.class = Ma(s)),
        Ne(l) && (_c(l) && !te(l) && (l = Ze({}, l)),
            t.style = Yo(l))
    }
    const a = qe(e) ? 1 : Lm(e) ? 128 : hg(e) ? 64 : Ne(e) ? 4 : de(e) ? 2 : 0;
    return Ci(e, t, r, n, o, a, i, !0)
}
function wg(e) {
    return e ? _c(e) || bi in e ? Ze({}, e) : e : null
}
function Mr(e, t, r=!1) {
    const {props: n, ref: o, patchFlag: i, children: a} = e
        , s = t ? _g(n || {}, t) : n;
    return {
        __v_isVNode: !0,
        __v_skip: !0,
        type: e.type,
        props: s,
        key: s && af(s),
        ref: t && t.ref ? r && o ? te(o) ? o.concat(wi(t)) : [o, wi(t)] : wi(t) : o,
        scopeId: e.scopeId,
        slotScopeIds: e.slotScopeIds,
        children: a,
        target: e.target,
        targetAnchor: e.targetAnchor,
        staticCount: e.staticCount,
        shapeFlag: e.shapeFlag,
        patchFlag: t && e.type !== at ? i === -1 ? 16 : i | 16 : i,
        dynamicProps: e.dynamicProps,
        dynamicChildren: e.dynamicChildren,
        appContext: e.appContext,
        dirs: e.dirs,
        transition: e.transition,
        component: e.component,
        suspense: e.suspense,
        ssContent: e.ssContent && Mr(e.ssContent),
        ssFallback: e.ssFallback && Mr(e.ssFallback),
        el: e.el,
        anchor: e.anchor
    }
}
function ps(e=" ", t=0) {
    return V(fo, null, e, t)
}
function OA(e, t) {
    const r = V(nn, null, e);
    return r.staticCount = t,
        r
}
function Cg(e="", t=!1) {
    return t ? (Z(),
        re(mt, null, e)) : V(mt, null, e)
}
function kt(e) {
    return e == null || typeof e == "boolean" ? V(mt) : te(e) ? V(at, null, e.slice()) : typeof e == "object" ? rr(e) : V(fo, null, String(e))
}
function rr(e) {
    return e.el === null || e.memo ? e : Mr(e)
}
function hs(e, t) {
    let r = 0;
    const {shapeFlag: n} = e;
    if (t == null)
        t = null;
    else if (te(t))
        r = 16;
    else if (typeof t == "object")
        if (n & (1 | 64)) {
            const o = t.default;
            o && (o._c && (o._d = !1),
                hs(e, o()),
            o._c && (o._d = !0));
            return
        } else {
            r = 32;
            const o = t._;
            !o && !(bi in t) ? t._ctx = pt : o === 3 && pt && (pt.slots._ === 1 ? t._ = 1 : (t._ = 2,
                e.patchFlag |= 1024))
        }
    else
        de(t) ? (t = {
            default: t,
            _ctx: pt
        },
            r = 32) : (t = String(t),
            n & 64 ? (r = 16,
                t = [ps(t)]) : r = 8);
    e.children = t,
        e.shapeFlag |= r
}
function _g(...e) {
    const t = {};
    for (let r = 0; r < e.length; r++) {
        const n = e[r];
        for (const o in n)
            if (o === "class")
                t.class !== n.class && (t.class = Ma([t.class, n.class]));
            else if (o === "style")
                t.style = Yo([t.style, n.style]);
            else if (ro(o)) {
                const i = t[o]
                    , a = n[o];
                i !== a && !(te(i) && i.includes(a)) && (t[o] = i ? [].concat(i, a) : a)
            } else
                o !== "" && (t[o] = n[o])
    }
    return t
}
function gt(e, t, r, n=null) {
    yt(e, t, 7, [r, n])
}
function EA(e, t, r, n) {
    let o;
    const i = r && r[n];
    if (te(e) || qe(e)) {
        o = new Array(e.length);
        for (let a = 0, s = e.length; a < s; a++)
            o[a] = t(e[a], a, void 0, i && i[a])
    } else if (typeof e == "number") {
        o = new Array(e);
        for (let a = 0; a < e; a++)
            o[a] = t(a + 1, a, void 0, i && i[a])
    } else if (Ne(e))
        if (e[Symbol.iterator])
            o = Array.from(e, (a, s) => t(a, s, void 0, i && i[s]));
        else {
            const a = Object.keys(e);
            o = new Array(a.length);
            for (let s = 0, l = a.length; s < l; s++) {
                const c = a[s];
                o[s] = t(e[c], c, s, i && i[s])
            }
        }
    else
        o = [];
    return r && (r[n] = o),
        o
}
function sf(e, t, r={}, n, o) {
    if (pt.isCE)
        return V("slot", t === "default" ? null : {
            name: t
        }, n && n());
    let i = e[t];
    i && i._c && (i._d = !1),
        Z();
    const a = i && lf(i(r))
        , s = re(at, {
        key: r.key || `_${t}`
    }, a || (n ? n() : []), a && e._ === 1 ? 64 : -2);
    return !o && s.scopeId && (s.slotScopeIds = [s.scopeId + "-s"]),
    i && i._c && (i._d = !0),
        s
}
function lf(e) {
    return e.some(t => yi(t) ? !(t.type === mt || t.type === at && !lf(t.children)) : !0) ? e : null
}
const vs = e => e ? uf(e) ? gs(e) || e.proxy : vs(e.parent) : null
    , _i = Ze(Object.create(null), {
    $: e => e,
    $el: e => e.vnode.el,
    $data: e => e.data,
    $props: e => e.props,
    $attrs: e => e.attrs,
    $slots: e => e.slots,
    $refs: e => e.refs,
    $parent: e => vs(e.parent),
    $root: e => vs(e.root),
    $emit: e => e.emit,
    $options: e => jc(e),
    $forceUpdate: e => () => vf(e.update),
    $nextTick: e => Se.bind(e.proxy),
    $watch: e => Ng.bind(e)
})
    , xg = {
    get({_: e}, t) {
        const {ctx: r, setupState: n, data: o, props: i, accessCache: a, type: s, appContext: l} = e;
        let c;
        if (t[0] !== "$") {
            const p = a[t];
            if (p !== void 0)
                switch (p) {
                    case 1:
                        return n[t];
                    case 2:
                        return o[t];
                    case 4:
                        return r[t];
                    case 3:
                        return i[t]
                }
            else {
                if (n !== Ae && ge(n, t))
                    return a[t] = 1,
                        n[t];
                if (o !== Ae && ge(o, t))
                    return a[t] = 2,
                        o[t];
                if ((c = e.propsOptions[0]) && ge(c, t))
                    return a[t] = 3,
                        i[t];
                if (r !== Ae && ge(r, t))
                    return a[t] = 4,
                        r[t];
                is && (a[t] = 0)
            }
        }
        const u = _i[t];
        let f, d;
        if (u)
            return t === "$attrs" && dt(e, "get", t),
                u(e);
        if ((f = s.__cssModules) && (f = f[t]))
            return f;
        if (r !== Ae && ge(r, t))
            return a[t] = 4,
                r[t];
        if (d = l.config.globalProperties,
            ge(d, t))
            return d[t]
    },
    set({_: e}, t, r) {
        const {data: n, setupState: o, ctx: i} = e;
        if (o !== Ae && ge(o, t))
            o[t] = r;
        else if (n !== Ae && ge(n, t))
            n[t] = r;
        else if (ge(e.props, t))
            return !1;
        return t[0] === "$" && t.slice(1)in e ? !1 : (i[t] = r,
            !0)
    },
    has({_: {data: e, setupState: t, accessCache: r, ctx: n, appContext: o, propsOptions: i}}, a) {
        let s;
        return !!r[a] || e !== Ae && ge(e, a) || t !== Ae && ge(t, a) || (s = i[0]) && ge(s, a) || ge(n, a) || ge(_i, a) || ge(o.config.globalProperties, a)
    }
}
    , Sg = Jc();
let Og = 0;
function Eg(e, t, r) {
    const n = e.type
        , o = (t ? t.appContext : e.appContext) || Sg
        , i = {
        uid: Og++,
        vnode: e,
        type: n,
        parent: t,
        appContext: o,
        root: null,
        next: null,
        subTree: null,
        effect: null,
        update: null,
        scope: new Zv(!0),
        render: null,
        proxy: null,
        exposed: null,
        exposeProxy: null,
        withProxy: null,
        provides: t ? t.provides : Object.create(o.provides),
        accessCache: null,
        renderCache: [],
        components: null,
        directives: null,
        propsOptions: Wc(n, o),
        emitsOptions: kc(n, o),
        emit: null,
        emitted: null,
        propsDefaults: Ae,
        inheritAttrs: n.inheritAttrs,
        ctx: Ae,
        data: Ae,
        props: Ae,
        attrs: Ae,
        slots: Ae,
        refs: Ae,
        setupState: Ae,
        setupContext: null,
        suspense: r,
        suspenseId: r ? r.pendingId : 0,
        asyncDep: null,
        asyncResolved: !1,
        isMounted: !1,
        isUnmounted: !1,
        isDeactivated: !1,
        bc: null,
        c: null,
        bm: null,
        m: null,
        bu: null,
        u: null,
        um: null,
        bum: null,
        da: null,
        a: null,
        rtg: null,
        rtc: null,
        ec: null,
        sp: null
    };
    return i.ctx = {
        _: i
    },
        i.root = t ? t.root : i,
        i.emit = Rm.bind(null, i),
    e.ce && e.ce(i),
        i
}
let Ke = null;
const ms = () => Ke || pt
    , on = e => {
        Ke = e,
            e.scope.on()
    }
    , Rr = () => {
        Ke && Ke.scope.off(),
            Ke = null
    }
;
function uf(e) {
    return e.vnode.shapeFlag & 4
}
let xi = !1;
function Fg(e, t=!1) {
    xi = t;
    const {props: r, children: n} = e.vnode
        , o = uf(e);
    rg(e, r, o, t),
        ig(e, n);
    const i = o ? Ag(e, t) : void 0;
    return xi = !1,
        i
}
function Ag(e, t) {
    const r = e.type;
    e.accessCache = Object.create(null),
        e.proxy = xc(new Proxy(e.ctx,xg));
    const {setup: n} = r;
    if (n) {
        const o = e.setupContext = n.length > 1 ? pf(e) : null;
        on(e),
            tn();
        const i = nr(n, e, 0, [e.props, o]);
        if (Ar(),
            Rr(),
            tc(i)) {
            if (i.then(Rr, Rr),
                t)
                return i.then(a => {
                        cf(e, a, t)
                    }
                ).catch(a => {
                        Si(a, e, 0)
                    }
                );
            e.asyncDep = i
        } else
            cf(e, i, t)
    } else
        df(e, t)
}
function cf(e, t, r) {
    de(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : Ne(t) && (e.setupState = Fc(t)),
        df(e, r)
}
let ff;
function df(e, t, r) {
    const n = e.type;
    if (!e.render) {
        if (!t && ff && !n.render) {
            const o = n.template;
            if (o) {
                const {isCustomElement: i, compilerOptions: a} = e.appContext.config
                    , {delimiters: s, compilerOptions: l} = n
                    , c = Ze(Ze({
                    isCustomElement: i,
                    delimiters: s
                }, a), l);
                n.render = ff(o, c)
            }
        }
        e.render = n.render || At
    }
    on(e),
        tn(),
        Jm(e),
        Ar(),
        Rr()
}
function kg(e) {
    return new Proxy(e.attrs,{
        get(t, r) {
            return dt(e, "get", "$attrs"),
                t[r]
        }
    })
}
function pf(e) {
    const t = n => {
            e.exposed = n || {}
        }
    ;
    let r;
    return {
        get attrs() {
            return r || (r = kg(e))
        },
        slots: e.slots,
        emit: e.emit,
        expose: t
    }
}
function gs(e) {
    if (e.exposed)
        return e.exposeProxy || (e.exposeProxy = new Proxy(Fc(xc(e.exposed)),{
            get(t, r) {
                if (r in t)
                    return t[r];
                if (r in _i)
                    return _i[r](e)
            }
        }))
}
function Pg(e) {
    return de(e) && e.displayName || e.name
}
function Tg(e) {
    return de(e) && "__vccOpts"in e
}
function nr(e, t, r, n) {
    let o;
    try {
        o = n ? e(...n) : e()
    } catch (i) {
        Si(i, t, r)
    }
    return o
}
function yt(e, t, r, n) {
    if (de(e)) {
        const i = nr(e, t, r, n);
        return i && tc(i) && i.catch(a => {
                Si(a, t, r)
            }
        ),
            i
    }
    const o = [];
    for (let i = 0; i < e.length; i++)
        o.push(yt(e[i], t, r, n));
    return o
}
function Si(e, t, r, n=!0) {
    const o = t ? t.vnode : null;
    if (t) {
        let i = t.parent;
        const a = t.proxy
            , s = r;
        for (; i; ) {
            const c = i.ec;
            if (c) {
                for (let u = 0; u < c.length; u++)
                    if (c[u](e, a, s) === !1)
                        return
            }
            i = i.parent
        }
        const l = t.appContext.config.errorHandler;
        if (l) {
            nr(l, null, 10, [e, a, s]);
            return
        }
    }
    $g(e, r, o, n)
}
function $g(e, t, r, n=!0) {
    console.error(e)
}
let Oi = !1
    , ys = !1;
const ht = [];
let Kt = 0;
const ho = [];
let vo = null
    , an = 0;
const mo = [];
let or = null
    , sn = 0;
const hf = Promise.resolve();
let bs = null
    , ws = null;
function Se(e) {
    const t = bs || hf;
    return e ? t.then(this ? e.bind(this) : e) : t
}
function Mg(e) {
    let t = Kt + 1
        , r = ht.length;
    for (; t < r; ) {
        const n = t + r >>> 1;
        go(ht[n]) < e ? t = n + 1 : r = n
    }
    return t
}
function vf(e) {
    (!ht.length || !ht.includes(e, Oi && e.allowRecurse ? Kt + 1 : Kt)) && e !== ws && (e.id == null ? ht.push(e) : ht.splice(Mg(e.id), 0, e),
        mf())
}
function mf() {
    !Oi && !ys && (ys = !0,
        bs = hf.then(yf))
}
function Rg(e) {
    const t = ht.indexOf(e);
    t > Kt && ht.splice(t, 1)
}
function gf(e, t, r, n) {
    te(e) ? r.push(...e) : (!t || !t.includes(e, e.allowRecurse ? n + 1 : n)) && r.push(e),
        mf()
}
function Ig(e) {
    gf(e, vo, ho, an)
}
function Dg(e) {
    gf(e, or, mo, sn)
}
function Cs(e, t=null) {
    if (ho.length) {
        for (ws = t,
                 vo = [...new Set(ho)],
                 ho.length = 0,
                 an = 0; an < vo.length; an++)
            vo[an]();
        vo = null,
            an = 0,
            ws = null,
            Cs(e, t)
    }
}
function Ei(e) {
    if (mo.length) {
        const t = [...new Set(mo)];
        if (mo.length = 0,
            or) {
            or.push(...t);
            return
        }
        for (or = t,
                 or.sort( (r, n) => go(r) - go(n)),
                 sn = 0; sn < or.length; sn++)
            or[sn]();
        or = null,
            sn = 0
    }
}
const go = e => e.id == null ? 1 / 0 : e.id;
function yf(e) {
    ys = !1,
        Oi = !0,
        Cs(e),
        ht.sort( (r, n) => go(r) - go(n));
    const t = At;
    try {
        for (Kt = 0; Kt < ht.length; Kt++) {
            const r = ht[Kt];
            r && r.active !== !1 && nr(r, null, 14)
        }
    } finally {
        Kt = 0,
            ht.length = 0,
            Ei(),
            Oi = !1,
            bs = null,
        (ht.length || ho.length || mo.length) && yf(e)
    }
}
function Re(e, t) {
    return Fi(e, null, t)
}
function Bg(e, t) {
    return Fi(e, null, {
        flush: "post"
    })
}
const bf = {};
function st(e, t, r) {
    return Fi(e, t, r)
}
function Fi(e, t, {immediate: r, deep: n, flush: o, onTrack: i, onTrigger: a}=Ae) {
    const s = Ke;
    let l, c = !1, u = !1;
    if (et(e) ? (l = () => e.value,
        c = !!e._shallow) : rn(e) ? (l = () => e,
        n = !0) : te(e) ? (u = !0,
        c = e.some(rn),
        l = () => e.map(v => {
                if (et(v))
                    return v.value;
                if (rn(v))
                    return Ir(v);
                if (de(v))
                    return nr(v, s, 2)
            }
        )) : de(e) ? t ? l = () => nr(e, s, 2) : l = () => {
            if (!(s && s.isUnmounted))
                return f && f(),
                    yt(e, s, 3, [d])
        }
        : l = At,
    t && n) {
        const v = l;
        l = () => Ir(v())
    }
    let f, d = v => {
            f = h.onStop = () => {
                nr(v, s, 4)
            }
        }
    ;
    if (xi)
        return d = At,
            t ? r && yt(t, s, 3, [l(), u ? [] : void 0, d]) : l(),
            At;
    let p = u ? [] : bf;
    const g = () => {
            if (!!h.active)
                if (t) {
                    const v = h.run();
                    (n || c || (u ? v.some( (w, S) => oo(w, p[S])) : oo(v, p))) && (f && f(),
                        yt(t, s, 3, [v, p === bf ? void 0 : p, d]),
                        p = v)
                } else
                    h.run()
        }
    ;
    g.allowRecurse = !!t;
    let m;
    o === "sync" ? m = g : o === "post" ? m = () => ut(g, s && s.suspense) : m = () => {
        !s || s.isMounted ? Ig(g) : g()
    }
    ;
    const h = new qa(l,m);
    return t ? r ? g() : p = h.run() : o === "post" ? ut(h.run.bind(h), s && s.suspense) : h.run(),
        () => {
            h.stop(),
            s && s.scope && Da(s.scope.effects, h)
        }
}
function Ng(e, t, r) {
    const n = this.proxy
        , o = qe(e) ? e.includes(".") ? wf(n, e) : () => n[e] : e.bind(n, n);
    let i;
    de(t) ? i = t : (i = t.handler,
        r = t);
    const a = Ke;
    on(this);
    const s = Fi(o, i.bind(n), r);
    return a ? on(a) : Rr(),
        s
}
function wf(e, t) {
    const r = t.split(".");
    return () => {
        let n = e;
        for (let o = 0; o < r.length && n; o++)
            n = n[r[o]];
        return n
    }
}
function Ir(e, t) {
    if (!Ne(e) || e.__v_skip || (t = t || new Set,
        t.has(e)))
        return e;
    if (t.add(e),
        et(e))
        Ir(e.value, t);
    else if (te(e))
        for (let r = 0; r < e.length; r++)
            Ir(e[r], t);
    else if (Zr(e) || Qr(e))
        e.forEach(r => {
                Ir(r, t)
            }
        );
    else if (nc(e))
        for (const r in e)
            Ir(e[r], t);
    return e
}
function Lg() {
    return jg().slots
}
function jg() {
    const e = ms();
    return e.setupContext || (e.setupContext = pf(e))
}
function Pt(e, t, r) {
    const n = arguments.length;
    return n === 2 ? Ne(t) && !te(t) ? yi(t) ? V(e, null, [t]) : V(e, t) : V(e, null, t) : (n > 3 ? r = Array.prototype.slice.call(arguments, 2) : n === 3 && yi(r) && (r = [r]),
        V(e, t, r))
}
const Hg = "3.2.26"
    , Ug = "http://www.w3.org/2000/svg"
    , ln = typeof document != "undefined" ? document : null
    , Cf = new Map
    , Wg = {
    insert: (e, t, r) => {
        t.insertBefore(e, r || null)
    }
    ,
    remove: e => {
        const t = e.parentNode;
        t && t.removeChild(e)
    }
    ,
    createElement: (e, t, r, n) => {
        const o = t ? ln.createElementNS(Ug, e) : ln.createElement(e, r ? {
            is: r
        } : void 0);
        return e === "select" && n && n.multiple != null && o.setAttribute("multiple", n.multiple),
            o
    }
    ,
    createText: e => ln.createTextNode(e),
    createComment: e => ln.createComment(e),
    setText: (e, t) => {
        e.nodeValue = t
    }
    ,
    setElementText: (e, t) => {
        e.textContent = t
    }
    ,
    parentNode: e => e.parentNode,
    nextSibling: e => e.nextSibling,
    querySelector: e => ln.querySelector(e),
    setScopeId(e, t) {
        e.setAttribute(t, "")
    },
    cloneNode(e) {
        const t = e.cloneNode(!0);
        return "_value"in e && (t._value = e._value),
            t
    },
    insertStaticContent(e, t, r, n) {
        const o = r ? r.previousSibling : t.lastChild;
        let i = Cf.get(e);
        if (!i) {
            const a = ln.createElement("template");
            if (a.innerHTML = n ? `<svg>${e}</svg>` : e,
                i = a.content,
                n) {
                const s = i.firstChild;
                for (; s.firstChild; )
                    i.appendChild(s.firstChild);
                i.removeChild(s)
            }
            Cf.set(e, i)
        }
        return t.insertBefore(i.cloneNode(!0), r),
            [o ? o.nextSibling : t.firstChild, r ? r.previousSibling : t.lastChild]
    }
};
function qg(e, t, r) {
    const n = e._vtc;
    n && (t = (t ? [t, ...n] : [...n]).join(" ")),
        t == null ? e.removeAttribute("class") : r ? e.setAttribute("class", t) : e.className = t
}
function zg(e, t, r) {
    const n = e.style
        , o = qe(r);
    if (r && !o) {
        for (const i in r)
            _s(n, i, r[i]);
        if (t && !qe(t))
            for (const i in t)
                r[i] == null && _s(n, i, "")
    } else {
        const i = n.display;
        o ? t !== r && (n.cssText = r) : t && e.removeAttribute("style"),
        "_vod"in e && (n.display = i)
    }
}
const _f = /\s*!important$/;
function _s(e, t, r) {
    if (te(r))
        r.forEach(n => _s(e, t, n));
    else if (t.startsWith("--"))
        e.setProperty(t, r);
    else {
        const n = Vg(e, t);
        _f.test(r) ? e.setProperty(Sr(n), r.replace(_f, ""), "important") : e[n] = r
    }
}
const xf = ["Webkit", "Moz", "ms"]
    , xs = {};
function Vg(e, t) {
    const r = xs[t];
    if (r)
        return r;
    let n = Bt(t);
    if (n !== "filter" && n in e)
        return xs[t] = n;
    n = Qo(n);
    for (let o = 0; o < xf.length; o++) {
        const i = xf[o] + n;
        if (i in e)
            return xs[t] = i
    }
    return t
}
const Sf = "http://www.w3.org/1999/xlink";
function Kg(e, t, r, n, o) {
    if (n && t.startsWith("xlink:"))
        r == null ? e.removeAttributeNS(Sf, t.slice(6, t.length)) : e.setAttributeNS(Sf, t, r);
    else {
        const i = jv(t);
        r == null || i && !Qu(r) ? e.removeAttribute(t) : e.setAttribute(t, i ? "" : r)
    }
}
function Gg(e, t, r, n, o, i, a) {
    if (t === "innerHTML" || t === "textContent") {
        n && a(n, o, i),
            e[t] = r == null ? "" : r;
        return
    }
    if (t === "value" && e.tagName !== "PROGRESS" && !e.tagName.includes("-")) {
        e._value = r;
        const s = r == null ? "" : r;
        (e.value !== s || e.tagName === "OPTION") && (e.value = s),
        r == null && e.removeAttribute(t);
        return
    }
    if (r === "" || r == null) {
        const s = typeof e[t];
        if (s === "boolean") {
            e[t] = Qu(r);
            return
        } else if (r == null && s === "string") {
            e[t] = "",
                e.removeAttribute(t);
            return
        } else if (s === "number") {
            try {
                e[t] = 0
            } catch {}
            e.removeAttribute(t);
            return
        }
    }
    try {
        e[t] = r
    } catch {}
}
let Ai = Date.now
    , Of = !1;
if (typeof window != "undefined") {
    Ai() > document.createEvent("Event").timeStamp && (Ai = () => performance.now());
    const e = navigator.userAgent.match(/firefox\/(\d+)/i);
    Of = !!(e && Number(e[1]) <= 53)
}
let Ss = 0;
const Yg = Promise.resolve()
    , Xg = () => {
    Ss = 0
}
    , Jg = () => Ss || (Yg.then(Xg),
    Ss = Ai());
function Gt(e, t, r, n) {
    e.addEventListener(t, r, n)
}
function Qg(e, t, r, n) {
    e.removeEventListener(t, r, n)
}
function Zg(e, t, r, n, o=null) {
    const i = e._vei || (e._vei = {})
        , a = i[t];
    if (n && a)
        a.value = n;
    else {
        const [s,l] = e0(t);
        if (n) {
            const c = i[t] = t0(n, o);
            Gt(e, s, c, l)
        } else
            a && (Qg(e, s, a, l),
                i[t] = void 0)
    }
}
const Ef = /(?:Once|Passive|Capture)$/;
function e0(e) {
    let t;
    if (Ef.test(e)) {
        t = {};
        let r;
        for (; r = e.match(Ef); )
            e = e.slice(0, e.length - r[0].length),
                t[r[0].toLowerCase()] = !0
    }
    return [Sr(e.slice(2)), t]
}
function t0(e, t) {
    const r = n => {
            const o = n.timeStamp || Ai();
            (Of || o >= r.attached - 1) && yt(r0(n, r.value), t, 5, [n])
        }
    ;
    return r.value = e,
        r.attached = Jg(),
        r
}
function r0(e, t) {
    if (te(t)) {
        const r = e.stopImmediatePropagation;
        return e.stopImmediatePropagation = () => {
            r.call(e),
                e._stopped = !0
        }
            ,
            t.map(n => o => !o._stopped && n(o))
    } else
        return t
}
const Ff = /^on[a-z]/
    , n0 = (e, t, r, n, o=!1, i, a, s, l) => {
        t === "class" ? qg(e, n, o) : t === "style" ? zg(e, r, n) : ro(t) ? Ia(t) || Zg(e, t, r, n, a) : (t[0] === "." ? (t = t.slice(1),
            !0) : t[0] === "^" ? (t = t.slice(1),
            !1) : o0(e, t, n, o)) ? Gg(e, t, n, i, a, s, l) : (t === "true-value" ? e._trueValue = n : t === "false-value" && (e._falseValue = n),
            Kg(e, t, n, o))
    }
;
function o0(e, t, r, n) {
    return n ? !!(t === "innerHTML" || t === "textContent" || t in e && Ff.test(t) && de(r)) : t === "spellcheck" || t === "draggable" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA" || Ff.test(t) && qe(r) ? !1 : t in e
}
function i0(e) {
    const t = ms();
    if (!t)
        return;
    const r = () => Os(t.subTree, e(t.proxy));
    Bg(r),
        Pe( () => {
                const n = new MutationObserver(r);
                n.observe(t.subTree.el.parentNode, {
                    childList: !0
                }),
                    Ve( () => n.disconnect())
            }
        )
}
function Os(e, t) {
    if (e.shapeFlag & 128) {
        const r = e.suspense;
        e = r.activeBranch,
        r.pendingBranch && !r.isHydrating && r.effects.push( () => {
                Os(r.activeBranch, t)
            }
        )
    }
    for (; e.component; )
        e = e.component.subTree;
    if (e.shapeFlag & 1 && e.el)
        Af(e.el, t);
    else if (e.type === at)
        e.children.forEach(r => Os(r, t));
    else if (e.type === nn) {
        let {el: r, anchor: n} = e;
        for (; r && (Af(r, t),
        r !== n); )
            r = r.nextSibling
    }
}
function Af(e, t) {
    if (e.nodeType === 1) {
        const r = e.style;
        for (const n in t)
            r.setProperty(`--${n}`, t[n])
    }
}
const ir = "transition"
    , yo = "animation"
    , Es = (e, {slots: t}) => Pt(Mc, a0(e), t);
Es.displayName = "Transition";
const kf = {
    name: String,
    type: String,
    css: {
        type: Boolean,
        default: !0
    },
    duration: [String, Number, Object],
    enterFromClass: String,
    enterActiveClass: String,
    enterToClass: String,
    appearFromClass: String,
    appearActiveClass: String,
    appearToClass: String,
    leaveFromClass: String,
    leaveActiveClass: String,
    leaveToClass: String
};
Es.props = Ze({}, Mc.props, kf);
const Dr = (e, t=[]) => {
    te(e) ? e.forEach(r => r(...t)) : e && e(...t)
}
    , Pf = e => e ? te(e) ? e.some(t => t.length > 1) : e.length > 1 : !1;
function a0(e) {
    const t = {};
    for (const F in e)
        F in kf || (t[F] = e[F]);
    if (e.css === !1)
        return t;
    const {name: r="v", type: n, duration: o, enterFromClass: i=`${r}-enter-from`, enterActiveClass: a=`${r}-enter-active`, enterToClass: s=`${r}-enter-to`, appearFromClass: l=i, appearActiveClass: c=a, appearToClass: u=s, leaveFromClass: f=`${r}-leave-from`, leaveActiveClass: d=`${r}-leave-active`, leaveToClass: p=`${r}-leave-to`} = e
        , g = s0(o)
        , m = g && g[0]
        , h = g && g[1]
        , {onBeforeEnter: v, onEnter: w, onEnterCancelled: S, onLeave: b, onLeaveCancelled: O, onBeforeAppear: C=v, onAppear: _=w, onAppearCancelled: E=S} = t
        , A = (F, B, K) => {
            un(F, B ? u : s),
                un(F, B ? c : a),
            K && K()
        }
        , M = (F, B) => {
            un(F, p),
                un(F, d),
            B && B()
        }
        , I = F => (B, K) => {
            const oe = F ? _ : w
                , ee = () => A(B, F, K);
            Dr(oe, [B, ee]),
                Tf( () => {
                        un(B, F ? l : i),
                            ar(B, F ? u : s),
                        Pf(oe) || $f(B, n, m, ee)
                    }
                )
        }
    ;
    return Ze(t, {
        onBeforeEnter(F) {
            Dr(v, [F]),
                ar(F, i),
                ar(F, a)
        },
        onBeforeAppear(F) {
            Dr(C, [F]),
                ar(F, l),
                ar(F, c)
        },
        onEnter: I(!1),
        onAppear: I(!0),
        onLeave(F, B) {
            const K = () => M(F, B);
            ar(F, f),
                c0(),
                ar(F, d),
                Tf( () => {
                        un(F, f),
                            ar(F, p),
                        Pf(b) || $f(F, n, h, K)
                    }
                ),
                Dr(b, [F, K])
        },
        onEnterCancelled(F) {
            A(F, !1),
                Dr(S, [F])
        },
        onAppearCancelled(F) {
            A(F, !0),
                Dr(E, [F])
        },
        onLeaveCancelled(F) {
            M(F),
                Dr(O, [F])
        }
    })
}
function s0(e) {
    if (e == null)
        return null;
    if (Ne(e))
        return [Fs(e.enter), Fs(e.leave)];
    {
        const t = Fs(e);
        return [t, t]
    }
}
function Fs(e) {
    return io(e)
}
function ar(e, t) {
    t.split(/\s+/).forEach(r => r && e.classList.add(r)),
        (e._vtc || (e._vtc = new Set)).add(t)
}
function un(e, t) {
    t.split(/\s+/).forEach(n => n && e.classList.remove(n));
    const {_vtc: r} = e;
    r && (r.delete(t),
    r.size || (e._vtc = void 0))
}
function Tf(e) {
    requestAnimationFrame( () => {
            requestAnimationFrame(e)
        }
    )
}
let l0 = 0;
function $f(e, t, r, n) {
    const o = e._endId = ++l0
        , i = () => {
            o === e._endId && n()
        }
    ;
    if (r)
        return setTimeout(i, r);
    const {type: a, timeout: s, propCount: l} = u0(e, t);
    if (!a)
        return n();
    const c = a + "end";
    let u = 0;
    const f = () => {
            e.removeEventListener(c, d),
                i()
        }
        , d = p => {
            p.target === e && ++u >= l && f()
        }
    ;
    setTimeout( () => {
            u < l && f()
        }
        , s + 1),
        e.addEventListener(c, d)
}
function u0(e, t) {
    const r = window.getComputedStyle(e)
        , n = g => (r[g] || "").split(", ")
        , o = n(ir + "Delay")
        , i = n(ir + "Duration")
        , a = Mf(o, i)
        , s = n(yo + "Delay")
        , l = n(yo + "Duration")
        , c = Mf(s, l);
    let u = null
        , f = 0
        , d = 0;
    t === ir ? a > 0 && (u = ir,
        f = a,
        d = i.length) : t === yo ? c > 0 && (u = yo,
        f = c,
        d = l.length) : (f = Math.max(a, c),
        u = f > 0 ? a > c ? ir : yo : null,
        d = u ? u === ir ? i.length : l.length : 0);
    const p = u === ir && /\b(transform|all)(,|$)/.test(r[ir + "Property"]);
    return {
        type: u,
        timeout: f,
        propCount: d,
        hasTransform: p
    }
}
function Mf(e, t) {
    for (; e.length < t.length; )
        e = e.concat(e);
    return Math.max(...t.map( (r, n) => Rf(r) + Rf(e[n])))
}
function Rf(e) {
    return Number(e.slice(0, -1).replace(",", ".")) * 1e3
}
function c0() {
    return document.body.offsetHeight
}
const sr = e => {
        const t = e.props["onUpdate:modelValue"];
        return te(t) ? r => Zo(t, r) : t
    }
;
function f0(e) {
    e.target.composing = !0
}
function If(e) {
    const t = e.target;
    t.composing && (t.composing = !1,
        d0(t, "input"))
}
function d0(e, t) {
    const r = document.createEvent("HTMLEvents");
    r.initEvent(t, !0, !0),
        e.dispatchEvent(r)
}
const Df = {
    created(e, {modifiers: {lazy: t, trim: r, number: n}}, o) {
        e._assign = sr(o);
        const i = n || o.props && o.props.type === "number";
        Gt(e, t ? "change" : "input", a => {
                if (a.target.composing)
                    return;
                let s = e.value;
                r ? s = s.trim() : i && (s = io(s)),
                    e._assign(s)
            }
        ),
        r && Gt(e, "change", () => {
                e.value = e.value.trim()
            }
        ),
        t || (Gt(e, "compositionstart", f0),
            Gt(e, "compositionend", If),
            Gt(e, "change", If))
    },
    mounted(e, {value: t}) {
        e.value = t == null ? "" : t
    },
    beforeUpdate(e, {value: t, modifiers: {lazy: r, trim: n, number: o}}, i) {
        if (e._assign = sr(i),
        e.composing || document.activeElement === e && (r || n && e.value.trim() === t || (o || e.type === "number") && io(e.value) === t))
            return;
        const a = t == null ? "" : t;
        e.value !== a && (e.value = a)
    }
}
    , p0 = {
    deep: !0,
    created(e, t, r) {
        e._assign = sr(r),
            Gt(e, "change", () => {
                    const n = e._modelValue
                        , o = cn(e)
                        , i = e.checked
                        , a = e._assign;
                    if (te(n)) {
                        const s = Ra(n, o)
                            , l = s !== -1;
                        if (i && !l)
                            a(n.concat(o));
                        else if (!i && l) {
                            const c = [...n];
                            c.splice(s, 1),
                                a(c)
                        }
                    } else if (Zr(n)) {
                        const s = new Set(n);
                        i ? s.add(o) : s.delete(o),
                            a(s)
                    } else
                        a(Lf(e, i))
                }
            )
    },
    mounted: Bf,
    beforeUpdate(e, t, r) {
        e._assign = sr(r),
            Bf(e, t, r)
    }
};
function Bf(e, {value: t, oldValue: r}, n) {
    e._modelValue = t,
        te(t) ? e.checked = Ra(t, n.props.value) > -1 : Zr(t) ? e.checked = t.has(n.props.value) : t !== r && (e.checked = xr(t, Lf(e, !0)))
}
const h0 = {
    created(e, {value: t}, r) {
        e.checked = xr(t, r.props.value),
            e._assign = sr(r),
            Gt(e, "change", () => {
                    e._assign(cn(e))
                }
            )
    },
    beforeUpdate(e, {value: t, oldValue: r}, n) {
        e._assign = sr(n),
        t !== r && (e.checked = xr(t, n.props.value))
    }
}
    , v0 = {
    deep: !0,
    created(e, {value: t, modifiers: {number: r}}, n) {
        const o = Zr(t);
        Gt(e, "change", () => {
                const i = Array.prototype.filter.call(e.options, a => a.selected).map(a => r ? io(cn(a)) : cn(a));
                e._assign(e.multiple ? o ? new Set(i) : i : i[0])
            }
        ),
            e._assign = sr(n)
    },
    mounted(e, {value: t}) {
        Nf(e, t)
    },
    beforeUpdate(e, t, r) {
        e._assign = sr(r)
    },
    updated(e, {value: t}) {
        Nf(e, t)
    }
};
function Nf(e, t) {
    const r = e.multiple;
    if (!(r && !te(t) && !Zr(t))) {
        for (let n = 0, o = e.options.length; n < o; n++) {
            const i = e.options[n]
                , a = cn(i);
            if (r)
                te(t) ? i.selected = Ra(t, a) > -1 : i.selected = t.has(a);
            else if (xr(cn(i), t)) {
                e.selectedIndex !== n && (e.selectedIndex = n);
                return
            }
        }
        !r && e.selectedIndex !== -1 && (e.selectedIndex = -1)
    }
}
function cn(e) {
    return "_value"in e ? e._value : e.value
}
function Lf(e, t) {
    const r = t ? "_trueValue" : "_falseValue";
    return r in e ? e[r] : t
}
const FA = {
    created(e, t, r) {
        ki(e, t, r, null, "created")
    },
    mounted(e, t, r) {
        ki(e, t, r, null, "mounted")
    },
    beforeUpdate(e, t, r, n) {
        ki(e, t, r, n, "beforeUpdate")
    },
    updated(e, t, r, n) {
        ki(e, t, r, n, "updated")
    }
};
function ki(e, t, r, n, o) {
    let i;
    switch (e.tagName) {
        case "SELECT":
            i = v0;
            break;
        case "TEXTAREA":
            i = Df;
            break;
        default:
            switch (r.props && r.props.type) {
                case "checkbox":
                    i = p0;
                    break;
                case "radio":
                    i = h0;
                    break;
                default:
                    i = Df
            }
    }
    const a = i[o];
    a && a(e, t, r, n)
}
const m0 = ["ctrl", "shift", "alt", "meta"]
    , g0 = {
    stop: e => e.stopPropagation(),
    prevent: e => e.preventDefault(),
    self: e => e.target !== e.currentTarget,
    ctrl: e => !e.ctrlKey,
    shift: e => !e.shiftKey,
    alt: e => !e.altKey,
    meta: e => !e.metaKey,
    left: e => "button"in e && e.button !== 0,
    middle: e => "button"in e && e.button !== 1,
    right: e => "button"in e && e.button !== 2,
    exact: (e, t) => m0.some(r => e[`${r}Key`] && !t.includes(r))
}
    , AA = (e, t) => (r, ...n) => {
    for (let o = 0; o < t.length; o++) {
        const i = g0[t[o]];
        if (i && i(r, t))
            return
    }
    return e(r, ...n)
}
    , y0 = {
    esc: "escape",
    space: " ",
    up: "arrow-up",
    left: "arrow-left",
    right: "arrow-right",
    down: "arrow-down",
    delete: "backspace"
}
    , b0 = (e, t) => r => {
    if (!("key"in r))
        return;
    const n = Sr(r.key);
    if (t.some(o => o === n || y0[o] === n))
        return e(r)
}
    , w0 = {
    beforeMount(e, {value: t}, {transition: r}) {
        e._vod = e.style.display === "none" ? "" : e.style.display,
            r && t ? r.beforeEnter(e) : bo(e, t)
    },
    mounted(e, {value: t}, {transition: r}) {
        r && t && r.enter(e)
    },
    updated(e, {value: t, oldValue: r}, {transition: n}) {
        !t != !r && (n ? t ? (n.beforeEnter(e),
            bo(e, !0),
            n.enter(e)) : n.leave(e, () => {
                bo(e, !1)
            }
        ) : bo(e, t))
    },
    beforeUnmount(e, {value: t}) {
        bo(e, t)
    }
};
function bo(e, t) {
    e.style.display = t ? e._vod : "none"
}
const C0 = Ze({
    patchProp: n0
}, Wg);
let As, jf = !1;
function _0() {
    return As = jf ? As : fg(C0),
        jf = !0,
        As
}
const kA = (...e) => {
        const t = _0().createApp(...e)
            , {mount: r} = t;
        return t.mount = n => {
            const o = x0(n);
            if (o)
                return r(o, !0, o instanceof SVGElement)
        }
            ,
            t
    }
;
function x0(e) {
    return qe(e) ? document.querySelector(e) : e
}
function S0() {
    return Hf().__VUE_DEVTOOLS_GLOBAL_HOOK__
}
function Hf() {
    return typeof navigator != "undefined" && typeof window != "undefined" ? window : typeof global != "undefined" ? global : {}
}
const O0 = typeof Proxy == "function"
    , E0 = "devtools-plugin:setup"
    , F0 = "plugin:settings:set";
class A0 {
    constructor(t, r) {
        this.target = null,
            this.targetQueue = [],
            this.onQueue = [],
            this.plugin = t,
            this.hook = r;
        const n = {};
        if (t.settings)
            for (const a in t.settings) {
                const s = t.settings[a];
                n[a] = s.defaultValue
            }
        const o = `__vue-devtools-plugin-settings__${t.id}`;
        let i = Object.assign({}, n);
        try {
            const a = localStorage.getItem(o)
                , s = JSON.parse(a);
            Object.assign(i, s)
        } catch {}
        this.fallbacks = {
            getSettings() {
                return i
            },
            setSettings(a) {
                try {
                    localStorage.setItem(o, JSON.stringify(a))
                } catch {}
                i = a
            }
        },
        r && r.on(F0, (a, s) => {
                a === this.plugin.id && this.fallbacks.setSettings(s)
            }
        ),
            this.proxiedOn = new Proxy({},{
                get: (a, s) => this.target ? this.target.on[s] : (...l) => {
                    this.onQueue.push({
                        method: s,
                        args: l
                    })
                }
            }),
            this.proxiedTarget = new Proxy({},{
                get: (a, s) => this.target ? this.target[s] : s === "on" ? this.proxiedOn : Object.keys(this.fallbacks).includes(s) ? (...l) => (this.targetQueue.push({
                    method: s,
                    args: l,
                    resolve: () => {}
                }),
                    this.fallbacks[s](...l)) : (...l) => new Promise(c => {
                        this.targetQueue.push({
                            method: s,
                            args: l,
                            resolve: c
                        })
                    }
                )
            })
    }
    async setRealTarget(t) {
        this.target = t;
        for (const r of this.onQueue)
            this.target.on[r.method](...r.args);
        for (const r of this.targetQueue)
            r.resolve(await this.target[r.method](...r.args))
    }
}
function k0(e, t) {
    const r = Hf()
        , n = S0()
        , o = O0 && e.enableEarlyProxy;
    if (n && (r.__VUE_DEVTOOLS_PLUGIN_API_AVAILABLE__ || !o))
        n.emit(E0, e, t);
    else {
        const i = o ? new A0(e,n) : null;
        (r.__VUE_DEVTOOLS_PLUGINS__ = r.__VUE_DEVTOOLS_PLUGINS__ || []).push({
            pluginDescriptor: e,
            setupFn: t,
            proxy: i
        }),
        i && t(i.proxiedTarget)
    }
}
/*!
 * vuex v4.0.2
 * (c) 2021 Evan You
 * @license MIT
 */
var P0 = "store";
function fn(e, t) {
    Object.keys(e).forEach(function(r) {
        return t(e[r], r)
    })
}
function Uf(e) {
    return e !== null && typeof e == "object"
}
function T0(e) {
    return e && typeof e.then == "function"
}
function $0(e, t) {
    return function() {
        return e(t)
    }
}
function Wf(e, t, r) {
    return t.indexOf(e) < 0 && (r && r.prepend ? t.unshift(e) : t.push(e)),
        function() {
            var n = t.indexOf(e);
            n > -1 && t.splice(n, 1)
        }
}
function qf(e, t) {
    e._actions = Object.create(null),
        e._mutations = Object.create(null),
        e._wrappedGetters = Object.create(null),
        e._modulesNamespaceMap = Object.create(null);
    var r = e.state;
    Pi(e, r, [], e._modules.root, !0),
        ks(e, r, t)
}
function ks(e, t, r) {
    var n = e._state;
    e.getters = {},
        e._makeLocalGettersCache = Object.create(null);
    var o = e._wrappedGetters
        , i = {};
    fn(o, function(a, s) {
        i[s] = $0(a, e),
            Object.defineProperty(e.getters, s, {
                get: function() {
                    return i[s]()
                },
                enumerable: !0
            })
    }),
        e._state = er({
            data: t
        }),
    e.strict && B0(e),
    n && r && e._withCommit(function() {
        n.data = null
    })
}
function Pi(e, t, r, n, o) {
    var i = !r.length
        , a = e._modules.getNamespace(r);
    if (n.namespaced && (e._modulesNamespaceMap[a],
        e._modulesNamespaceMap[a] = n),
    !i && !o) {
        var s = Ps(t, r.slice(0, -1))
            , l = r[r.length - 1];
        e._withCommit(function() {
            s[l] = n.state
        })
    }
    var c = n.context = M0(e, a, r);
    n.forEachMutation(function(u, f) {
        var d = a + f;
        R0(e, d, u, c)
    }),
        n.forEachAction(function(u, f) {
            var d = u.root ? f : a + f
                , p = u.handler || u;
            I0(e, d, p, c)
        }),
        n.forEachGetter(function(u, f) {
            var d = a + f;
            D0(e, d, u, c)
        }),
        n.forEachChild(function(u, f) {
            Pi(e, t, r.concat(f), u, o)
        })
}
function M0(e, t, r) {
    var n = t === ""
        , o = {
        dispatch: n ? e.dispatch : function(i, a, s) {
            var l = Ti(i, a, s)
                , c = l.payload
                , u = l.options
                , f = l.type;
            return (!u || !u.root) && (f = t + f),
                e.dispatch(f, c)
        }
        ,
        commit: n ? e.commit : function(i, a, s) {
            var l = Ti(i, a, s)
                , c = l.payload
                , u = l.options
                , f = l.type;
            (!u || !u.root) && (f = t + f),
                e.commit(f, c, u)
        }
    };
    return Object.defineProperties(o, {
        getters: {
            get: n ? function() {
                    return e.getters
                }
                : function() {
                    return zf(e, t)
                }
        },
        state: {
            get: function() {
                return Ps(e.state, r)
            }
        }
    }),
        o
}
function zf(e, t) {
    if (!e._makeLocalGettersCache[t]) {
        var r = {}
            , n = t.length;
        Object.keys(e.getters).forEach(function(o) {
            if (o.slice(0, n) === t) {
                var i = o.slice(n);
                Object.defineProperty(r, i, {
                    get: function() {
                        return e.getters[o]
                    },
                    enumerable: !0
                })
            }
        }),
            e._makeLocalGettersCache[t] = r
    }
    return e._makeLocalGettersCache[t]
}
function R0(e, t, r, n) {
    var o = e._mutations[t] || (e._mutations[t] = []);
    o.push(function(a) {
        r.call(e, n.state, a)
    })
}
function I0(e, t, r, n) {
    var o = e._actions[t] || (e._actions[t] = []);
    o.push(function(a) {
        var s = r.call(e, {
            dispatch: n.dispatch,
            commit: n.commit,
            getters: n.getters,
            state: n.state,
            rootGetters: e.getters,
            rootState: e.state
        }, a);
        return T0(s) || (s = Promise.resolve(s)),
            e._devtoolHook ? s.catch(function(l) {
                throw e._devtoolHook.emit("vuex:error", l),
                    l
            }) : s
    })
}
function D0(e, t, r, n) {
    e._wrappedGetters[t] || (e._wrappedGetters[t] = function(i) {
            return r(n.state, n.getters, i.state, i.getters)
        }
    )
}
function B0(e) {
    st(function() {
        return e._state.data
    }, function() {}, {
        deep: !0,
        flush: "sync"
    })
}
function Ps(e, t) {
    return t.reduce(function(r, n) {
        return r[n]
    }, e)
}
function Ti(e, t, r) {
    return Uf(e) && e.type && (r = t,
        t = e,
        e = e.type),
        {
            type: e,
            payload: t,
            options: r
        }
}
var N0 = "vuex bindings"
    , Vf = "vuex:mutations"
    , Ts = "vuex:actions"
    , dn = "vuex"
    , L0 = 0;
function j0(e, t) {
    k0({
        id: "org.vuejs.vuex",
        app: e,
        label: "Vuex",
        homepage: "https://next.vuex.vuejs.org/",
        logo: "https://vuejs.org/images/icons/favicon-96x96.png",
        packageName: "vuex",
        componentStateTypes: [N0]
    }, function(r) {
        r.addTimelineLayer({
            id: Vf,
            label: "Vuex Mutations",
            color: Kf
        }),
            r.addTimelineLayer({
                id: Ts,
                label: "Vuex Actions",
                color: Kf
            }),
            r.addInspector({
                id: dn,
                label: "Vuex",
                icon: "storage",
                treeFilterPlaceholder: "Filter stores..."
            }),
            r.on.getInspectorTree(function(n) {
                if (n.app === e && n.inspectorId === dn)
                    if (n.filter) {
                        var o = [];
                        Jf(o, t._modules.root, n.filter, ""),
                            n.rootNodes = o
                    } else
                        n.rootNodes = [Xf(t._modules.root, "")]
            }),
            r.on.getInspectorState(function(n) {
                if (n.app === e && n.inspectorId === dn) {
                    var o = n.nodeId;
                    zf(t, o),
                        n.state = W0(z0(t._modules, o), o === "root" ? t.getters : t._makeLocalGettersCache, o)
                }
            }),
            r.on.editInspectorState(function(n) {
                if (n.app === e && n.inspectorId === dn) {
                    var o = n.nodeId
                        , i = n.path;
                    o !== "root" && (i = o.split("/").filter(Boolean).concat(i)),
                        t._withCommit(function() {
                            n.set(t._state.data, i, n.state.value)
                        })
                }
            }),
            t.subscribe(function(n, o) {
                var i = {};
                n.payload && (i.payload = n.payload),
                    i.state = o,
                    r.notifyComponentUpdate(),
                    r.sendInspectorTree(dn),
                    r.sendInspectorState(dn),
                    r.addTimelineEvent({
                        layerId: Vf,
                        event: {
                            time: Date.now(),
                            title: n.type,
                            data: i
                        }
                    })
            }),
            t.subscribeAction({
                before: function(n, o) {
                    var i = {};
                    n.payload && (i.payload = n.payload),
                        n._id = L0++,
                        n._time = Date.now(),
                        i.state = o,
                        r.addTimelineEvent({
                            layerId: Ts,
                            event: {
                                time: n._time,
                                title: n.type,
                                groupId: n._id,
                                subtitle: "start",
                                data: i
                            }
                        })
                },
                after: function(n, o) {
                    var i = {}
                        , a = Date.now() - n._time;
                    i.duration = {
                        _custom: {
                            type: "duration",
                            display: a + "ms",
                            tooltip: "Action duration",
                            value: a
                        }
                    },
                    n.payload && (i.payload = n.payload),
                        i.state = o,
                        r.addTimelineEvent({
                            layerId: Ts,
                            event: {
                                time: Date.now(),
                                title: n.type,
                                groupId: n._id,
                                subtitle: "end",
                                data: i
                            }
                        })
                }
            })
    })
}
var Kf = 8702998
    , H0 = 6710886
    , U0 = 16777215
    , Gf = {
    label: "namespaced",
    textColor: U0,
    backgroundColor: H0
};
function Yf(e) {
    return e && e !== "root" ? e.split("/").slice(-2, -1)[0] : "Root"
}
function Xf(e, t) {
    return {
        id: t || "root",
        label: Yf(t),
        tags: e.namespaced ? [Gf] : [],
        children: Object.keys(e._children).map(function(r) {
            return Xf(e._children[r], t + r + "/")
        })
    }
}
function Jf(e, t, r, n) {
    n.includes(r) && e.push({
        id: n || "root",
        label: n.endsWith("/") ? n.slice(0, n.length - 1) : n || "Root",
        tags: t.namespaced ? [Gf] : []
    }),
        Object.keys(t._children).forEach(function(o) {
            Jf(e, t._children[o], r, n + o + "/")
        })
}
function W0(e, t, r) {
    t = r === "root" ? t : t[r];
    var n = Object.keys(t)
        , o = {
        state: Object.keys(e.state).map(function(a) {
            return {
                key: a,
                editable: !0,
                value: e.state[a]
            }
        })
    };
    if (n.length) {
        var i = q0(t);
        o.getters = Object.keys(i).map(function(a) {
            return {
                key: a.endsWith("/") ? Yf(a) : a,
                editable: !1,
                value: $s(function() {
                    return i[a]
                })
            }
        })
    }
    return o
}
function q0(e) {
    var t = {};
    return Object.keys(e).forEach(function(r) {
        var n = r.split("/");
        if (n.length > 1) {
            var o = t
                , i = n.pop();
            n.forEach(function(a) {
                o[a] || (o[a] = {
                    _custom: {
                        value: {},
                        display: a,
                        tooltip: "Module",
                        abstract: !0
                    }
                }),
                    o = o[a]._custom.value
            }),
                o[i] = $s(function() {
                    return e[r]
                })
        } else
            t[r] = $s(function() {
                return e[r]
            })
    }),
        t
}
function z0(e, t) {
    var r = t.split("/").filter(function(n) {
        return n
    });
    return r.reduce(function(n, o, i) {
        var a = n[o];
        if (!a)
            throw new Error('Missing module "' + o + '" for path "' + t + '".');
        return i === r.length - 1 ? a : a._children
    }, t === "root" ? e : e.root._children)
}
function $s(e) {
    try {
        return e()
    } catch (t) {
        return t
    }
}
var Tt = function(t, r) {
    this.runtime = r,
        this._children = Object.create(null),
        this._rawModule = t;
    var n = t.state;
    this.state = (typeof n == "function" ? n() : n) || {}
}
    , Qf = {
    namespaced: {
        configurable: !0
    }
};
Qf.namespaced.get = function() {
    return !!this._rawModule.namespaced
}
;
Tt.prototype.addChild = function(t, r) {
    this._children[t] = r
}
;
Tt.prototype.removeChild = function(t) {
    delete this._children[t]
}
;
Tt.prototype.getChild = function(t) {
    return this._children[t]
}
;
Tt.prototype.hasChild = function(t) {
    return t in this._children
}
;
Tt.prototype.update = function(t) {
    this._rawModule.namespaced = t.namespaced,
    t.actions && (this._rawModule.actions = t.actions),
    t.mutations && (this._rawModule.mutations = t.mutations),
    t.getters && (this._rawModule.getters = t.getters)
}
;
Tt.prototype.forEachChild = function(t) {
    fn(this._children, t)
}
;
Tt.prototype.forEachGetter = function(t) {
    this._rawModule.getters && fn(this._rawModule.getters, t)
}
;
Tt.prototype.forEachAction = function(t) {
    this._rawModule.actions && fn(this._rawModule.actions, t)
}
;
Tt.prototype.forEachMutation = function(t) {
    this._rawModule.mutations && fn(this._rawModule.mutations, t)
}
;
Object.defineProperties(Tt.prototype, Qf);
var Br = function(t) {
    this.register([], t, !1)
};
Br.prototype.get = function(t) {
    return t.reduce(function(r, n) {
        return r.getChild(n)
    }, this.root)
}
;
Br.prototype.getNamespace = function(t) {
    var r = this.root;
    return t.reduce(function(n, o) {
        return r = r.getChild(o),
        n + (r.namespaced ? o + "/" : "")
    }, "")
}
;
Br.prototype.update = function(t) {
    Zf([], this.root, t)
}
;
Br.prototype.register = function(t, r, n) {
    var o = this;
    n === void 0 && (n = !0);
    var i = new Tt(r,n);
    if (t.length === 0)
        this.root = i;
    else {
        var a = this.get(t.slice(0, -1));
        a.addChild(t[t.length - 1], i)
    }
    r.modules && fn(r.modules, function(s, l) {
        o.register(t.concat(l), s, n)
    })
}
;
Br.prototype.unregister = function(t) {
    var r = this.get(t.slice(0, -1))
        , n = t[t.length - 1]
        , o = r.getChild(n);
    !o || !o.runtime || r.removeChild(n)
}
;
Br.prototype.isRegistered = function(t) {
    var r = this.get(t.slice(0, -1))
        , n = t[t.length - 1];
    return r ? r.hasChild(n) : !1
}
;
function Zf(e, t, r) {
    if (t.update(r),
        r.modules)
        for (var n in r.modules) {
            if (!t.getChild(n))
                return;
            Zf(e.concat(n), t.getChild(n), r.modules[n])
        }
}
function PA(e) {
    return new ct(e)
}
var ct = function(t) {
    var r = this;
    t === void 0 && (t = {});
    var n = t.plugins;
    n === void 0 && (n = []);
    var o = t.strict;
    o === void 0 && (o = !1);
    var i = t.devtools;
    this._committing = !1,
        this._actions = Object.create(null),
        this._actionSubscribers = [],
        this._mutations = Object.create(null),
        this._wrappedGetters = Object.create(null),
        this._modules = new Br(t),
        this._modulesNamespaceMap = Object.create(null),
        this._subscribers = [],
        this._makeLocalGettersCache = Object.create(null),
        this._devtools = i;
    var a = this
        , s = this
        , l = s.dispatch
        , c = s.commit;
    this.dispatch = function(d, p) {
        return l.call(a, d, p)
    }
        ,
        this.commit = function(d, p, g) {
            return c.call(a, d, p, g)
        }
        ,
        this.strict = o;
    var u = this._modules.root.state;
    Pi(this, u, [], this._modules.root),
        ks(this, u),
        n.forEach(function(f) {
            return f(r)
        })
}
    , Ms = {
    state: {
        configurable: !0
    }
};
ct.prototype.install = function(t, r) {
    t.provide(r || P0, this),
        t.config.globalProperties.$store = this;
    var n = this._devtools !== void 0 ? this._devtools : !1;
    n && j0(t, this)
}
;
Ms.state.get = function() {
    return this._state.data
}
;
Ms.state.set = function(e) {}
;
ct.prototype.commit = function(t, r, n) {
    var o = this
        , i = Ti(t, r, n)
        , a = i.type
        , s = i.payload
        , l = {
        type: a,
        payload: s
    }
        , c = this._mutations[a];
    !c || (this._withCommit(function() {
        c.forEach(function(f) {
            f(s)
        })
    }),
        this._subscribers.slice().forEach(function(u) {
            return u(l, o.state)
        }))
}
;
ct.prototype.dispatch = function(t, r) {
    var n = this
        , o = Ti(t, r)
        , i = o.type
        , a = o.payload
        , s = {
        type: i,
        payload: a
    }
        , l = this._actions[i];
    if (!!l) {
        try {
            this._actionSubscribers.slice().filter(function(u) {
                return u.before
            }).forEach(function(u) {
                return u.before(s, n.state)
            })
        } catch {}
        var c = l.length > 1 ? Promise.all(l.map(function(u) {
            return u(a)
        })) : l[0](a);
        return new Promise(function(u, f) {
                c.then(function(d) {
                    try {
                        n._actionSubscribers.filter(function(p) {
                            return p.after
                        }).forEach(function(p) {
                            return p.after(s, n.state)
                        })
                    } catch {}
                    u(d)
                }, function(d) {
                    try {
                        n._actionSubscribers.filter(function(p) {
                            return p.error
                        }).forEach(function(p) {
                            return p.error(s, n.state, d)
                        })
                    } catch {}
                    f(d)
                })
            }
        )
    }
}
;
ct.prototype.subscribe = function(t, r) {
    return Wf(t, this._subscribers, r)
}
;
ct.prototype.subscribeAction = function(t, r) {
    var n = typeof t == "function" ? {
        before: t
    } : t;
    return Wf(n, this._actionSubscribers, r)
}
;
ct.prototype.watch = function(t, r, n) {
    var o = this;
    return st(function() {
        return t(o.state, o.getters)
    }, r, Object.assign({}, n))
}
;
ct.prototype.replaceState = function(t) {
    var r = this;
    this._withCommit(function() {
        r._state.data = t
    })
}
;
ct.prototype.registerModule = function(t, r, n) {
    n === void 0 && (n = {}),
    typeof t == "string" && (t = [t]),
        this._modules.register(t, r),
        Pi(this, this.state, t, this._modules.get(t), n.preserveState),
        ks(this, this.state)
}
;
ct.prototype.unregisterModule = function(t) {
    var r = this;
    typeof t == "string" && (t = [t]),
        this._modules.unregister(t),
        this._withCommit(function() {
            var n = Ps(r.state, t.slice(0, -1));
            delete n[t[t.length - 1]]
        }),
        qf(this)
}
;
ct.prototype.hasModule = function(t) {
    return typeof t == "string" && (t = [t]),
        this._modules.isRegistered(t)
}
;
ct.prototype.hotUpdate = function(t) {
    this._modules.update(t),
        qf(this, !0)
}
;
ct.prototype._withCommit = function(t) {
    var r = this._committing;
    this._committing = !0,
        t(),
        this._committing = r
}
;
Object.defineProperties(ct.prototype, Ms);
var TA = Is(function(e, t) {
    var r = {};
    return Rs(t).forEach(function(n) {
        var o = n.key
            , i = n.val;
        r[o] = function() {
            var s = this.$store.state
                , l = this.$store.getters;
            if (e) {
                var c = Ds(this.$store, "mapState", e);
                if (!c)
                    return;
                s = c.context.state,
                    l = c.context.getters
            }
            return typeof i == "function" ? i.call(this, s, l) : s[i]
        }
            ,
            r[o].vuex = !0
    }),
        r
})
    , $A = Is(function(e, t) {
    var r = {};
    return Rs(t).forEach(function(n) {
        var o = n.key
            , i = n.val;
        r[o] = function() {
            for (var s = [], l = arguments.length; l--; )
                s[l] = arguments[l];
            var c = this.$store.commit;
            if (e) {
                var u = Ds(this.$store, "mapMutations", e);
                if (!u)
                    return;
                c = u.context.commit
            }
            return typeof i == "function" ? i.apply(this, [c].concat(s)) : c.apply(this.$store, [i].concat(s))
        }
    }),
        r
})
    , MA = Is(function(e, t) {
    var r = {};
    return Rs(t).forEach(function(n) {
        var o = n.key
            , i = n.val;
        i = e + i,
            r[o] = function() {
                if (!(e && !Ds(this.$store, "mapGetters", e)))
                    return this.$store.getters[i]
            }
            ,
            r[o].vuex = !0
    }),
        r
});
function Rs(e) {
    return V0(e) ? Array.isArray(e) ? e.map(function(t) {
        return {
            key: t,
            val: t
        }
    }) : Object.keys(e).map(function(t) {
        return {
            key: t,
            val: e[t]
        }
    }) : []
}
function V0(e) {
    return Array.isArray(e) || Uf(e)
}
function Is(e) {
    return function(t, r) {
        return typeof t != "string" ? (r = t,
            t = "") : t.charAt(t.length - 1) !== "/" && (t += "/"),
            e(t, r)
    }
}
function Ds(e, t, r) {
    var n = e._modulesNamespaceMap[r];
    return n
}
var Le = typeof globalThis != "undefined" ? globalThis : typeof window != "undefined" ? window : typeof global != "undefined" ? global : typeof self != "undefined" ? self : {};
function K0(e) {
    return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e
}
function G0(e) {
    if (e.__esModule)
        return e;
    var t = Object.defineProperty({}, "__esModule", {
        value: !0
    });
    return Object.keys(e).forEach(function(r) {
        var n = Object.getOwnPropertyDescriptor(e, r);
        Object.defineProperty(t, r, n.get ? n : {
            enumerable: !0,
            get: function() {
                return e[r]
            }
        })
    }),
        t
}
var Bs = {
    exports: {}
}
    , Y0 = /^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    , X0 = ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"]
    , ed = function(t) {
    var r = t
        , n = t.indexOf("[")
        , o = t.indexOf("]");
    n != -1 && o != -1 && (t = t.substring(0, n) + t.substring(n, o).replace(/:/g, ";") + t.substring(o, t.length));
    for (var i = Y0.exec(t || ""), a = {}, s = 14; s--; )
        a[X0[s]] = i[s] || "";
    return n != -1 && o != -1 && (a.source = r,
        a.host = a.host.substring(1, a.host.length - 1).replace(/;/g, ":"),
        a.authority = a.authority.replace("[", "").replace("]", "").replace(/;/g, ":"),
        a.ipv6uri = !0),
        a.pathNames = J0(a, a.path),
        a.queryKey = Q0(a, a.query),
        a
};
function J0(e, t) {
    var r = /\/{2,9}/g
        , n = t.replace(r, "/").split("/");
    return (t.substr(0, 1) == "/" || t.length === 0) && n.splice(0, 1),
    t.substr(t.length - 1, 1) == "/" && n.splice(n.length - 1, 1),
        n
}
function Q0(e, t) {
    var r = {};
    return t.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, function(n, o, i) {
        o && (r[o] = i)
    }),
        r
}
var pn = {
    exports: {}
}
    , Ns = {
    exports: {}
}
    , wo = 1e3
    , Co = wo * 60
    , _o = Co * 60
    , xo = _o * 24
    , Z0 = xo * 365.25
    , Ls = function(e, t) {
    t = t || {};
    var r = typeof e;
    if (r === "string" && e.length > 0)
        return ey(e);
    if (r === "number" && isNaN(e) === !1)
        return t.long ? ry(e) : ty(e);
    throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(e))
};
function ey(e) {
    if (e = String(e),
        !(e.length > 100)) {
        var t = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(e);
        if (!!t) {
            var r = parseFloat(t[1])
                , n = (t[2] || "ms").toLowerCase();
            switch (n) {
                case "years":
                case "year":
                case "yrs":
                case "yr":
                case "y":
                    return r * Z0;
                case "days":
                case "day":
                case "d":
                    return r * xo;
                case "hours":
                case "hour":
                case "hrs":
                case "hr":
                case "h":
                    return r * _o;
                case "minutes":
                case "minute":
                case "mins":
                case "min":
                case "m":
                    return r * Co;
                case "seconds":
                case "second":
                case "secs":
                case "sec":
                case "s":
                    return r * wo;
                case "milliseconds":
                case "millisecond":
                case "msecs":
                case "msec":
                case "ms":
                    return r;
                default:
                    return
            }
        }
    }
}
function ty(e) {
    return e >= xo ? Math.round(e / xo) + "d" : e >= _o ? Math.round(e / _o) + "h" : e >= Co ? Math.round(e / Co) + "m" : e >= wo ? Math.round(e / wo) + "s" : e + "ms"
}
function ry(e) {
    return $i(e, xo, "day") || $i(e, _o, "hour") || $i(e, Co, "minute") || $i(e, wo, "second") || e + " ms"
}
function $i(e, t, r) {
    if (!(e < t))
        return e < t * 1.5 ? Math.floor(e / t) + " " + r : Math.ceil(e / t) + " " + r + "s"
}
(function(e, t) {
        t = e.exports = n.debug = n.default = n,
            t.coerce = l,
            t.disable = a,
            t.enable = i,
            t.enabled = s,
            t.humanize = Ls,
            t.instances = [],
            t.names = [],
            t.skips = [],
            t.formatters = {};
        function r(c) {
            var u = 0, f;
            for (f in c)
                u = (u << 5) - u + c.charCodeAt(f),
                    u |= 0;
            return t.colors[Math.abs(u) % t.colors.length]
        }
        function n(c) {
            var u;
            function f() {
                if (!!f.enabled) {
                    var d = f
                        , p = +new Date
                        , g = p - (u || p);
                    d.diff = g,
                        d.prev = u,
                        d.curr = p,
                        u = p;
                    for (var m = new Array(arguments.length), h = 0; h < m.length; h++)
                        m[h] = arguments[h];
                    m[0] = t.coerce(m[0]),
                    typeof m[0] != "string" && m.unshift("%O");
                    var v = 0;
                    m[0] = m[0].replace(/%([a-zA-Z%])/g, function(S, b) {
                        if (S === "%%")
                            return S;
                        v++;
                        var O = t.formatters[b];
                        if (typeof O == "function") {
                            var C = m[v];
                            S = O.call(d, C),
                                m.splice(v, 1),
                                v--
                        }
                        return S
                    }),
                        t.formatArgs.call(d, m);
                    var w = f.log || t.log || console.log.bind(console);
                    w.apply(d, m)
                }
            }
            return f.namespace = c,
                f.enabled = t.enabled(c),
                f.useColors = t.useColors(),
                f.color = r(c),
                f.destroy = o,
            typeof t.init == "function" && t.init(f),
                t.instances.push(f),
                f
        }
        function o() {
            var c = t.instances.indexOf(this);
            return c !== -1 ? (t.instances.splice(c, 1),
                !0) : !1
        }
        function i(c) {
            t.save(c),
                t.names = [],
                t.skips = [];
            var u, f = (typeof c == "string" ? c : "").split(/[\s,]+/), d = f.length;
            for (u = 0; u < d; u++)
                !f[u] || (c = f[u].replace(/\*/g, ".*?"),
                    c[0] === "-" ? t.skips.push(new RegExp("^" + c.substr(1) + "$")) : t.names.push(new RegExp("^" + c + "$")));
            for (u = 0; u < t.instances.length; u++) {
                var p = t.instances[u];
                p.enabled = t.enabled(p.namespace)
            }
        }
        function a() {
            t.enable("")
        }
        function s(c) {
            if (c[c.length - 1] === "*")
                return !0;
            var u, f;
            for (u = 0,
                     f = t.skips.length; u < f; u++)
                if (t.skips[u].test(c))
                    return !1;
            for (u = 0,
                     f = t.names.length; u < f; u++)
                if (t.names[u].test(c))
                    return !0;
            return !1
        }
        function l(c) {
            return c instanceof Error ? c.stack || c.message : c
        }
    }
)(Ns, Ns.exports);
(function(e, t) {
        t = e.exports = Ns.exports,
            t.log = o,
            t.formatArgs = n,
            t.save = i,
            t.load = a,
            t.useColors = r,
            t.storage = typeof chrome != "undefined" && typeof chrome.storage != "undefined" ? chrome.storage.local : s(),
            t.colors = ["#0000CC", "#0000FF", "#0033CC", "#0033FF", "#0066CC", "#0066FF", "#0099CC", "#0099FF", "#00CC00", "#00CC33", "#00CC66", "#00CC99", "#00CCCC", "#00CCFF", "#3300CC", "#3300FF", "#3333CC", "#3333FF", "#3366CC", "#3366FF", "#3399CC", "#3399FF", "#33CC00", "#33CC33", "#33CC66", "#33CC99", "#33CCCC", "#33CCFF", "#6600CC", "#6600FF", "#6633CC", "#6633FF", "#66CC00", "#66CC33", "#9900CC", "#9900FF", "#9933CC", "#9933FF", "#99CC00", "#99CC33", "#CC0000", "#CC0033", "#CC0066", "#CC0099", "#CC00CC", "#CC00FF", "#CC3300", "#CC3333", "#CC3366", "#CC3399", "#CC33CC", "#CC33FF", "#CC6600", "#CC6633", "#CC9900", "#CC9933", "#CCCC00", "#CCCC33", "#FF0000", "#FF0033", "#FF0066", "#FF0099", "#FF00CC", "#FF00FF", "#FF3300", "#FF3333", "#FF3366", "#FF3399", "#FF33CC", "#FF33FF", "#FF6600", "#FF6633", "#FF9900", "#FF9933", "#FFCC00", "#FFCC33"];
        function r() {
            return typeof window != "undefined" && window.process && window.process.type === "renderer" ? !0 : typeof navigator != "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/) ? !1 : typeof document != "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window != "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator != "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || typeof navigator != "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/)
        }
        t.formatters.j = function(l) {
            try {
                return JSON.stringify(l)
            } catch (c) {
                return "[UnexpectedJSONParseError]: " + c.message
            }
        }
        ;
        function n(l) {
            var c = this.useColors;
            if (l[0] = (c ? "%c" : "") + this.namespace + (c ? " %c" : " ") + l[0] + (c ? "%c " : " ") + "+" + t.humanize(this.diff),
                !!c) {
                var u = "color: " + this.color;
                l.splice(1, 0, u, "color: inherit");
                var f = 0
                    , d = 0;
                l[0].replace(/%[a-zA-Z%]/g, function(p) {
                    p !== "%%" && (f++,
                    p === "%c" && (d = f))
                }),
                    l.splice(d, 0, u)
            }
        }
        function o() {
            return typeof console == "object" && console.log && Function.prototype.apply.call(console.log, console, arguments)
        }
        function i(l) {
            try {
                l == null ? t.storage.removeItem("debug") : t.storage.debug = l
            } catch {}
        }
        function a() {
            var l;
            try {
                l = t.storage.debug
            } catch {}
            return !l && typeof process != "undefined" && "env"in process && (l = {}.DEBUG),
                l
        }
        t.enable(a());
        function s() {
            try {
                return window.localStorage
            } catch {}
        }
    }
)(pn, pn.exports);
var ny = ed
    , td = pn.exports("socket.io-client:url")
    , oy = iy;
function iy(e, t) {
    var r = e;
    t = t || typeof location != "undefined" && location,
    e == null && (e = t.protocol + "//" + t.host),
    typeof e == "string" && (e.charAt(0) === "/" && (e.charAt(1) === "/" ? e = t.protocol + e : e = t.host + e),
    /^(https?|wss?):\/\//.test(e) || (td("protocol-less url %s", e),
        typeof t != "undefined" ? e = t.protocol + "//" + e : e = "https://" + e),
        td("parse %s", e),
        r = ny(e)),
    r.port || (/^(http|ws)$/.test(r.protocol) ? r.port = "80" : /^(http|ws)s$/.test(r.protocol) && (r.port = "443")),
        r.path = r.path || "/";
    var n = r.host.indexOf(":") !== -1
        , o = n ? "[" + r.host + "]" : r.host;
    return r.id = r.protocol + "://" + o + ":" + r.port,
        r.href = r.protocol + "://" + o + (t && t.port === r.port ? "" : ":" + r.port),
        r
}
var Mi = {}
    , js = {
    exports: {}
}
    , Hs = {
    exports: {}
};
(function(e, t) {
        t = e.exports = n.debug = n.default = n,
            t.coerce = l,
            t.disable = a,
            t.enable = i,
            t.enabled = s,
            t.humanize = Ls,
            t.instances = [],
            t.names = [],
            t.skips = [],
            t.formatters = {};
        function r(c) {
            var u = 0, f;
            for (f in c)
                u = (u << 5) - u + c.charCodeAt(f),
                    u |= 0;
            return t.colors[Math.abs(u) % t.colors.length]
        }
        function n(c) {
            var u;
            function f() {
                if (!!f.enabled) {
                    var d = f
                        , p = +new Date
                        , g = p - (u || p);
                    d.diff = g,
                        d.prev = u,
                        d.curr = p,
                        u = p;
                    for (var m = new Array(arguments.length), h = 0; h < m.length; h++)
                        m[h] = arguments[h];
                    m[0] = t.coerce(m[0]),
                    typeof m[0] != "string" && m.unshift("%O");
                    var v = 0;
                    m[0] = m[0].replace(/%([a-zA-Z%])/g, function(S, b) {
                        if (S === "%%")
                            return S;
                        v++;
                        var O = t.formatters[b];
                        if (typeof O == "function") {
                            var C = m[v];
                            S = O.call(d, C),
                                m.splice(v, 1),
                                v--
                        }
                        return S
                    }),
                        t.formatArgs.call(d, m);
                    var w = f.log || t.log || console.log.bind(console);
                    w.apply(d, m)
                }
            }
            return f.namespace = c,
                f.enabled = t.enabled(c),
                f.useColors = t.useColors(),
                f.color = r(c),
                f.destroy = o,
            typeof t.init == "function" && t.init(f),
                t.instances.push(f),
                f
        }
        function o() {
            var c = t.instances.indexOf(this);
            return c !== -1 ? (t.instances.splice(c, 1),
                !0) : !1
        }
        function i(c) {
            t.save(c),
                t.names = [],
                t.skips = [];
            var u, f = (typeof c == "string" ? c : "").split(/[\s,]+/), d = f.length;
            for (u = 0; u < d; u++)
                !f[u] || (c = f[u].replace(/\*/g, ".*?"),
                    c[0] === "-" ? t.skips.push(new RegExp("^" + c.substr(1) + "$")) : t.names.push(new RegExp("^" + c + "$")));
            for (u = 0; u < t.instances.length; u++) {
                var p = t.instances[u];
                p.enabled = t.enabled(p.namespace)
            }
        }
        function a() {
            t.enable("")
        }
        function s(c) {
            if (c[c.length - 1] === "*")
                return !0;
            var u, f;
            for (u = 0,
                     f = t.skips.length; u < f; u++)
                if (t.skips[u].test(c))
                    return !1;
            for (u = 0,
                     f = t.names.length; u < f; u++)
                if (t.names[u].test(c))
                    return !0;
            return !1
        }
        function l(c) {
            return c instanceof Error ? c.stack || c.message : c
        }
    }
)(Hs, Hs.exports);
(function(e, t) {
        t = e.exports = Hs.exports,
            t.log = o,
            t.formatArgs = n,
            t.save = i,
            t.load = a,
            t.useColors = r,
            t.storage = typeof chrome != "undefined" && typeof chrome.storage != "undefined" ? chrome.storage.local : s(),
            t.colors = ["#0000CC", "#0000FF", "#0033CC", "#0033FF", "#0066CC", "#0066FF", "#0099CC", "#0099FF", "#00CC00", "#00CC33", "#00CC66", "#00CC99", "#00CCCC", "#00CCFF", "#3300CC", "#3300FF", "#3333CC", "#3333FF", "#3366CC", "#3366FF", "#3399CC", "#3399FF", "#33CC00", "#33CC33", "#33CC66", "#33CC99", "#33CCCC", "#33CCFF", "#6600CC", "#6600FF", "#6633CC", "#6633FF", "#66CC00", "#66CC33", "#9900CC", "#9900FF", "#9933CC", "#9933FF", "#99CC00", "#99CC33", "#CC0000", "#CC0033", "#CC0066", "#CC0099", "#CC00CC", "#CC00FF", "#CC3300", "#CC3333", "#CC3366", "#CC3399", "#CC33CC", "#CC33FF", "#CC6600", "#CC6633", "#CC9900", "#CC9933", "#CCCC00", "#CCCC33", "#FF0000", "#FF0033", "#FF0066", "#FF0099", "#FF00CC", "#FF00FF", "#FF3300", "#FF3333", "#FF3366", "#FF3399", "#FF33CC", "#FF33FF", "#FF6600", "#FF6633", "#FF9900", "#FF9933", "#FFCC00", "#FFCC33"];
        function r() {
            return typeof window != "undefined" && window.process && window.process.type === "renderer" ? !0 : typeof navigator != "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/) ? !1 : typeof document != "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window != "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator != "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || typeof navigator != "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/)
        }
        t.formatters.j = function(l) {
            try {
                return JSON.stringify(l)
            } catch (c) {
                return "[UnexpectedJSONParseError]: " + c.message
            }
        }
        ;
        function n(l) {
            var c = this.useColors;
            if (l[0] = (c ? "%c" : "") + this.namespace + (c ? " %c" : " ") + l[0] + (c ? "%c " : " ") + "+" + t.humanize(this.diff),
                !!c) {
                var u = "color: " + this.color;
                l.splice(1, 0, u, "color: inherit");
                var f = 0
                    , d = 0;
                l[0].replace(/%[a-zA-Z%]/g, function(p) {
                    p !== "%%" && (f++,
                    p === "%c" && (d = f))
                }),
                    l.splice(d, 0, u)
            }
        }
        function o() {
            return typeof console == "object" && console.log && Function.prototype.apply.call(console.log, console, arguments)
        }
        function i(l) {
            try {
                l == null ? t.storage.removeItem("debug") : t.storage.debug = l
            } catch {}
        }
        function a() {
            var l;
            try {
                l = t.storage.debug
            } catch {}
            return !l && typeof process != "undefined" && "env"in process && (l = {}.DEBUG),
                l
        }
        t.enable(a());
        function s() {
            try {
                return window.localStorage
            } catch {}
        }
    }
)(js, js.exports);
var Nr = {
    exports: {}
};
(function(e) {
        e.exports = t;
        function t(n) {
            if (n)
                return r(n)
        }
        function r(n) {
            for (var o in t.prototype)
                n[o] = t.prototype[o];
            return n
        }
        t.prototype.on = t.prototype.addEventListener = function(n, o) {
            return this._callbacks = this._callbacks || {},
                (this._callbacks["$" + n] = this._callbacks["$" + n] || []).push(o),
                this
        }
            ,
            t.prototype.once = function(n, o) {
                function i() {
                    this.off(n, i),
                        o.apply(this, arguments)
                }
                return i.fn = o,
                    this.on(n, i),
                    this
            }
            ,
            t.prototype.off = t.prototype.removeListener = t.prototype.removeAllListeners = t.prototype.removeEventListener = function(n, o) {
                if (this._callbacks = this._callbacks || {},
                arguments.length == 0)
                    return this._callbacks = {},
                        this;
                var i = this._callbacks["$" + n];
                if (!i)
                    return this;
                if (arguments.length == 1)
                    return delete this._callbacks["$" + n],
                        this;
                for (var a, s = 0; s < i.length; s++)
                    if (a = i[s],
                    a === o || a.fn === o) {
                        i.splice(s, 1);
                        break
                    }
                return i.length === 0 && delete this._callbacks["$" + n],
                    this
            }
            ,
            t.prototype.emit = function(n) {
                this._callbacks = this._callbacks || {};
                for (var o = new Array(arguments.length - 1), i = this._callbacks["$" + n], a = 1; a < arguments.length; a++)
                    o[a - 1] = arguments[a];
                if (i) {
                    i = i.slice(0);
                    for (var a = 0, s = i.length; a < s; ++a)
                        i[a].apply(this, o)
                }
                return this
            }
            ,
            t.prototype.listeners = function(n) {
                return this._callbacks = this._callbacks || {},
                this._callbacks["$" + n] || []
            }
            ,
            t.prototype.hasListeners = function(n) {
                return !!this.listeners(n).length
            }
    }
)(Nr);
var Ri = {}
    , ay = {}.toString
    , Us = Array.isArray || function(e) {
    return ay.call(e) == "[object Array]"
}
    , rd = cy
    , sy = typeof Buffer == "function" && typeof Buffer.isBuffer == "function"
    , ly = typeof ArrayBuffer == "function"
    , uy = function(e) {
    return typeof ArrayBuffer.isView == "function" ? ArrayBuffer.isView(e) : e.buffer instanceof ArrayBuffer
};
function cy(e) {
    return sy && Buffer.isBuffer(e) || ly && (e instanceof ArrayBuffer || uy(e))
}
var Ws = Us
    , nd = rd
    , od = Object.prototype.toString
    , fy = typeof Blob == "function" || typeof Blob != "undefined" && od.call(Blob) === "[object BlobConstructor]"
    , dy = typeof File == "function" || typeof File != "undefined" && od.call(File) === "[object FileConstructor]";
Ri.deconstructPacket = function(e) {
    var t = []
        , r = e.data
        , n = e;
    return n.data = qs(r, t),
        n.attachments = t.length,
        {
            packet: n,
            buffers: t
        }
}
;
function qs(e, t) {
    if (!e)
        return e;
    if (nd(e)) {
        var r = {
            _placeholder: !0,
            num: t.length
        };
        return t.push(e),
            r
    } else if (Ws(e)) {
        for (var n = new Array(e.length), o = 0; o < e.length; o++)
            n[o] = qs(e[o], t);
        return n
    } else if (typeof e == "object" && !(e instanceof Date)) {
        var n = {};
        for (var i in e)
            n[i] = qs(e[i], t);
        return n
    }
    return e
}
Ri.reconstructPacket = function(e, t) {
    return e.data = zs(e.data, t),
        e.attachments = void 0,
        e
}
;
function zs(e, t) {
    if (!e)
        return e;
    if (e && e._placeholder)
        return t[e.num];
    if (Ws(e))
        for (var r = 0; r < e.length; r++)
            e[r] = zs(e[r], t);
    else if (typeof e == "object")
        for (var n in e)
            e[n] = zs(e[n], t);
    return e
}
Ri.removeBlobs = function(e, t) {
    function r(i, a, s) {
        if (!i)
            return i;
        if (fy && i instanceof Blob || dy && i instanceof File) {
            n++;
            var l = new FileReader;
            l.onload = function() {
                s ? s[a] = this.result : o = this.result,
                --n || t(o)
            }
                ,
                l.readAsArrayBuffer(i)
        } else if (Ws(i))
            for (var c = 0; c < i.length; c++)
                r(i[c], c, i);
        else if (typeof i == "object" && !nd(i))
            for (var u in i)
                r(i[u], u, i)
    }
    var n = 0
        , o = e;
    r(o),
    n || t(o)
}
;
(function(e) {
        var t = js.exports("socket.io-parser")
            , r = Nr.exports
            , n = Ri
            , o = Us
            , i = rd;
        e.protocol = 4,
            e.types = ["CONNECT", "DISCONNECT", "EVENT", "ACK", "ERROR", "BINARY_EVENT", "BINARY_ACK"],
            e.CONNECT = 0,
            e.DISCONNECT = 1,
            e.EVENT = 2,
            e.ACK = 3,
            e.ERROR = 4,
            e.BINARY_EVENT = 5,
            e.BINARY_ACK = 6,
            e.Encoder = a,
            e.Decoder = f;
        function a() {}
        var s = e.ERROR + '"encode error"';
        a.prototype.encode = function(h, v) {
            if (t("encoding packet %j", h),
            e.BINARY_EVENT === h.type || e.BINARY_ACK === h.type)
                u(h, v);
            else {
                var w = l(h);
                v([w])
            }
        }
        ;
        function l(h) {
            var v = "" + h.type;
            if ((e.BINARY_EVENT === h.type || e.BINARY_ACK === h.type) && (v += h.attachments + "-"),
            h.nsp && h.nsp !== "/" && (v += h.nsp + ","),
            h.id != null && (v += h.id),
            h.data != null) {
                var w = c(h.data);
                if (w !== !1)
                    v += w;
                else
                    return s
            }
            return t("encoded %j as %s", h, v),
                v
        }
        function c(h) {
            try {
                return JSON.stringify(h)
            } catch {
                return !1
            }
        }
        function u(h, v) {
            function w(S) {
                var b = n.deconstructPacket(S)
                    , O = l(b.packet)
                    , C = b.buffers;
                C.unshift(O),
                    v(C)
            }
            n.removeBlobs(h, w)
        }
        function f() {
            this.reconstructor = null
        }
        r(f.prototype),
            f.prototype.add = function(h) {
                var v;
                if (typeof h == "string")
                    v = d(h),
                        e.BINARY_EVENT === v.type || e.BINARY_ACK === v.type ? (this.reconstructor = new g(v),
                        this.reconstructor.reconPack.attachments === 0 && this.emit("decoded", v)) : this.emit("decoded", v);
                else if (i(h) || h.base64)
                    if (this.reconstructor)
                        v = this.reconstructor.takeBinaryData(h),
                        v && (this.reconstructor = null,
                            this.emit("decoded", v));
                    else
                        throw new Error("got binary data when not reconstructing a packet");
                else
                    throw new Error("Unknown type: " + h)
            }
        ;
        function d(h) {
            var v = 0
                , w = {
                type: Number(h.charAt(0))
            };
            if (e.types[w.type] == null)
                return m("unknown packet type " + w.type);
            if (e.BINARY_EVENT === w.type || e.BINARY_ACK === w.type) {
                for (var S = v + 1; h.charAt(++v) !== "-" && v != h.length; )
                    ;
                var b = h.substring(S, v);
                if (b != Number(b) || h.charAt(v) !== "-")
                    throw new Error("Illegal attachments");
                w.attachments = Number(b)
            }
            if (h.charAt(v + 1) === "/") {
                for (var S = v + 1; ++v; ) {
                    var O = h.charAt(v);
                    if (O === "," || v === h.length)
                        break
                }
                w.nsp = h.substring(S, v)
            } else
                w.nsp = "/";
            var C = h.charAt(v + 1);
            if (C !== "" && Number(C) == C) {
                for (var S = v + 1; ++v; ) {
                    var O = h.charAt(v);
                    if (O == null || Number(O) != O) {
                        --v;
                        break
                    }
                    if (v === h.length)
                        break
                }
                w.id = Number(h.substring(S, v + 1))
            }
            if (h.charAt(++v)) {
                var _ = p(h.substr(v))
                    , E = _ !== !1 && (w.type === e.ERROR || o(_));
                if (E)
                    w.data = _;
                else
                    return m("invalid payload")
            }
            return t("decoded %s as %j", h, w),
                w
        }
        function p(h) {
            try {
                return JSON.parse(h)
            } catch {
                return !1
            }
        }
        f.prototype.destroy = function() {
            this.reconstructor && this.reconstructor.finishedReconstruction()
        }
        ;
        function g(h) {
            this.reconPack = h,
                this.buffers = []
        }
        g.prototype.takeBinaryData = function(h) {
            if (this.buffers.push(h),
            this.buffers.length === this.reconPack.attachments) {
                var v = n.reconstructPacket(this.reconPack, this.buffers);
                return this.finishedReconstruction(),
                    v
            }
            return null
        }
            ,
            g.prototype.finishedReconstruction = function() {
                this.reconPack = null,
                    this.buffers = []
            }
        ;
        function m(h) {
            return {
                type: e.ERROR,
                data: "parser error: " + h
            }
        }
    }
)(Mi);
var Vs = {
    exports: {}
}
    , Ii = {}
    , Ks = {
    exports: {}
};
try {
    Ks.exports = typeof XMLHttpRequest != "undefined" && "withCredentials"in new XMLHttpRequest
} catch {
    Ks.exports = !1
}
var py = Le
    , hy = Ks.exports
    , vy = py
    , Gs = function(e) {
    var t = e.xdomain
        , r = e.xscheme
        , n = e.enablesXDR;
    try {
        if (typeof XMLHttpRequest != "undefined" && (!t || hy))
            return new XMLHttpRequest
    } catch {}
    try {
        if (typeof XDomainRequest != "undefined" && !r && n)
            return new XDomainRequest
    } catch {}
    if (!t)
        try {
            return new vy[["Active"].concat("Object").join("X")]("Microsoft.XMLHTTP")
        } catch {}
}
    , Ys = {
    exports: {}
}
    , Lr = {}
    , my = Object.keys || function(t) {
    var r = []
        , n = Object.prototype.hasOwnProperty;
    for (var o in t)
        n.call(t, o) && r.push(o);
    return r
}
    , gy = Us
    , id = Object.prototype.toString
    , yy = typeof Blob == "function" || typeof Blob != "undefined" && id.call(Blob) === "[object BlobConstructor]"
    , by = typeof File == "function" || typeof File != "undefined" && id.call(File) === "[object FileConstructor]"
    , ad = Di;
function Di(e) {
    if (!e || typeof e != "object")
        return !1;
    if (gy(e)) {
        for (var t = 0, r = e.length; t < r; t++)
            if (Di(e[t]))
                return !0;
        return !1
    }
    if (typeof Buffer == "function" && Buffer.isBuffer && Buffer.isBuffer(e) || typeof ArrayBuffer == "function" && e instanceof ArrayBuffer || yy && e instanceof Blob || by && e instanceof File)
        return !0;
    if (e.toJSON && typeof e.toJSON == "function" && arguments.length === 1)
        return Di(e.toJSON(), !0);
    for (var n in e)
        if (Object.prototype.hasOwnProperty.call(e, n) && Di(e[n]))
            return !0;
    return !1
}
var wy = function(e, t, r) {
    var n = e.byteLength;
    if (t = t || 0,
        r = r || n,
        e.slice)
        return e.slice(t, r);
    if (t < 0 && (t += n),
    r < 0 && (r += n),
    r > n && (r = n),
    t >= n || t >= r || n === 0)
        return new ArrayBuffer(0);
    for (var o = new Uint8Array(e), i = new Uint8Array(r - t), a = t, s = 0; a < r; a++,
        s++)
        i[s] = o[a];
    return i.buffer
}
    , Cy = _y;
function _y(e, t, r) {
    var n = !1;
    return r = r || xy,
        o.count = e,
        e === 0 ? t() : o;
    function o(i, a) {
        if (o.count <= 0)
            throw new Error("after called too many times");
        --o.count,
            i ? (n = !0,
                t(i),
                t = r) : o.count === 0 && !n && t(null, a)
    }
}
function xy() {}
/*! https://mths.be/utf8js v2.1.2 by @mathias */
var lr = String.fromCharCode;
function sd(e) {
    for (var t = [], r = 0, n = e.length, o, i; r < n; )
        o = e.charCodeAt(r++),
            o >= 55296 && o <= 56319 && r < n ? (i = e.charCodeAt(r++),
                (i & 64512) == 56320 ? t.push(((o & 1023) << 10) + (i & 1023) + 65536) : (t.push(o),
                    r--)) : t.push(o);
    return t
}
function Sy(e) {
    for (var t = e.length, r = -1, n, o = ""; ++r < t; )
        n = e[r],
        n > 65535 && (n -= 65536,
            o += lr(n >>> 10 & 1023 | 55296),
            n = 56320 | n & 1023),
            o += lr(n);
    return o
}
function ld(e, t) {
    if (e >= 55296 && e <= 57343) {
        if (t)
            throw Error("Lone surrogate U+" + e.toString(16).toUpperCase() + " is not a scalar value");
        return !1
    }
    return !0
}
function Xs(e, t) {
    return lr(e >> t & 63 | 128)
}
function Oy(e, t) {
    if ((e & 4294967168) == 0)
        return lr(e);
    var r = "";
    return (e & 4294965248) == 0 ? r = lr(e >> 6 & 31 | 192) : (e & 4294901760) == 0 ? (ld(e, t) || (e = 65533),
        r = lr(e >> 12 & 15 | 224),
        r += Xs(e, 6)) : (e & 4292870144) == 0 && (r = lr(e >> 18 & 7 | 240),
        r += Xs(e, 12),
        r += Xs(e, 6)),
        r += lr(e & 63 | 128),
        r
}
function Ey(e, t) {
    t = t || {};
    for (var r = t.strict !== !1, n = sd(e), o = n.length, i = -1, a, s = ""; ++i < o; )
        a = n[i],
            s += Oy(a, r);
    return s
}
function hn() {
    if (ur >= Ni)
        throw Error("Invalid byte index");
    var e = Bi[ur] & 255;
    if (ur++,
    (e & 192) == 128)
        return e & 63;
    throw Error("Invalid continuation byte")
}
function Fy(e) {
    var t, r, n, o, i;
    if (ur > Ni)
        throw Error("Invalid byte index");
    if (ur == Ni)
        return !1;
    if (t = Bi[ur] & 255,
        ur++,
    (t & 128) == 0)
        return t;
    if ((t & 224) == 192) {
        if (r = hn(),
            i = (t & 31) << 6 | r,
        i >= 128)
            return i;
        throw Error("Invalid continuation byte")
    }
    if ((t & 240) == 224) {
        if (r = hn(),
            n = hn(),
            i = (t & 15) << 12 | r << 6 | n,
        i >= 2048)
            return ld(i, e) ? i : 65533;
        throw Error("Invalid continuation byte")
    }
    if ((t & 248) == 240 && (r = hn(),
        n = hn(),
        o = hn(),
        i = (t & 7) << 18 | r << 12 | n << 6 | o,
    i >= 65536 && i <= 1114111))
        return i;
    throw Error("Invalid UTF-8 detected")
}
var Bi, Ni, ur;
function Ay(e, t) {
    t = t || {};
    var r = t.strict !== !1;
    Bi = sd(e),
        Ni = Bi.length,
        ur = 0;
    for (var n = [], o; (o = Fy(r)) !== !1; )
        n.push(o);
    return Sy(n)
}
var ky = {
    version: "2.1.2",
    encode: Ey,
    decode: Ay
}
    , Js = {};
(function(e) {
        Js.encode = function(t) {
            var r = new Uint8Array(t), n, o = r.length, i = "";
            for (n = 0; n < o; n += 3)
                i += e[r[n] >> 2],
                    i += e[(r[n] & 3) << 4 | r[n + 1] >> 4],
                    i += e[(r[n + 1] & 15) << 2 | r[n + 2] >> 6],
                    i += e[r[n + 2] & 63];
            return o % 3 == 2 ? i = i.substring(0, i.length - 1) + "=" : o % 3 == 1 && (i = i.substring(0, i.length - 2) + "=="),
                i
        }
            ,
            Js.decode = function(t) {
                var r = t.length * .75, n = t.length, o, i = 0, a, s, l, c;
                t[t.length - 1] === "=" && (r--,
                t[t.length - 2] === "=" && r--);
                var u = new ArrayBuffer(r)
                    , f = new Uint8Array(u);
                for (o = 0; o < n; o += 4)
                    a = e.indexOf(t[o]),
                        s = e.indexOf(t[o + 1]),
                        l = e.indexOf(t[o + 2]),
                        c = e.indexOf(t[o + 3]),
                        f[i++] = a << 2 | s >> 4,
                        f[i++] = (s & 15) << 4 | l >> 2,
                        f[i++] = (l & 3) << 6 | c & 63;
                return u
            }
    }
)("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
var vn = typeof vn != "undefined" ? vn : typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : typeof MSBlobBuilder != "undefined" ? MSBlobBuilder : typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : !1
    , ud = function() {
    try {
        var e = new Blob(["hi"]);
        return e.size === 2
    } catch {
        return !1
    }
}()
    , Py = ud && function() {
    try {
        var e = new Blob([new Uint8Array([1, 2])]);
        return e.size === 2
    } catch {
        return !1
    }
}()
    , Ty = vn && vn.prototype.append && vn.prototype.getBlob;
function cd(e) {
    return e.map(function(t) {
        if (t.buffer instanceof ArrayBuffer) {
            var r = t.buffer;
            if (t.byteLength !== r.byteLength) {
                var n = new Uint8Array(t.byteLength);
                n.set(new Uint8Array(r,t.byteOffset,t.byteLength)),
                    r = n.buffer
            }
            return r
        }
        return t
    })
}
function fd(e, t) {
    t = t || {};
    var r = new vn;
    return cd(e).forEach(function(n) {
        r.append(n)
    }),
        t.type ? r.getBlob(t.type) : r.getBlob()
}
function dd(e, t) {
    return new Blob(cd(e),t || {})
}
typeof Blob != "undefined" && (fd.prototype = Blob.prototype,
    dd.prototype = Blob.prototype);
var $y = function() {
    return ud ? Py ? Blob : dd : Ty ? fd : void 0
}();
(function(e) {
        var t = my, r = ad, n = wy, o = Cy, i = ky, a;
        typeof ArrayBuffer != "undefined" && (a = Js);
        var s = typeof navigator != "undefined" && /Android/i.test(navigator.userAgent)
            , l = typeof navigator != "undefined" && /PhantomJS/i.test(navigator.userAgent)
            , c = s || l;
        e.protocol = 3;
        var u = e.packets = {
            open: 0,
            close: 1,
            ping: 2,
            pong: 3,
            message: 4,
            upgrade: 5,
            noop: 6
        }
            , f = t(u)
            , d = {
            type: "error",
            data: "parser error"
        }
            , p = $y;
        e.encodePacket = function(b, O, C, _) {
            typeof O == "function" && (_ = O,
                O = !1),
            typeof C == "function" && (_ = C,
                C = null);
            var E = b.data === void 0 ? void 0 : b.data.buffer || b.data;
            if (typeof ArrayBuffer != "undefined" && E instanceof ArrayBuffer)
                return m(b, O, _);
            if (typeof p != "undefined" && E instanceof p)
                return v(b, O, _);
            if (E && E.base64)
                return g(b, _);
            var A = u[b.type];
            return b.data !== void 0 && (A += C ? i.encode(String(b.data), {
                strict: !1
            }) : String(b.data)),
                _("" + A)
        }
        ;
        function g(b, O) {
            var C = "b" + e.packets[b.type] + b.data.data;
            return O(C)
        }
        function m(b, O, C) {
            if (!O)
                return e.encodeBase64Packet(b, C);
            var _ = b.data
                , E = new Uint8Array(_)
                , A = new Uint8Array(1 + _.byteLength);
            A[0] = u[b.type];
            for (var M = 0; M < E.length; M++)
                A[M + 1] = E[M];
            return C(A.buffer)
        }
        function h(b, O, C) {
            if (!O)
                return e.encodeBase64Packet(b, C);
            var _ = new FileReader;
            return _.onload = function() {
                e.encodePacket({
                    type: b.type,
                    data: _.result
                }, O, !0, C)
            }
                ,
                _.readAsArrayBuffer(b.data)
        }
        function v(b, O, C) {
            if (!O)
                return e.encodeBase64Packet(b, C);
            if (c)
                return h(b, O, C);
            var _ = new Uint8Array(1);
            _[0] = u[b.type];
            var E = new p([_.buffer, b.data]);
            return C(E)
        }
        e.encodeBase64Packet = function(b, O) {
            var C = "b" + e.packets[b.type];
            if (typeof p != "undefined" && b.data instanceof p) {
                var _ = new FileReader;
                return _.onload = function() {
                    var F = _.result.split(",")[1];
                    O(C + F)
                }
                    ,
                    _.readAsDataURL(b.data)
            }
            var E;
            try {
                E = String.fromCharCode.apply(null, new Uint8Array(b.data))
            } catch {
                for (var A = new Uint8Array(b.data), M = new Array(A.length), I = 0; I < A.length; I++)
                    M[I] = A[I];
                E = String.fromCharCode.apply(null, M)
            }
            return C += btoa(E),
                O(C)
        }
            ,
            e.decodePacket = function(b, O, C) {
                if (b === void 0)
                    return d;
                if (typeof b == "string") {
                    if (b.charAt(0) === "b")
                        return e.decodeBase64Packet(b.substr(1), O);
                    if (C && (b = w(b),
                    b === !1))
                        return d;
                    var E = b.charAt(0);
                    return Number(E) != E || !f[E] ? d : b.length > 1 ? {
                        type: f[E],
                        data: b.substring(1)
                    } : {
                        type: f[E]
                    }
                }
                var _ = new Uint8Array(b)
                    , E = _[0]
                    , A = n(b, 1);
                return p && O === "blob" && (A = new p([A])),
                    {
                        type: f[E],
                        data: A
                    }
            }
        ;
        function w(b) {
            try {
                b = i.decode(b, {
                    strict: !1
                })
            } catch {
                return !1
            }
            return b
        }
        e.decodeBase64Packet = function(b, O) {
            var C = f[b.charAt(0)];
            if (!a)
                return {
                    type: C,
                    data: {
                        base64: !0,
                        data: b.substr(1)
                    }
                };
            var _ = a.decode(b.substr(1));
            return O === "blob" && p && (_ = new p([_])),
                {
                    type: C,
                    data: _
                }
        }
            ,
            e.encodePayload = function(b, O, C) {
                typeof O == "function" && (C = O,
                    O = null);
                var _ = r(b);
                if (O && _)
                    return p && !c ? e.encodePayloadAsBlob(b, C) : e.encodePayloadAsArrayBuffer(b, C);
                if (!b.length)
                    return C("0:");
                function E(M) {
                    return M.length + ":" + M
                }
                function A(M, I) {
                    e.encodePacket(M, _ ? O : !1, !1, function(F) {
                        I(null, E(F))
                    })
                }
                S(b, A, function(M, I) {
                    return C(I.join(""))
                })
            }
        ;
        function S(b, O, C) {
            for (var _ = new Array(b.length), E = o(b.length, C), A = function(I, F, B) {
                O(F, function(K, oe) {
                    _[I] = oe,
                        B(K, _)
                })
            }, M = 0; M < b.length; M++)
                A(M, b[M], E)
        }
        e.decodePayload = function(b, O, C) {
            if (typeof b != "string")
                return e.decodePayloadAsBinary(b, O, C);
            typeof O == "function" && (C = O,
                O = null);
            var _;
            if (b === "")
                return C(d, 0, 1);
            for (var E = "", A, M, I = 0, F = b.length; I < F; I++) {
                var B = b.charAt(I);
                if (B !== ":") {
                    E += B;
                    continue
                }
                if (E === "" || E != (A = Number(E)) || (M = b.substr(I + 1, A),
                E != M.length))
                    return C(d, 0, 1);
                if (M.length) {
                    if (_ = e.decodePacket(M, O, !1),
                    d.type === _.type && d.data === _.data)
                        return C(d, 0, 1);
                    var K = C(_, I + A, F);
                    if (K === !1)
                        return
                }
                I += A,
                    E = ""
            }
            if (E !== "")
                return C(d, 0, 1)
        }
            ,
            e.encodePayloadAsArrayBuffer = function(b, O) {
                if (!b.length)
                    return O(new ArrayBuffer(0));
                function C(_, E) {
                    e.encodePacket(_, !0, !0, function(A) {
                        return E(null, A)
                    })
                }
                S(b, C, function(_, E) {
                    var A = E.reduce(function(F, B) {
                        var K;
                        return typeof B == "string" ? K = B.length : K = B.byteLength,
                        F + K.toString().length + K + 2
                    }, 0)
                        , M = new Uint8Array(A)
                        , I = 0;
                    return E.forEach(function(F) {
                        var B = typeof F == "string"
                            , K = F;
                        if (B) {
                            for (var ne = new Uint8Array(F.length), oe = 0; oe < F.length; oe++)
                                ne[oe] = F.charCodeAt(oe);
                            K = ne.buffer
                        }
                        B ? M[I++] = 0 : M[I++] = 1;
                        for (var ee = K.byteLength.toString(), oe = 0; oe < ee.length; oe++)
                            M[I++] = parseInt(ee[oe]);
                        M[I++] = 255;
                        for (var ne = new Uint8Array(K), oe = 0; oe < ne.length; oe++)
                            M[I++] = ne[oe]
                    }),
                        O(M.buffer)
                })
            }
            ,
            e.encodePayloadAsBlob = function(b, O) {
                function C(_, E) {
                    e.encodePacket(_, !0, !0, function(A) {
                        var M = new Uint8Array(1);
                        if (M[0] = 1,
                        typeof A == "string") {
                            for (var I = new Uint8Array(A.length), F = 0; F < A.length; F++)
                                I[F] = A.charCodeAt(F);
                            A = I.buffer,
                                M[0] = 0
                        }
                        for (var B = A instanceof ArrayBuffer ? A.byteLength : A.size, K = B.toString(), oe = new Uint8Array(K.length + 1), F = 0; F < K.length; F++)
                            oe[F] = parseInt(K[F]);
                        if (oe[K.length] = 255,
                            p) {
                            var ee = new p([M.buffer, oe.buffer, A]);
                            E(null, ee)
                        }
                    })
                }
                S(b, C, function(_, E) {
                    return O(new p(E))
                })
            }
            ,
            e.decodePayloadAsBinary = function(b, O, C) {
                typeof O == "function" && (C = O,
                    O = null);
                for (var _ = b, E = []; _.byteLength > 0; ) {
                    for (var A = new Uint8Array(_), M = A[0] === 0, I = "", F = 1; A[F] !== 255; F++) {
                        if (I.length > 310)
                            return C(d, 0, 1);
                        I += A[F]
                    }
                    _ = n(_, 2 + I.length),
                        I = parseInt(I);
                    var B = n(_, 0, I);
                    if (M)
                        try {
                            B = String.fromCharCode.apply(null, new Uint8Array(B))
                        } catch {
                            var K = new Uint8Array(B);
                            B = "";
                            for (var F = 0; F < K.length; F++)
                                B += String.fromCharCode(K[F])
                        }
                    E.push(B),
                        _ = n(_, I)
                }
                var oe = E.length;
                E.forEach(function(ee, ne) {
                    C(e.decodePacket(ee, O, !0), ne, oe)
                })
            }
    }
)(Lr);
var My = Lr
    , Ry = Nr.exports
    , Qs = Lt;
function Lt(e) {
    this.path = e.path,
        this.hostname = e.hostname,
        this.port = e.port,
        this.secure = e.secure,
        this.query = e.query,
        this.timestampParam = e.timestampParam,
        this.timestampRequests = e.timestampRequests,
        this.readyState = "",
        this.agent = e.agent || !1,
        this.socket = e.socket,
        this.enablesXDR = e.enablesXDR,
        this.withCredentials = e.withCredentials,
        this.pfx = e.pfx,
        this.key = e.key,
        this.passphrase = e.passphrase,
        this.cert = e.cert,
        this.ca = e.ca,
        this.ciphers = e.ciphers,
        this.rejectUnauthorized = e.rejectUnauthorized,
        this.forceNode = e.forceNode,
        this.isReactNative = e.isReactNative,
        this.extraHeaders = e.extraHeaders,
        this.localAddress = e.localAddress
}
Ry(Lt.prototype);
Lt.prototype.onError = function(e, t) {
    var r = new Error(e);
    return r.type = "TransportError",
        r.description = t,
        this.emit("error", r),
        this
}
;
Lt.prototype.open = function() {
    return (this.readyState === "closed" || this.readyState === "") && (this.readyState = "opening",
        this.doOpen()),
        this
}
;
Lt.prototype.close = function() {
    return (this.readyState === "opening" || this.readyState === "open") && (this.doClose(),
        this.onClose()),
        this
}
;
Lt.prototype.send = function(e) {
    if (this.readyState === "open")
        this.write(e);
    else
        throw new Error("Transport not open")
}
;
Lt.prototype.onOpen = function() {
    this.readyState = "open",
        this.writable = !0,
        this.emit("open")
}
;
Lt.prototype.onData = function(e) {
    var t = My.decodePacket(e, this.socket.binaryType);
    this.onPacket(t)
}
;
Lt.prototype.onPacket = function(e) {
    this.emit("packet", e)
}
;
Lt.prototype.onClose = function() {
    this.readyState = "closed",
        this.emit("close")
}
;
var mn = {};
mn.encode = function(e) {
    var t = "";
    for (var r in e)
        e.hasOwnProperty(r) && (t.length && (t += "&"),
            t += encodeURIComponent(r) + "=" + encodeURIComponent(e[r]));
    return t
}
;
mn.decode = function(e) {
    for (var t = {}, r = e.split("&"), n = 0, o = r.length; n < o; n++) {
        var i = r[n].split("=");
        t[decodeURIComponent(i[0])] = decodeURIComponent(i[1])
    }
    return t
}
;
var Li = function(e, t) {
    var r = function() {};
    r.prototype = t.prototype,
        e.prototype = new r,
        e.prototype.constructor = e
}, pd = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_".split(""), ji = 64, hd = {}, vd = 0, cr = 0, md;
function Zs(e) {
    var t = "";
    do
        t = pd[e % ji] + t,
            e = Math.floor(e / ji);
    while (e > 0);
    return t
}
function Iy(e) {
    var t = 0;
    for (cr = 0; cr < e.length; cr++)
        t = t * ji + hd[e.charAt(cr)];
    return t
}
function el() {
    var e = Zs(+new Date);
    return e !== md ? (vd = 0,
        md = e) : e + "." + Zs(vd++)
}
for (; cr < ji; cr++)
    hd[pd[cr]] = cr;
el.encode = Zs;
el.decode = Iy;
var gd = el
    , gn = {
    exports: {}
}
    , tl = {
    exports: {}
};
(function(e, t) {
        t = e.exports = n.debug = n.default = n,
            t.coerce = l,
            t.disable = a,
            t.enable = i,
            t.enabled = s,
            t.humanize = Ls,
            t.instances = [],
            t.names = [],
            t.skips = [],
            t.formatters = {};
        function r(c) {
            var u = 0, f;
            for (f in c)
                u = (u << 5) - u + c.charCodeAt(f),
                    u |= 0;
            return t.colors[Math.abs(u) % t.colors.length]
        }
        function n(c) {
            var u;
            function f() {
                if (!!f.enabled) {
                    var d = f
                        , p = +new Date
                        , g = p - (u || p);
                    d.diff = g,
                        d.prev = u,
                        d.curr = p,
                        u = p;
                    for (var m = new Array(arguments.length), h = 0; h < m.length; h++)
                        m[h] = arguments[h];
                    m[0] = t.coerce(m[0]),
                    typeof m[0] != "string" && m.unshift("%O");
                    var v = 0;
                    m[0] = m[0].replace(/%([a-zA-Z%])/g, function(S, b) {
                        if (S === "%%")
                            return S;
                        v++;
                        var O = t.formatters[b];
                        if (typeof O == "function") {
                            var C = m[v];
                            S = O.call(d, C),
                                m.splice(v, 1),
                                v--
                        }
                        return S
                    }),
                        t.formatArgs.call(d, m);
                    var w = f.log || t.log || console.log.bind(console);
                    w.apply(d, m)
                }
            }
            return f.namespace = c,
                f.enabled = t.enabled(c),
                f.useColors = t.useColors(),
                f.color = r(c),
                f.destroy = o,
            typeof t.init == "function" && t.init(f),
                t.instances.push(f),
                f
        }
        function o() {
            var c = t.instances.indexOf(this);
            return c !== -1 ? (t.instances.splice(c, 1),
                !0) : !1
        }
        function i(c) {
            t.save(c),
                t.names = [],
                t.skips = [];
            var u, f = (typeof c == "string" ? c : "").split(/[\s,]+/), d = f.length;
            for (u = 0; u < d; u++)
                !f[u] || (c = f[u].replace(/\*/g, ".*?"),
                    c[0] === "-" ? t.skips.push(new RegExp("^" + c.substr(1) + "$")) : t.names.push(new RegExp("^" + c + "$")));
            for (u = 0; u < t.instances.length; u++) {
                var p = t.instances[u];
                p.enabled = t.enabled(p.namespace)
            }
        }
        function a() {
            t.enable("")
        }
        function s(c) {
            if (c[c.length - 1] === "*")
                return !0;
            var u, f;
            for (u = 0,
                     f = t.skips.length; u < f; u++)
                if (t.skips[u].test(c))
                    return !1;
            for (u = 0,
                     f = t.names.length; u < f; u++)
                if (t.names[u].test(c))
                    return !0;
            return !1
        }
        function l(c) {
            return c instanceof Error ? c.stack || c.message : c
        }
    }
)(tl, tl.exports);
(function(e, t) {
        t = e.exports = tl.exports,
            t.log = o,
            t.formatArgs = n,
            t.save = i,
            t.load = a,
            t.useColors = r,
            t.storage = typeof chrome != "undefined" && typeof chrome.storage != "undefined" ? chrome.storage.local : s(),
            t.colors = ["#0000CC", "#0000FF", "#0033CC", "#0033FF", "#0066CC", "#0066FF", "#0099CC", "#0099FF", "#00CC00", "#00CC33", "#00CC66", "#00CC99", "#00CCCC", "#00CCFF", "#3300CC", "#3300FF", "#3333CC", "#3333FF", "#3366CC", "#3366FF", "#3399CC", "#3399FF", "#33CC00", "#33CC33", "#33CC66", "#33CC99", "#33CCCC", "#33CCFF", "#6600CC", "#6600FF", "#6633CC", "#6633FF", "#66CC00", "#66CC33", "#9900CC", "#9900FF", "#9933CC", "#9933FF", "#99CC00", "#99CC33", "#CC0000", "#CC0033", "#CC0066", "#CC0099", "#CC00CC", "#CC00FF", "#CC3300", "#CC3333", "#CC3366", "#CC3399", "#CC33CC", "#CC33FF", "#CC6600", "#CC6633", "#CC9900", "#CC9933", "#CCCC00", "#CCCC33", "#FF0000", "#FF0033", "#FF0066", "#FF0099", "#FF00CC", "#FF00FF", "#FF3300", "#FF3333", "#FF3366", "#FF3399", "#FF33CC", "#FF33FF", "#FF6600", "#FF6633", "#FF9900", "#FF9933", "#FFCC00", "#FFCC33"];
        function r() {
            return typeof window != "undefined" && window.process && window.process.type === "renderer" ? !0 : typeof navigator != "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/) ? !1 : typeof document != "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window != "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator != "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || typeof navigator != "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/)
        }
        t.formatters.j = function(l) {
            try {
                return JSON.stringify(l)
            } catch (c) {
                return "[UnexpectedJSONParseError]: " + c.message
            }
        }
        ;
        function n(l) {
            var c = this.useColors;
            if (l[0] = (c ? "%c" : "") + this.namespace + (c ? " %c" : " ") + l[0] + (c ? "%c " : " ") + "+" + t.humanize(this.diff),
                !!c) {
                var u = "color: " + this.color;
                l.splice(1, 0, u, "color: inherit");
                var f = 0
                    , d = 0;
                l[0].replace(/%[a-zA-Z%]/g, function(p) {
                    p !== "%%" && (f++,
                    p === "%c" && (d = f))
                }),
                    l.splice(d, 0, u)
            }
        }
        function o() {
            return typeof console == "object" && console.log && Function.prototype.apply.call(console.log, console, arguments)
        }
        function i(l) {
            try {
                l == null ? t.storage.removeItem("debug") : t.storage.debug = l
            } catch {}
        }
        function a() {
            var l;
            try {
                l = t.storage.debug
            } catch {}
            return !l && typeof process != "undefined" && "env"in process && (l = {}.DEBUG),
                l
        }
        t.enable(a());
        function s() {
            try {
                return window.localStorage
            } catch {}
        }
    }
)(gn, gn.exports);
var yd = Qs
    , Dy = mn
    , bd = Lr
    , By = Li
    , Ny = gd
    , $t = gn.exports("engine.io-client:polling")
    , wd = jt
    , Ly = function() {
    var e = Gs
        , t = new e({
        xdomain: !1
    });
    return t.responseType != null
}();
function jt(e) {
    var t = e && e.forceBase64;
    (!Ly || t) && (this.supportsBinary = !1),
        yd.call(this, e)
}
By(jt, yd);
jt.prototype.name = "polling";
jt.prototype.doOpen = function() {
    this.poll()
}
;
jt.prototype.pause = function(e) {
    var t = this;
    this.readyState = "pausing";
    function r() {
        $t("paused"),
            t.readyState = "paused",
            e()
    }
    if (this.polling || !this.writable) {
        var n = 0;
        this.polling && ($t("we are currently polling - waiting to pause"),
            n++,
            this.once("pollComplete", function() {
                $t("pre-pause polling complete"),
                --n || r()
            })),
        this.writable || ($t("we are currently writing - waiting to pause"),
            n++,
            this.once("drain", function() {
                $t("pre-pause writing complete"),
                --n || r()
            }))
    } else
        r()
}
;
jt.prototype.poll = function() {
    $t("polling"),
        this.polling = !0,
        this.doPoll(),
        this.emit("poll")
}
;
jt.prototype.onData = function(e) {
    var t = this;
    $t("polling got data %s", e);
    var r = function(n, o, i) {
        if (t.readyState === "opening" && n.type === "open" && t.onOpen(),
        n.type === "close")
            return t.onClose(),
                !1;
        t.onPacket(n)
    };
    bd.decodePayload(e, this.socket.binaryType, r),
    this.readyState !== "closed" && (this.polling = !1,
        this.emit("pollComplete"),
        this.readyState === "open" ? this.poll() : $t('ignoring poll - transport state "%s"', this.readyState))
}
;
jt.prototype.doClose = function() {
    var e = this;
    function t() {
        $t("writing close packet"),
            e.write([{
                type: "close"
            }])
    }
    this.readyState === "open" ? ($t("transport open - closing"),
        t()) : ($t("transport not open - deferring close"),
        this.once("open", t))
}
;
jt.prototype.write = function(e) {
    var t = this;
    this.writable = !1;
    var r = function() {
        t.writable = !0,
            t.emit("drain")
    };
    bd.encodePayload(e, this.supportsBinary, function(n) {
        t.doWrite(n, r)
    })
}
;
jt.prototype.uri = function() {
    var e = this.query || {}
        , t = this.secure ? "https" : "http"
        , r = "";
    this.timestampRequests !== !1 && (e[this.timestampParam] = Ny()),
    !this.supportsBinary && !e.sid && (e.b64 = 1),
        e = Dy.encode(e),
    this.port && (t === "https" && Number(this.port) !== 443 || t === "http" && Number(this.port) !== 80) && (r = ":" + this.port),
    e.length && (e = "?" + e);
    var n = this.hostname.indexOf(":") !== -1;
    return t + "://" + (n ? "[" + this.hostname + "]" : this.hostname) + r + this.path + e
}
;
var Cd = function() {
    return typeof self != "undefined" ? self : typeof window != "undefined" ? window : Function("return this")()
}()
    , jy = Gs
    , _d = wd
    , Hy = Nr.exports
    , Uy = Li
    , rl = gn.exports("engine.io-client:polling-xhr")
    , Wy = Cd;
Ys.exports = yn;
Ys.exports.Request = ze;
function xd() {}
function yn(e) {
    if (_d.call(this, e),
        this.requestTimeout = e.requestTimeout,
        this.extraHeaders = e.extraHeaders,
    typeof location != "undefined") {
        var t = location.protocol === "https:"
            , r = location.port;
        r || (r = t ? 443 : 80),
            this.xd = typeof location != "undefined" && e.hostname !== location.hostname || r !== e.port,
            this.xs = e.secure !== t
    }
}
Uy(yn, _d);
yn.prototype.supportsBinary = !0;
yn.prototype.request = function(e) {
    return e = e || {},
        e.uri = this.uri(),
        e.xd = this.xd,
        e.xs = this.xs,
        e.agent = this.agent || !1,
        e.supportsBinary = this.supportsBinary,
        e.enablesXDR = this.enablesXDR,
        e.withCredentials = this.withCredentials,
        e.pfx = this.pfx,
        e.key = this.key,
        e.passphrase = this.passphrase,
        e.cert = this.cert,
        e.ca = this.ca,
        e.ciphers = this.ciphers,
        e.rejectUnauthorized = this.rejectUnauthorized,
        e.requestTimeout = this.requestTimeout,
        e.extraHeaders = this.extraHeaders,
        new ze(e)
}
;
yn.prototype.doWrite = function(e, t) {
    var r = typeof e != "string" && e !== void 0
        , n = this.request({
        method: "POST",
        data: e,
        isBinary: r
    })
        , o = this;
    n.on("success", t),
        n.on("error", function(i) {
            o.onError("xhr post error", i)
        }),
        this.sendXhr = n
}
;
yn.prototype.doPoll = function() {
    rl("xhr poll");
    var e = this.request()
        , t = this;
    e.on("data", function(r) {
        t.onData(r)
    }),
        e.on("error", function(r) {
            t.onError("xhr poll error", r)
        }),
        this.pollXhr = e
}
;
function ze(e) {
    this.method = e.method || "GET",
        this.uri = e.uri,
        this.xd = !!e.xd,
        this.xs = !!e.xs,
        this.async = e.async !== !1,
        this.data = e.data !== void 0 ? e.data : null,
        this.agent = e.agent,
        this.isBinary = e.isBinary,
        this.supportsBinary = e.supportsBinary,
        this.enablesXDR = e.enablesXDR,
        this.withCredentials = e.withCredentials,
        this.requestTimeout = e.requestTimeout,
        this.pfx = e.pfx,
        this.key = e.key,
        this.passphrase = e.passphrase,
        this.cert = e.cert,
        this.ca = e.ca,
        this.ciphers = e.ciphers,
        this.rejectUnauthorized = e.rejectUnauthorized,
        this.extraHeaders = e.extraHeaders,
        this.create()
}
Hy(ze.prototype);
ze.prototype.create = function() {
    var e = {
        agent: this.agent,
        xdomain: this.xd,
        xscheme: this.xs,
        enablesXDR: this.enablesXDR
    };
    e.pfx = this.pfx,
        e.key = this.key,
        e.passphrase = this.passphrase,
        e.cert = this.cert,
        e.ca = this.ca,
        e.ciphers = this.ciphers,
        e.rejectUnauthorized = this.rejectUnauthorized;
    var t = this.xhr = new jy(e)
        , r = this;
    try {
        rl("xhr open %s: %s", this.method, this.uri),
            t.open(this.method, this.uri, this.async);
        try {
            if (this.extraHeaders) {
                t.setDisableHeaderCheck && t.setDisableHeaderCheck(!0);
                for (var n in this.extraHeaders)
                    this.extraHeaders.hasOwnProperty(n) && t.setRequestHeader(n, this.extraHeaders[n])
            }
        } catch {}
        if (this.method === "POST")
            try {
                this.isBinary ? t.setRequestHeader("Content-type", "application/octet-stream") : t.setRequestHeader("Content-type", "text/plain;charset=UTF-8")
            } catch {}
        try {
            t.setRequestHeader("Accept", "*/*")
        } catch {}
        "withCredentials"in t && (t.withCredentials = this.withCredentials),
        this.requestTimeout && (t.timeout = this.requestTimeout),
            this.hasXDR() ? (t.onload = function() {
                    r.onLoad()
                }
                    ,
                    t.onerror = function() {
                        r.onError(t.responseText)
                    }
            ) : t.onreadystatechange = function() {
                if (t.readyState === 2)
                    try {
                        var o = t.getResponseHeader("Content-Type");
                        (r.supportsBinary && o === "application/octet-stream" || o === "application/octet-stream; charset=UTF-8") && (t.responseType = "arraybuffer")
                    } catch {}
                t.readyState === 4 && (t.status === 200 || t.status === 1223 ? r.onLoad() : setTimeout(function() {
                    r.onError(typeof t.status == "number" ? t.status : 0)
                }, 0))
            }
            ,
            rl("xhr data %s", this.data),
            t.send(this.data)
    } catch (o) {
        setTimeout(function() {
            r.onError(o)
        }, 0);
        return
    }
    typeof document != "undefined" && (this.index = ze.requestsCount++,
        ze.requests[this.index] = this)
}
;
ze.prototype.onSuccess = function() {
    this.emit("success"),
        this.cleanup()
}
;
ze.prototype.onData = function(e) {
    this.emit("data", e),
        this.onSuccess()
}
;
ze.prototype.onError = function(e) {
    this.emit("error", e),
        this.cleanup(!0)
}
;
ze.prototype.cleanup = function(e) {
    if (!(typeof this.xhr == "undefined" || this.xhr === null)) {
        if (this.hasXDR() ? this.xhr.onload = this.xhr.onerror = xd : this.xhr.onreadystatechange = xd,
            e)
            try {
                this.xhr.abort()
            } catch {}
        typeof document != "undefined" && delete ze.requests[this.index],
            this.xhr = null
    }
}
;
ze.prototype.onLoad = function() {
    var e;
    try {
        var t;
        try {
            t = this.xhr.getResponseHeader("Content-Type")
        } catch {}
        t === "application/octet-stream" || t === "application/octet-stream; charset=UTF-8" ? e = this.xhr.response || this.xhr.responseText : e = this.xhr.responseText
    } catch (r) {
        this.onError(r)
    }
    e != null && this.onData(e)
}
;
ze.prototype.hasXDR = function() {
    return typeof XDomainRequest != "undefined" && !this.xs && this.enablesXDR
}
;
ze.prototype.abort = function() {
    this.cleanup()
}
;
ze.requestsCount = 0;
ze.requests = {};
if (typeof document != "undefined") {
    if (typeof attachEvent == "function")
        attachEvent("onunload", Sd);
    else if (typeof addEventListener == "function") {
        var qy = "onpagehide"in Wy ? "pagehide" : "unload";
        addEventListener(qy, Sd, !1)
    }
}
function Sd() {
    for (var e in ze.requests)
        ze.requests.hasOwnProperty(e) && ze.requests[e].abort()
}
var nl = wd, zy = Li, Od = Cd, Vy = bn, Ky = /\n/g, Gy = /\\n/g, Hi;
function Yy() {}
function bn(e) {
    nl.call(this, e),
        this.query = this.query || {},
    Hi || (Hi = Od.___eio = Od.___eio || []),
        this.index = Hi.length;
    var t = this;
    Hi.push(function(r) {
        t.onData(r)
    }),
        this.query.j = this.index,
    typeof addEventListener == "function" && addEventListener("beforeunload", function() {
        t.script && (t.script.onerror = Yy)
    }, !1)
}
zy(bn, nl);
bn.prototype.supportsBinary = !1;
bn.prototype.doClose = function() {
    this.script && (this.script.parentNode.removeChild(this.script),
        this.script = null),
    this.form && (this.form.parentNode.removeChild(this.form),
        this.form = null,
        this.iframe = null),
        nl.prototype.doClose.call(this)
}
;
bn.prototype.doPoll = function() {
    var e = this
        , t = document.createElement("script");
    this.script && (this.script.parentNode.removeChild(this.script),
        this.script = null),
        t.async = !0,
        t.src = this.uri(),
        t.onerror = function(o) {
            e.onError("jsonp poll error", o)
        }
    ;
    var r = document.getElementsByTagName("script")[0];
    r ? r.parentNode.insertBefore(t, r) : (document.head || document.body).appendChild(t),
        this.script = t;
    var n = typeof navigator != "undefined" && /gecko/i.test(navigator.userAgent);
    n && setTimeout(function() {
        var o = document.createElement("iframe");
        document.body.appendChild(o),
            document.body.removeChild(o)
    }, 100)
}
;
bn.prototype.doWrite = function(e, t) {
    var r = this;
    if (!this.form) {
        var n = document.createElement("form"), o = document.createElement("textarea"), i = this.iframeId = "eio_iframe_" + this.index, a;
        n.className = "socketio",
            n.style.position = "absolute",
            n.style.top = "-1000px",
            n.style.left = "-1000px",
            n.target = i,
            n.method = "POST",
            n.setAttribute("accept-charset", "utf-8"),
            o.name = "d",
            n.appendChild(o),
            document.body.appendChild(n),
            this.form = n,
            this.area = o
    }
    this.form.action = this.uri();
    function s() {
        l(),
            t()
    }
    function l() {
        if (r.iframe)
            try {
                r.form.removeChild(r.iframe)
            } catch (u) {
                r.onError("jsonp polling iframe removal error", u)
            }
        try {
            var c = '<iframe src="javascript:0" name="' + r.iframeId + '">';
            a = document.createElement(c)
        } catch {
            a = document.createElement("iframe"),
                a.name = r.iframeId,
                a.src = "javascript:0"
        }
        a.id = r.iframeId,
            r.form.appendChild(a),
            r.iframe = a
    }
    l(),
        e = e.replace(Gy, `\\
`),
        this.area.value = e.replace(Ky, "\\n");
    try {
        this.form.submit()
    } catch {}
    this.iframe.attachEvent ? this.iframe.onreadystatechange = function() {
            r.iframe.readyState === "complete" && s()
        }
        : this.iframe.onload = s
}
;
var ol = Qs, Xy = Lr, Jy = mn, Qy = Li, Zy = gd, eb = gn.exports("engine.io-client:websocket"), Ui, il;
typeof WebSocket != "undefined" ? Ui = WebSocket : typeof self != "undefined" && (Ui = self.WebSocket || self.MozWebSocket);
if (typeof window == "undefined")
    try {
        il = require("ws")
    } catch {}
var wn = Ui || il
    , tb = bt;
function bt(e) {
    var t = e && e.forceBase64;
    t && (this.supportsBinary = !1),
        this.perMessageDeflate = e.perMessageDeflate,
        this.usingBrowserWebSocket = Ui && !e.forceNode,
        this.protocols = e.protocols,
    this.usingBrowserWebSocket || (wn = il),
        ol.call(this, e)
}
Qy(bt, ol);
bt.prototype.name = "websocket";
bt.prototype.supportsBinary = !0;
bt.prototype.doOpen = function() {
    if (!!this.check()) {
        var e = this.uri()
            , t = this.protocols
            , r = {};
        this.isReactNative || (r.agent = this.agent,
            r.perMessageDeflate = this.perMessageDeflate,
            r.pfx = this.pfx,
            r.key = this.key,
            r.passphrase = this.passphrase,
            r.cert = this.cert,
            r.ca = this.ca,
            r.ciphers = this.ciphers,
            r.rejectUnauthorized = this.rejectUnauthorized),
        this.extraHeaders && (r.headers = this.extraHeaders),
        this.localAddress && (r.localAddress = this.localAddress);
        try {
            this.ws = this.usingBrowserWebSocket && !this.isReactNative ? t ? new wn(e,t) : new wn(e) : new wn(e,t,r)
        } catch (n) {
            return this.emit("error", n)
        }
        this.ws.binaryType === void 0 && (this.supportsBinary = !1),
            this.ws.supports && this.ws.supports.binary ? (this.supportsBinary = !0,
                this.ws.binaryType = "nodebuffer") : this.ws.binaryType = "arraybuffer",
            this.addEventListeners()
    }
}
;
bt.prototype.addEventListeners = function() {
    var e = this;
    this.ws.onopen = function() {
        e.onOpen()
    }
        ,
        this.ws.onclose = function() {
            e.onClose()
        }
        ,
        this.ws.onmessage = function(t) {
            e.onData(t.data)
        }
        ,
        this.ws.onerror = function(t) {
            e.onError("websocket error", t)
        }
}
;
bt.prototype.write = function(e) {
    var t = this;
    this.writable = !1;
    for (var r = e.length, n = 0, o = r; n < o; n++)
        (function(a) {
                Xy.encodePacket(a, t.supportsBinary, function(s) {
                    if (!t.usingBrowserWebSocket) {
                        var l = {};
                        if (a.options && (l.compress = a.options.compress),
                            t.perMessageDeflate) {
                            var c = typeof s == "string" ? Buffer.byteLength(s) : s.length;
                            c < t.perMessageDeflate.threshold && (l.compress = !1)
                        }
                    }
                    try {
                        t.usingBrowserWebSocket ? t.ws.send(s) : t.ws.send(s, l)
                    } catch {
                        eb("websocket closed before onclose event")
                    }
                    --r || i()
                })
            }
        )(e[n]);
    function i() {
        t.emit("flush"),
            setTimeout(function() {
                t.writable = !0,
                    t.emit("drain")
            }, 0)
    }
}
;
bt.prototype.onClose = function() {
    ol.prototype.onClose.call(this)
}
;
bt.prototype.doClose = function() {
    typeof this.ws != "undefined" && this.ws.close()
}
;
bt.prototype.uri = function() {
    var e = this.query || {}
        , t = this.secure ? "wss" : "ws"
        , r = "";
    this.port && (t === "wss" && Number(this.port) !== 443 || t === "ws" && Number(this.port) !== 80) && (r = ":" + this.port),
    this.timestampRequests && (e[this.timestampParam] = Zy()),
    this.supportsBinary || (e.b64 = 1),
        e = Jy.encode(e),
    e.length && (e = "?" + e);
    var n = this.hostname.indexOf(":") !== -1;
    return t + "://" + (n ? "[" + this.hostname + "]" : this.hostname) + r + this.path + e
}
;
bt.prototype.check = function() {
    return !!wn && !("__initialize"in wn && this.name === bt.prototype.name)
}
;
var rb = Gs
    , nb = Ys.exports
    , ob = Vy
    , ib = tb;
Ii.polling = ab;
Ii.websocket = ib;
function ab(e) {
    var t, r = !1, n = !1, o = e.jsonp !== !1;
    if (typeof location != "undefined") {
        var i = location.protocol === "https:"
            , a = location.port;
        a || (a = i ? 443 : 80),
            r = e.hostname !== location.hostname || a !== e.port,
            n = e.secure !== i
    }
    if (e.xdomain = r,
        e.xscheme = n,
        t = new rb(e),
    "open"in t && !e.forceJSONP)
        return new nb(e);
    if (!o)
        throw new Error("JSONP disabled");
    return new ob(e)
}
var sb = [].indexOf
    , Ed = function(e, t) {
    if (sb)
        return e.indexOf(t);
    for (var r = 0; r < e.length; ++r)
        if (e[r] === t)
            return r;
    return -1
}
    , lb = Ii
    , ub = Nr.exports
    , He = gn.exports("engine.io-client:socket")
    , cb = Ed
    , Fd = Lr
    , Ad = ed
    , fb = mn
    , db = he;
function he(e, t) {
    if (!(this instanceof he))
        return new he(e,t);
    t = t || {},
    e && typeof e == "object" && (t = e,
        e = null),
        e ? (e = Ad(e),
            t.hostname = e.host,
            t.secure = e.protocol === "https" || e.protocol === "wss",
            t.port = e.port,
        e.query && (t.query = e.query)) : t.host && (t.hostname = Ad(t.host).host),
        this.secure = t.secure != null ? t.secure : typeof location != "undefined" && location.protocol === "https:",
    t.hostname && !t.port && (t.port = this.secure ? "443" : "80"),
        this.agent = t.agent || !1,
        this.hostname = t.hostname || (typeof location != "undefined" ? location.hostname : "localhost"),
        this.port = t.port || (typeof location != "undefined" && location.port ? location.port : this.secure ? 443 : 80),
        this.query = t.query || {},
    typeof this.query == "string" && (this.query = fb.decode(this.query)),
        this.upgrade = t.upgrade !== !1,
        this.path = (t.path || "/engine.io").replace(/\/$/, "") + "/",
        this.forceJSONP = !!t.forceJSONP,
        this.jsonp = t.jsonp !== !1,
        this.forceBase64 = !!t.forceBase64,
        this.enablesXDR = !!t.enablesXDR,
        this.withCredentials = t.withCredentials !== !1,
        this.timestampParam = t.timestampParam || "t",
        this.timestampRequests = t.timestampRequests,
        this.transports = t.transports || ["polling", "websocket"],
        this.transportOptions = t.transportOptions || {},
        this.readyState = "",
        this.writeBuffer = [],
        this.prevBufferLen = 0,
        this.policyPort = t.policyPort || 843,
        this.rememberUpgrade = t.rememberUpgrade || !1,
        this.binaryType = null,
        this.onlyBinaryUpgrades = t.onlyBinaryUpgrades,
        this.perMessageDeflate = t.perMessageDeflate !== !1 ? t.perMessageDeflate || {} : !1,
    this.perMessageDeflate === !0 && (this.perMessageDeflate = {}),
    this.perMessageDeflate && this.perMessageDeflate.threshold == null && (this.perMessageDeflate.threshold = 1024),
        this.pfx = t.pfx || void 0,
        this.key = t.key || void 0,
        this.passphrase = t.passphrase || void 0,
        this.cert = t.cert || void 0,
        this.ca = t.ca || void 0,
        this.ciphers = t.ciphers || void 0,
        this.rejectUnauthorized = t.rejectUnauthorized === void 0 ? !0 : t.rejectUnauthorized,
        this.forceNode = !!t.forceNode,
        this.isReactNative = typeof navigator != "undefined" && typeof navigator.product == "string" && navigator.product.toLowerCase() === "reactnative",
    (typeof self == "undefined" || this.isReactNative) && (t.extraHeaders && Object.keys(t.extraHeaders).length > 0 && (this.extraHeaders = t.extraHeaders),
    t.localAddress && (this.localAddress = t.localAddress)),
        this.id = null,
        this.upgrades = null,
        this.pingInterval = null,
        this.pingTimeout = null,
        this.pingIntervalTimer = null,
        this.pingTimeoutTimer = null,
        this.open()
}
he.priorWebsocketSuccess = !1;
ub(he.prototype);
he.protocol = Fd.protocol;
he.Socket = he;
he.Transport = Qs;
he.transports = Ii;
he.parser = Lr;
he.prototype.createTransport = function(e) {
    He('creating transport "%s"', e);
    var t = pb(this.query);
    t.EIO = Fd.protocol,
        t.transport = e;
    var r = this.transportOptions[e] || {};
    this.id && (t.sid = this.id);
    var n = new lb[e]({
        query: t,
        socket: this,
        agent: r.agent || this.agent,
        hostname: r.hostname || this.hostname,
        port: r.port || this.port,
        secure: r.secure || this.secure,
        path: r.path || this.path,
        forceJSONP: r.forceJSONP || this.forceJSONP,
        jsonp: r.jsonp || this.jsonp,
        forceBase64: r.forceBase64 || this.forceBase64,
        enablesXDR: r.enablesXDR || this.enablesXDR,
        withCredentials: r.withCredentials || this.withCredentials,
        timestampRequests: r.timestampRequests || this.timestampRequests,
        timestampParam: r.timestampParam || this.timestampParam,
        policyPort: r.policyPort || this.policyPort,
        pfx: r.pfx || this.pfx,
        key: r.key || this.key,
        passphrase: r.passphrase || this.passphrase,
        cert: r.cert || this.cert,
        ca: r.ca || this.ca,
        ciphers: r.ciphers || this.ciphers,
        rejectUnauthorized: r.rejectUnauthorized || this.rejectUnauthorized,
        perMessageDeflate: r.perMessageDeflate || this.perMessageDeflate,
        extraHeaders: r.extraHeaders || this.extraHeaders,
        forceNode: r.forceNode || this.forceNode,
        localAddress: r.localAddress || this.localAddress,
        requestTimeout: r.requestTimeout || this.requestTimeout,
        protocols: r.protocols || void 0,
        isReactNative: this.isReactNative
    });
    return n
}
;
function pb(e) {
    var t = {};
    for (var r in e)
        e.hasOwnProperty(r) && (t[r] = e[r]);
    return t
}
he.prototype.open = function() {
    var e;
    if (this.rememberUpgrade && he.priorWebsocketSuccess && this.transports.indexOf("websocket") !== -1)
        e = "websocket";
    else if (this.transports.length === 0) {
        var t = this;
        setTimeout(function() {
            t.emit("error", "No transports available")
        }, 0);
        return
    } else
        e = this.transports[0];
    this.readyState = "opening";
    try {
        e = this.createTransport(e)
    } catch {
        this.transports.shift(),
            this.open();
        return
    }
    e.open(),
        this.setTransport(e)
}
;
he.prototype.setTransport = function(e) {
    He("setting transport %s", e.name);
    var t = this;
    this.transport && (He("clearing existing transport %s", this.transport.name),
        this.transport.removeAllListeners()),
        this.transport = e,
        e.on("drain", function() {
            t.onDrain()
        }).on("packet", function(r) {
            t.onPacket(r)
        }).on("error", function(r) {
            t.onError(r)
        }).on("close", function() {
            t.onClose("transport close")
        })
}
;
he.prototype.probe = function(e) {
    He('probing transport "%s"', e);
    var t = this.createTransport(e, {
        probe: 1
    })
        , r = !1
        , n = this;
    he.priorWebsocketSuccess = !1;
    function o() {
        if (n.onlyBinaryUpgrades) {
            var f = !this.supportsBinary && n.transport.supportsBinary;
            r = r || f
        }
        r || (He('probe transport "%s" opened', e),
            t.send([{
                type: "ping",
                data: "probe"
            }]),
            t.once("packet", function(d) {
                if (!r)
                    if (d.type === "pong" && d.data === "probe") {
                        if (He('probe transport "%s" pong', e),
                            n.upgrading = !0,
                            n.emit("upgrading", t),
                            !t)
                            return;
                        he.priorWebsocketSuccess = t.name === "websocket",
                            He('pausing current transport "%s"', n.transport.name),
                            n.transport.pause(function() {
                                r || n.readyState !== "closed" && (He("changing transport and sending upgrade packet"),
                                    u(),
                                    n.setTransport(t),
                                    t.send([{
                                        type: "upgrade"
                                    }]),
                                    n.emit("upgrade", t),
                                    t = null,
                                    n.upgrading = !1,
                                    n.flush())
                            })
                    } else {
                        He('probe transport "%s" failed', e);
                        var p = new Error("probe error");
                        p.transport = t.name,
                            n.emit("upgradeError", p)
                    }
            }))
    }
    function i() {
        r || (r = !0,
            u(),
            t.close(),
            t = null)
    }
    function a(f) {
        var d = new Error("probe error: " + f);
        d.transport = t.name,
            i(),
            He('probe transport "%s" failed because of error: %s', e, f),
            n.emit("upgradeError", d)
    }
    function s() {
        a("transport closed")
    }
    function l() {
        a("socket closed")
    }
    function c(f) {
        t && f.name !== t.name && (He('"%s" works - aborting "%s"', f.name, t.name),
            i())
    }
    function u() {
        t.removeListener("open", o),
            t.removeListener("error", a),
            t.removeListener("close", s),
            n.removeListener("close", l),
            n.removeListener("upgrading", c)
    }
    t.once("open", o),
        t.once("error", a),
        t.once("close", s),
        this.once("close", l),
        this.once("upgrading", c),
        t.open()
}
;
he.prototype.onOpen = function() {
    if (He("socket open"),
        this.readyState = "open",
        he.priorWebsocketSuccess = this.transport.name === "websocket",
        this.emit("open"),
        this.flush(),
    this.readyState === "open" && this.upgrade && this.transport.pause) {
        He("starting upgrade probes");
        for (var e = 0, t = this.upgrades.length; e < t; e++)
            this.probe(this.upgrades[e])
    }
}
;
he.prototype.onPacket = function(e) {
    if (this.readyState === "opening" || this.readyState === "open" || this.readyState === "closing")
        switch (He('socket receive: type "%s", data "%s"', e.type, e.data),
            this.emit("packet", e),
            this.emit("heartbeat"),
            e.type) {
            case "open":
                this.onHandshake(JSON.parse(e.data));
                break;
            case "pong":
                this.setPing(),
                    this.emit("pong");
                break;
            case "error":
                var t = new Error("server error");
                t.code = e.data,
                    this.onError(t);
                break;
            case "message":
                this.emit("data", e.data),
                    this.emit("message", e.data);
                break
        }
    else
        He('packet received with socket readyState "%s"', this.readyState)
}
;
he.prototype.onHandshake = function(e) {
    this.emit("handshake", e),
        this.id = e.sid,
        this.transport.query.sid = e.sid,
        this.upgrades = this.filterUpgrades(e.upgrades),
        this.pingInterval = e.pingInterval,
        this.pingTimeout = e.pingTimeout,
        this.onOpen(),
    this.readyState !== "closed" && (this.setPing(),
        this.removeListener("heartbeat", this.onHeartbeat),
        this.on("heartbeat", this.onHeartbeat))
}
;
he.prototype.onHeartbeat = function(e) {
    clearTimeout(this.pingTimeoutTimer);
    var t = this;
    t.pingTimeoutTimer = setTimeout(function() {
        t.readyState !== "closed" && t.onClose("ping timeout")
    }, e || t.pingInterval + t.pingTimeout)
}
;
he.prototype.setPing = function() {
    var e = this;
    clearTimeout(e.pingIntervalTimer),
        e.pingIntervalTimer = setTimeout(function() {
            He("writing ping packet - expecting pong within %sms", e.pingTimeout),
                e.ping(),
                e.onHeartbeat(e.pingTimeout)
        }, e.pingInterval)
}
;
he.prototype.ping = function() {
    var e = this;
    this.sendPacket("ping", function() {
        e.emit("ping")
    })
}
;
he.prototype.onDrain = function() {
    this.writeBuffer.splice(0, this.prevBufferLen),
        this.prevBufferLen = 0,
        this.writeBuffer.length === 0 ? this.emit("drain") : this.flush()
}
;
he.prototype.flush = function() {
    this.readyState !== "closed" && this.transport.writable && !this.upgrading && this.writeBuffer.length && (He("flushing %d packets in socket", this.writeBuffer.length),
        this.transport.send(this.writeBuffer),
        this.prevBufferLen = this.writeBuffer.length,
        this.emit("flush"))
}
;
he.prototype.write = he.prototype.send = function(e, t, r) {
    return this.sendPacket("message", e, t, r),
        this
}
;
he.prototype.sendPacket = function(e, t, r, n) {
    if (typeof t == "function" && (n = t,
        t = void 0),
    typeof r == "function" && (n = r,
        r = null),
        !(this.readyState === "closing" || this.readyState === "closed")) {
        r = r || {},
            r.compress = r.compress !== !1;
        var o = {
            type: e,
            data: t,
            options: r
        };
        this.emit("packetCreate", o),
            this.writeBuffer.push(o),
        n && this.once("flush", n),
            this.flush()
    }
}
;
he.prototype.close = function() {
    if (this.readyState === "opening" || this.readyState === "open") {
        this.readyState = "closing";
        var e = this;
        this.writeBuffer.length ? this.once("drain", function() {
            this.upgrading ? n() : t()
        }) : this.upgrading ? n() : t()
    }
    function t() {
        e.onClose("forced close"),
            He("socket closing - telling transport to close"),
            e.transport.close()
    }
    function r() {
        e.removeListener("upgrade", r),
            e.removeListener("upgradeError", r),
            t()
    }
    function n() {
        e.once("upgrade", r),
            e.once("upgradeError", r)
    }
    return this
}
;
he.prototype.onError = function(e) {
    He("socket error %j", e),
        he.priorWebsocketSuccess = !1,
        this.emit("error", e),
        this.onClose("transport error", e)
}
;
he.prototype.onClose = function(e, t) {
    if (this.readyState === "opening" || this.readyState === "open" || this.readyState === "closing") {
        He('socket close with reason: "%s"', e);
        var r = this;
        clearTimeout(this.pingIntervalTimer),
            clearTimeout(this.pingTimeoutTimer),
            this.transport.removeAllListeners("close"),
            this.transport.close(),
            this.transport.removeAllListeners(),
            this.readyState = "closed",
            this.id = null,
            this.emit("close", e, t),
            r.writeBuffer = [],
            r.prevBufferLen = 0
    }
}
;
he.prototype.filterUpgrades = function(e) {
    for (var t = [], r = 0, n = e.length; r < n; r++)
        ~cb(this.transports, e[r]) && t.push(e[r]);
    return t
}
;
Vs.exports = db;
Vs.exports.parser = Lr;
var al = {
    exports: {}
}
    , hb = vb;
function vb(e, t) {
    var r = [];
    t = t || 0;
    for (var n = t || 0; n < e.length; n++)
        r[n - t] = e[n];
    return r
}
var kd = mb;
function mb(e, t, r) {
    return e.on(t, r),
        {
            destroy: function() {
                e.removeListener(t, r)
            }
        }
}
var Pd = [].slice
    , Td = function(e, t) {
    if (typeof t == "string" && (t = e[t]),
    typeof t != "function")
        throw new Error("bind() requires a function");
    var r = Pd.call(arguments, 2);
    return function() {
        return t.apply(e, r.concat(Pd.call(arguments)))
    }
};
(function(e, t) {
        var r = Mi
            , n = Nr.exports
            , o = hb
            , i = kd
            , a = Td
            , s = pn.exports("socket.io-client:socket")
            , l = mn
            , c = ad;
        e.exports = d;
        var u = {
            connect: 1,
            connect_error: 1,
            connect_timeout: 1,
            connecting: 1,
            disconnect: 1,
            error: 1,
            reconnect: 1,
            reconnect_attempt: 1,
            reconnect_failed: 1,
            reconnect_error: 1,
            reconnecting: 1,
            ping: 1,
            pong: 1
        }
            , f = n.prototype.emit;
        function d(p, g, m) {
            this.io = p,
                this.nsp = g,
                this.json = this,
                this.ids = 0,
                this.acks = {},
                this.receiveBuffer = [],
                this.sendBuffer = [],
                this.connected = !1,
                this.disconnected = !0,
                this.flags = {},
            m && m.query && (this.query = m.query),
            this.io.autoConnect && this.open()
        }
        n(d.prototype),
            d.prototype.subEvents = function() {
                if (!this.subs) {
                    var p = this.io;
                    this.subs = [i(p, "open", a(this, "onopen")), i(p, "packet", a(this, "onpacket")), i(p, "close", a(this, "onclose"))]
                }
            }
            ,
            d.prototype.open = d.prototype.connect = function() {
                return this.connected ? this : (this.subEvents(),
                this.io.reconnecting || this.io.open(),
                this.io.readyState === "open" && this.onopen(),
                    this.emit("connecting"),
                    this)
            }
            ,
            d.prototype.send = function() {
                var p = o(arguments);
                return p.unshift("message"),
                    this.emit.apply(this, p),
                    this
            }
            ,
            d.prototype.emit = function(p) {
                if (u.hasOwnProperty(p))
                    return f.apply(this, arguments),
                        this;
                var g = o(arguments)
                    , m = {
                    type: (this.flags.binary !== void 0 ? this.flags.binary : c(g)) ? r.BINARY_EVENT : r.EVENT,
                    data: g
                };
                return m.options = {},
                    m.options.compress = !this.flags || this.flags.compress !== !1,
                typeof g[g.length - 1] == "function" && (s("emitting packet with ack id %d", this.ids),
                    this.acks[this.ids] = g.pop(),
                    m.id = this.ids++),
                    this.connected ? this.packet(m) : this.sendBuffer.push(m),
                    this.flags = {},
                    this
            }
            ,
            d.prototype.packet = function(p) {
                p.nsp = this.nsp,
                    this.io.packet(p)
            }
            ,
            d.prototype.onopen = function() {
                if (s("transport is open - connecting"),
                this.nsp !== "/")
                    if (this.query) {
                        var p = typeof this.query == "object" ? l.encode(this.query) : this.query;
                        s("sending connect packet with query %s", p),
                            this.packet({
                                type: r.CONNECT,
                                query: p
                            })
                    } else
                        this.packet({
                            type: r.CONNECT
                        })
            }
            ,
            d.prototype.onclose = function(p) {
                s("close (%s)", p),
                    this.connected = !1,
                    this.disconnected = !0,
                    delete this.id,
                    this.emit("disconnect", p)
            }
            ,
            d.prototype.onpacket = function(p) {
                var g = p.nsp === this.nsp
                    , m = p.type === r.ERROR && p.nsp === "/";
                if (!(!g && !m))
                    switch (p.type) {
                        case r.CONNECT:
                            this.onconnect();
                            break;
                        case r.EVENT:
                            this.onevent(p);
                            break;
                        case r.BINARY_EVENT:
                            this.onevent(p);
                            break;
                        case r.ACK:
                            this.onack(p);
                            break;
                        case r.BINARY_ACK:
                            this.onack(p);
                            break;
                        case r.DISCONNECT:
                            this.ondisconnect();
                            break;
                        case r.ERROR:
                            this.emit("error", p.data);
                            break
                    }
            }
            ,
            d.prototype.onevent = function(p) {
                var g = p.data || [];
                s("emitting event %j", g),
                p.id != null && (s("attaching ack callback to event"),
                    g.push(this.ack(p.id))),
                    this.connected ? f.apply(this, g) : this.receiveBuffer.push(g)
            }
            ,
            d.prototype.ack = function(p) {
                var g = this
                    , m = !1;
                return function() {
                    if (!m) {
                        m = !0;
                        var h = o(arguments);
                        s("sending ack %j", h),
                            g.packet({
                                type: c(h) ? r.BINARY_ACK : r.ACK,
                                id: p,
                                data: h
                            })
                    }
                }
            }
            ,
            d.prototype.onack = function(p) {
                var g = this.acks[p.id];
                typeof g == "function" ? (s("calling ack %s with %j", p.id, p.data),
                    g.apply(this, p.data),
                    delete this.acks[p.id]) : s("bad ack %s", p.id)
            }
            ,
            d.prototype.onconnect = function() {
                this.connected = !0,
                    this.disconnected = !1,
                    this.emit("connect"),
                    this.emitBuffered()
            }
            ,
            d.prototype.emitBuffered = function() {
                var p;
                for (p = 0; p < this.receiveBuffer.length; p++)
                    f.apply(this, this.receiveBuffer[p]);
                for (this.receiveBuffer = [],
                         p = 0; p < this.sendBuffer.length; p++)
                    this.packet(this.sendBuffer[p]);
                this.sendBuffer = []
            }
            ,
            d.prototype.ondisconnect = function() {
                s("server disconnect (%s)", this.nsp),
                    this.destroy(),
                    this.onclose("io server disconnect")
            }
            ,
            d.prototype.destroy = function() {
                if (this.subs) {
                    for (var p = 0; p < this.subs.length; p++)
                        this.subs[p].destroy();
                    this.subs = null
                }
                this.io.destroy(this)
            }
            ,
            d.prototype.close = d.prototype.disconnect = function() {
                return this.connected && (s("performing disconnect (%s)", this.nsp),
                    this.packet({
                        type: r.DISCONNECT
                    })),
                    this.destroy(),
                this.connected && this.onclose("io client disconnect"),
                    this
            }
            ,
            d.prototype.compress = function(p) {
                return this.flags.compress = p,
                    this
            }
            ,
            d.prototype.binary = function(p) {
                return this.flags.binary = p,
                    this
            }
    }
)(al);
var gb = Cn;
function Cn(e) {
    e = e || {},
        this.ms = e.min || 100,
        this.max = e.max || 1e4,
        this.factor = e.factor || 2,
        this.jitter = e.jitter > 0 && e.jitter <= 1 ? e.jitter : 0,
        this.attempts = 0
}
Cn.prototype.duration = function() {
    var e = this.ms * Math.pow(this.factor, this.attempts++);
    if (this.jitter) {
        var t = Math.random()
            , r = Math.floor(t * this.jitter * e);
        e = (Math.floor(t * 10) & 1) == 0 ? e - r : e + r
    }
    return Math.min(e, this.max) | 0
}
;
Cn.prototype.reset = function() {
    this.attempts = 0
}
;
Cn.prototype.setMin = function(e) {
    this.ms = e
}
;
Cn.prototype.setMax = function(e) {
    this.max = e
}
;
Cn.prototype.setJitter = function(e) {
    this.jitter = e
}
;
var yb = Vs.exports
    , bb = al.exports
    , wb = Nr.exports
    , Cb = Mi
    , fr = kd
    , _n = Td
    , rt = pn.exports("socket.io-client:manager")
    , $d = Ed
    , _b = gb
    , Md = Object.prototype.hasOwnProperty
    , Rd = ye;
function ye(e, t) {
    if (!(this instanceof ye))
        return new ye(e,t);
    e && typeof e == "object" && (t = e,
        e = void 0),
        t = t || {},
        t.path = t.path || "/socket.io",
        this.nsps = {},
        this.subs = [],
        this.opts = t,
        this.reconnection(t.reconnection !== !1),
        this.reconnectionAttempts(t.reconnectionAttempts || 1 / 0),
        this.reconnectionDelay(t.reconnectionDelay || 1e3),
        this.reconnectionDelayMax(t.reconnectionDelayMax || 5e3),
        this.randomizationFactor(t.randomizationFactor || .5),
        this.backoff = new _b({
            min: this.reconnectionDelay(),
            max: this.reconnectionDelayMax(),
            jitter: this.randomizationFactor()
        }),
        this.timeout(t.timeout == null ? 2e4 : t.timeout),
        this.readyState = "closed",
        this.uri = e,
        this.connecting = [],
        this.lastPing = null,
        this.encoding = !1,
        this.packetBuffer = [];
    var r = t.parser || Cb;
    this.encoder = new r.Encoder,
        this.decoder = new r.Decoder,
        this.autoConnect = t.autoConnect !== !1,
    this.autoConnect && this.open()
}
ye.prototype.emitAll = function() {
    this.emit.apply(this, arguments);
    for (var e in this.nsps)
        Md.call(this.nsps, e) && this.nsps[e].emit.apply(this.nsps[e], arguments)
}
;
ye.prototype.updateSocketIds = function() {
    for (var e in this.nsps)
        Md.call(this.nsps, e) && (this.nsps[e].id = this.generateId(e))
}
;
ye.prototype.generateId = function(e) {
    return (e === "/" ? "" : e + "#") + this.engine.id
}
;
wb(ye.prototype);
ye.prototype.reconnection = function(e) {
    return arguments.length ? (this._reconnection = !!e,
        this) : this._reconnection
}
;
ye.prototype.reconnectionAttempts = function(e) {
    return arguments.length ? (this._reconnectionAttempts = e,
        this) : this._reconnectionAttempts
}
;
ye.prototype.reconnectionDelay = function(e) {
    return arguments.length ? (this._reconnectionDelay = e,
    this.backoff && this.backoff.setMin(e),
        this) : this._reconnectionDelay
}
;
ye.prototype.randomizationFactor = function(e) {
    return arguments.length ? (this._randomizationFactor = e,
    this.backoff && this.backoff.setJitter(e),
        this) : this._randomizationFactor
}
;
ye.prototype.reconnectionDelayMax = function(e) {
    return arguments.length ? (this._reconnectionDelayMax = e,
    this.backoff && this.backoff.setMax(e),
        this) : this._reconnectionDelayMax
}
;
ye.prototype.timeout = function(e) {
    return arguments.length ? (this._timeout = e,
        this) : this._timeout
}
;
ye.prototype.maybeReconnectOnOpen = function() {
    !this.reconnecting && this._reconnection && this.backoff.attempts === 0 && this.reconnect()
}
;
ye.prototype.open = ye.prototype.connect = function(e, t) {
    if (rt("readyState %s", this.readyState),
        ~this.readyState.indexOf("open"))
        return this;
    rt("opening %s", this.uri),
        this.engine = yb(this.uri, this.opts);
    var r = this.engine
        , n = this;
    this.readyState = "opening",
        this.skipReconnect = !1;
    var o = fr(r, "open", function() {
        n.onopen(),
        e && e()
    })
        , i = fr(r, "error", function(l) {
        if (rt("connect_error"),
            n.cleanup(),
            n.readyState = "closed",
            n.emitAll("connect_error", l),
            e) {
            var c = new Error("Connection error");
            c.data = l,
                e(c)
        } else
            n.maybeReconnectOnOpen()
    });
    if (this._timeout !== !1) {
        var a = this._timeout;
        rt("connect attempt will timeout after %d", a),
        a === 0 && o.destroy();
        var s = setTimeout(function() {
            rt("connect attempt timed out after %d", a),
                o.destroy(),
                r.close(),
                r.emit("error", "timeout"),
                n.emitAll("connect_timeout", a)
        }, a);
        this.subs.push({
            destroy: function() {
                clearTimeout(s)
            }
        })
    }
    return this.subs.push(o),
        this.subs.push(i),
        this
}
;
ye.prototype.onopen = function() {
    rt("open"),
        this.cleanup(),
        this.readyState = "open",
        this.emit("open");
    var e = this.engine;
    this.subs.push(fr(e, "data", _n(this, "ondata"))),
        this.subs.push(fr(e, "ping", _n(this, "onping"))),
        this.subs.push(fr(e, "pong", _n(this, "onpong"))),
        this.subs.push(fr(e, "error", _n(this, "onerror"))),
        this.subs.push(fr(e, "close", _n(this, "onclose"))),
        this.subs.push(fr(this.decoder, "decoded", _n(this, "ondecoded")))
}
;
ye.prototype.onping = function() {
    this.lastPing = new Date,
        this.emitAll("ping")
}
;
ye.prototype.onpong = function() {
    this.emitAll("pong", new Date - this.lastPing)
}
;
ye.prototype.ondata = function(e) {
    this.decoder.add(e)
}
;
ye.prototype.ondecoded = function(e) {
    this.emit("packet", e)
}
;
ye.prototype.onerror = function(e) {
    rt("error", e),
        this.emitAll("error", e)
}
;
ye.prototype.socket = function(e, t) {
    var r = this.nsps[e];
    if (!r) {
        r = new bb(this,e,t),
            this.nsps[e] = r;
        var n = this;
        r.on("connecting", o),
            r.on("connect", function() {
                r.id = n.generateId(e)
            }),
        this.autoConnect && o()
    }
    function o() {
        ~$d(n.connecting, r) || n.connecting.push(r)
    }
    return r
}
;
ye.prototype.destroy = function(e) {
    var t = $d(this.connecting, e);
    ~t && this.connecting.splice(t, 1),
    !this.connecting.length && this.close()
}
;
ye.prototype.packet = function(e) {
    rt("writing packet %j", e);
    var t = this;
    e.query && e.type === 0 && (e.nsp += "?" + e.query),
        t.encoding ? t.packetBuffer.push(e) : (t.encoding = !0,
            this.encoder.encode(e, function(r) {
                for (var n = 0; n < r.length; n++)
                    t.engine.write(r[n], e.options);
                t.encoding = !1,
                    t.processPacketQueue()
            }))
}
;
ye.prototype.processPacketQueue = function() {
    if (this.packetBuffer.length > 0 && !this.encoding) {
        var e = this.packetBuffer.shift();
        this.packet(e)
    }
}
;
ye.prototype.cleanup = function() {
    rt("cleanup");
    for (var e = this.subs.length, t = 0; t < e; t++) {
        var r = this.subs.shift();
        r.destroy()
    }
    this.packetBuffer = [],
        this.encoding = !1,
        this.lastPing = null,
        this.decoder.destroy()
}
;
ye.prototype.close = ye.prototype.disconnect = function() {
    rt("disconnect"),
        this.skipReconnect = !0,
        this.reconnecting = !1,
    this.readyState === "opening" && this.cleanup(),
        this.backoff.reset(),
        this.readyState = "closed",
    this.engine && this.engine.close()
}
;
ye.prototype.onclose = function(e) {
    rt("onclose"),
        this.cleanup(),
        this.backoff.reset(),
        this.readyState = "closed",
        this.emit("close", e),
    this._reconnection && !this.skipReconnect && this.reconnect()
}
;
ye.prototype.reconnect = function() {
    if (this.reconnecting || this.skipReconnect)
        return this;
    var e = this;
    if (this.backoff.attempts >= this._reconnectionAttempts)
        rt("reconnect failed"),
            this.backoff.reset(),
            this.emitAll("reconnect_failed"),
            this.reconnecting = !1;
    else {
        var t = this.backoff.duration();
        rt("will wait %dms before reconnect attempt", t),
            this.reconnecting = !0;
        var r = setTimeout(function() {
            e.skipReconnect || (rt("attempting reconnect"),
                e.emitAll("reconnect_attempt", e.backoff.attempts),
                e.emitAll("reconnecting", e.backoff.attempts),
            !e.skipReconnect && e.open(function(n) {
                n ? (rt("reconnect attempt error"),
                    e.reconnecting = !1,
                    e.reconnect(),
                    e.emitAll("reconnect_error", n.data)) : (rt("reconnect success"),
                    e.onreconnect())
            }))
        }, t);
        this.subs.push({
            destroy: function() {
                clearTimeout(r)
            }
        })
    }
}
;
ye.prototype.onreconnect = function() {
    var e = this.backoff.attempts;
    this.reconnecting = !1,
        this.backoff.reset(),
        this.updateSocketIds(),
        this.emitAll("reconnect", e)
}
;
(function(e, t) {
        var r = oy
            , n = Mi
            , o = Rd
            , i = pn.exports("socket.io-client");
        e.exports = t = s;
        var a = t.managers = {};
        function s(l, c) {
            typeof l == "object" && (c = l,
                l = void 0),
                c = c || {};
            var u = r(l), f = u.source, d = u.id, p = u.path, g = a[d] && p in a[d].nsps, m = c.forceNew || c["force new connection"] || c.multiplex === !1 || g, h;
            return m ? (i("ignoring socket cache for %s", f),
                h = o(f, c)) : (a[d] || (i("new io instance for %s", f),
                a[d] = o(f, c)),
                h = a[d]),
            u.query && !c.query && (c.query = u.query),
                h.socket(u.path, c)
        }
        t.protocol = n.protocol,
            t.connect = s,
            t.Manager = Rd,
            t.Socket = al.exports
    }
)(Bs, Bs.exports);
var RA = Bs.exports
    , sl = {
    exports: {}
}
    , Wi = {}
    , ll = {
    exports: {}
}
    , xn = 1e3
    , Sn = xn * 60
    , On = Sn * 60
    , jr = On * 24
    , xb = jr * 7
    , Sb = jr * 365.25
    , Ob = function(e, t) {
    t = t || {};
    var r = typeof e;
    if (r === "string" && e.length > 0)
        return Eb(e);
    if (r === "number" && isFinite(e))
        return t.long ? Ab(e) : Fb(e);
    throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(e))
};
function Eb(e) {
    if (e = String(e),
        !(e.length > 100)) {
        var t = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(e);
        if (!!t) {
            var r = parseFloat(t[1])
                , n = (t[2] || "ms").toLowerCase();
            switch (n) {
                case "years":
                case "year":
                case "yrs":
                case "yr":
                case "y":
                    return r * Sb;
                case "weeks":
                case "week":
                case "w":
                    return r * xb;
                case "days":
                case "day":
                case "d":
                    return r * jr;
                case "hours":
                case "hour":
                case "hrs":
                case "hr":
                case "h":
                    return r * On;
                case "minutes":
                case "minute":
                case "mins":
                case "min":
                case "m":
                    return r * Sn;
                case "seconds":
                case "second":
                case "secs":
                case "sec":
                case "s":
                    return r * xn;
                case "milliseconds":
                case "millisecond":
                case "msecs":
                case "msec":
                case "ms":
                    return r;
                default:
                    return
            }
        }
    }
}
function Fb(e) {
    var t = Math.abs(e);
    return t >= jr ? Math.round(e / jr) + "d" : t >= On ? Math.round(e / On) + "h" : t >= Sn ? Math.round(e / Sn) + "m" : t >= xn ? Math.round(e / xn) + "s" : e + "ms"
}
function Ab(e) {
    var t = Math.abs(e);
    return t >= jr ? qi(e, t, jr, "day") : t >= On ? qi(e, t, On, "hour") : t >= Sn ? qi(e, t, Sn, "minute") : t >= xn ? qi(e, t, xn, "second") : e + " ms"
}
function qi(e, t, r, n) {
    var o = t >= r * 1.5;
    return Math.round(e / r) + " " + n + (o ? "s" : "")
}
function kb(e) {
    r.debug = r,
        r.default = r,
        r.coerce = l,
        r.disable = i,
        r.enable = o,
        r.enabled = a,
        r.humanize = Ob,
        r.destroy = c,
        Object.keys(e).forEach(u => {
                r[u] = e[u]
            }
        ),
        r.names = [],
        r.skips = [],
        r.formatters = {};
    function t(u) {
        let f = 0;
        for (let d = 0; d < u.length; d++)
            f = (f << 5) - f + u.charCodeAt(d),
                f |= 0;
        return r.colors[Math.abs(f) % r.colors.length]
    }
    r.selectColor = t;
    function r(u) {
        let f, d = null, p, g;
        function m(...h) {
            if (!m.enabled)
                return;
            const v = m
                , w = Number(new Date)
                , S = w - (f || w);
            v.diff = S,
                v.prev = f,
                v.curr = w,
                f = w,
                h[0] = r.coerce(h[0]),
            typeof h[0] != "string" && h.unshift("%O");
            let b = 0;
            h[0] = h[0].replace(/%([a-zA-Z%])/g, (C, _) => {
                    if (C === "%%")
                        return "%";
                    b++;
                    const E = r.formatters[_];
                    if (typeof E == "function") {
                        const A = h[b];
                        C = E.call(v, A),
                            h.splice(b, 1),
                            b--
                    }
                    return C
                }
            ),
                r.formatArgs.call(v, h),
                (v.log || r.log).apply(v, h)
        }
        return m.namespace = u,
            m.useColors = r.useColors(),
            m.color = r.selectColor(u),
            m.extend = n,
            m.destroy = r.destroy,
            Object.defineProperty(m, "enabled", {
                enumerable: !0,
                configurable: !1,
                get: () => d !== null ? d : (p !== r.namespaces && (p = r.namespaces,
                    g = r.enabled(u)),
                    g),
                set: h => {
                    d = h
                }
            }),
        typeof r.init == "function" && r.init(m),
            m
    }
    function n(u, f) {
        const d = r(this.namespace + (typeof f == "undefined" ? ":" : f) + u);
        return d.log = this.log,
            d
    }
    function o(u) {
        r.save(u),
            r.namespaces = u,
            r.names = [],
            r.skips = [];
        let f;
        const d = (typeof u == "string" ? u : "").split(/[\s,]+/)
            , p = d.length;
        for (f = 0; f < p; f++)
            !d[f] || (u = d[f].replace(/\*/g, ".*?"),
                u[0] === "-" ? r.skips.push(new RegExp("^" + u.substr(1) + "$")) : r.names.push(new RegExp("^" + u + "$")))
    }
    function i() {
        const u = [...r.names.map(s), ...r.skips.map(s).map(f => "-" + f)].join(",");
        return r.enable(""),
            u
    }
    function a(u) {
        if (u[u.length - 1] === "*")
            return !0;
        let f, d;
        for (f = 0,
                 d = r.skips.length; f < d; f++)
            if (r.skips[f].test(u))
                return !1;
        for (f = 0,
                 d = r.names.length; f < d; f++)
            if (r.names[f].test(u))
                return !0;
        return !1
    }
    function s(u) {
        return u.toString().substring(2, u.toString().length - 2).replace(/\.\*\?$/, "*")
    }
    function l(u) {
        return u instanceof Error ? u.stack || u.message : u
    }
    function c() {
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.")
    }
    return r.enable(r.load()),
        r
}
var Pb = kb;
(function(e, t) {
        t.formatArgs = n,
            t.save = o,
            t.load = i,
            t.useColors = r,
            t.storage = a(),
            t.destroy = ( () => {
                    let l = !1;
                    return () => {
                        l || (l = !0,
                            console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."))
                    }
                }
            )(),
            t.colors = ["#0000CC", "#0000FF", "#0033CC", "#0033FF", "#0066CC", "#0066FF", "#0099CC", "#0099FF", "#00CC00", "#00CC33", "#00CC66", "#00CC99", "#00CCCC", "#00CCFF", "#3300CC", "#3300FF", "#3333CC", "#3333FF", "#3366CC", "#3366FF", "#3399CC", "#3399FF", "#33CC00", "#33CC33", "#33CC66", "#33CC99", "#33CCCC", "#33CCFF", "#6600CC", "#6600FF", "#6633CC", "#6633FF", "#66CC00", "#66CC33", "#9900CC", "#9900FF", "#9933CC", "#9933FF", "#99CC00", "#99CC33", "#CC0000", "#CC0033", "#CC0066", "#CC0099", "#CC00CC", "#CC00FF", "#CC3300", "#CC3333", "#CC3366", "#CC3399", "#CC33CC", "#CC33FF", "#CC6600", "#CC6633", "#CC9900", "#CC9933", "#CCCC00", "#CCCC33", "#FF0000", "#FF0033", "#FF0066", "#FF0099", "#FF00CC", "#FF00FF", "#FF3300", "#FF3333", "#FF3366", "#FF3399", "#FF33CC", "#FF33FF", "#FF6600", "#FF6633", "#FF9900", "#FF9933", "#FFCC00", "#FFCC33"];
        function r() {
            return typeof window != "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs) ? !0 : typeof navigator != "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/) ? !1 : typeof document != "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window != "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator != "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || typeof navigator != "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/)
        }
        function n(l) {
            if (l[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + l[0] + (this.useColors ? "%c " : " ") + "+" + e.exports.humanize(this.diff),
                !this.useColors)
                return;
            const c = "color: " + this.color;
            l.splice(1, 0, c, "color: inherit");
            let u = 0
                , f = 0;
            l[0].replace(/%[a-zA-Z%]/g, d => {
                    d !== "%%" && (u++,
                    d === "%c" && (f = u))
                }
            ),
                l.splice(f, 0, c)
        }
        t.log = console.debug || console.log || ( () => {}
        );
        function o(l) {
            try {
                l ? t.storage.setItem("debug", l) : t.storage.removeItem("debug")
            } catch {}
        }
        function i() {
            let l;
            try {
                l = t.storage.getItem("debug")
            } catch {}
            return !l && typeof process != "undefined" && "env"in process && (l = {}.DEBUG),
                l
        }
        function a() {
            try {
                return localStorage
            } catch {}
        }
        e.exports = Pb(t);
        const {formatters: s} = e.exports;
        s.j = function(l) {
            try {
                return JSON.stringify(l)
            } catch (c) {
                return "[UnexpectedJSONParseError]: " + c.message
            }
        }
    }
)(ll, ll.exports);
const Id = ll.exports("@feathersjs/errors");
function pe(e, t, r, n, o) {
    e = e || "Error";
    let i, a, s;
    e instanceof Error ? (a = e.message || "Error",
    e.errors && (i = e.errors)) : typeof e == "object" ? (a = e.message || "Error",
        o = e) : a = e,
    o && (s = JSON.parse(JSON.stringify(o)),
        s.errors ? (i = s.errors,
            delete s.errors) : o.errors && (i = JSON.parse(JSON.stringify(o.errors)))),
        this.type = "FeathersError",
        this.name = t,
        this.message = a,
        this.code = r,
        this.className = n,
        this.data = s,
        this.errors = i || {},
        Id(`${this.name}(${this.code}): ${this.message}`),
        Id(this.errors),
        Error.captureStackTrace ? Error.captureStackTrace(this, pe) : this.stack = new Error().stack
}
function Ge(e, t) {
    e.prototype = Object.create(t.prototype),
        e.prototype.constructor = e
}
Ge(pe, Error);
Object.defineProperty(pe.prototype, "toJSON", {
    value: function() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            className: this.className,
            data: this.data,
            errors: this.errors
        }
    }
});
function ul(e, t) {
    pe.call(this, e, "BadRequest", 400, "bad-request", t)
}
Ge(ul, pe);
function cl(e, t) {
    pe.call(this, e, "NotAuthenticated", 401, "not-authenticated", t)
}
Ge(cl, pe);
function fl(e, t) {
    pe.call(this, e, "PaymentError", 402, "payment-error", t)
}
Ge(fl, pe);
function dl(e, t) {
    pe.call(this, e, "Forbidden", 403, "forbidden", t)
}
Ge(dl, pe);
function pl(e, t) {
    pe.call(this, e, "NotFound", 404, "not-found", t)
}
Ge(pl, pe);
function hl(e, t) {
    pe.call(this, e, "MethodNotAllowed", 405, "method-not-allowed", t)
}
Ge(hl, pe);
function vl(e, t) {
    pe.call(this, e, "NotAcceptable", 406, "not-acceptable", t)
}
Ge(vl, pe);
function ml(e, t) {
    pe.call(this, e, "Timeout", 408, "timeout", t)
}
Ge(ml, pe);
function gl(e, t) {
    pe.call(this, e, "Conflict", 409, "conflict", t)
}
Ge(gl, pe);
function yl(e, t) {
    pe(this, e, "Gone", 410, "gone")
}
Ge(yl, pe);
function bl(e, t) {
    pe.call(this, e, "LengthRequired", 411, "length-required", t)
}
Ge(bl, pe);
function wl(e, t) {
    pe.call(this, e, "Unprocessable", 422, "unprocessable", t)
}
Ge(wl, pe);
function Cl(e, t) {
    pe.call(this, e, "TooManyRequests", 429, "too-many-requests", t)
}
Ge(Cl, pe);
function _l(e, t) {
    pe.call(this, e, "GeneralError", 500, "general-error", t)
}
Ge(_l, pe);
function xl(e, t) {
    pe.call(this, e, "NotImplemented", 501, "not-implemented", t)
}
Ge(xl, pe);
function Sl(e, t) {
    pe.call(this, e, "BadGateway", 502, "bad-gateway", t)
}
Ge(Sl, pe);
function Ol(e, t) {
    pe.call(this, e, "Unavailable", 503, "unavailable", t)
}
Ge(Ol, pe);
const Dd = {
    FeathersError: pe,
    BadRequest: ul,
    NotAuthenticated: cl,
    PaymentError: fl,
    Forbidden: dl,
    NotFound: pl,
    MethodNotAllowed: hl,
    NotAcceptable: vl,
    Timeout: ml,
    Conflict: gl,
    Gone: yl,
    LengthRequired: bl,
    Unprocessable: wl,
    TooManyRequests: Cl,
    GeneralError: _l,
    NotImplemented: xl,
    BadGateway: Sl,
    Unavailable: Ol,
    400: ul,
    401: cl,
    402: fl,
    403: dl,
    404: pl,
    405: hl,
    406: vl,
    408: ml,
    409: gl,
    410: yl,
    411: bl,
    422: wl,
    429: Cl,
    500: _l,
    501: xl,
    502: Sl,
    503: Ol
};
function Tb(e) {
    if (!e)
        return e;
    const t = Dd[e.name]
        , r = t ? new t(e.message,e.data) : new Error(e.message || e);
    return typeof e == "object" && Object.assign(r, e),
        r
}
var Bd = Object.assign({
    convert: Tb
}, Dd)
    , Hr = {};
Object.defineProperty(Hr, "__esModule", {
    value: !0
});
Hr.StorageWrapper = Hr.MemoryStorage = void 0;
class $b {
    constructor() {
        this.store = {}
    }
    getItem(t) {
        return Promise.resolve(this.store[t])
    }
    setItem(t, r) {
        return Promise.resolve(this.store[t] = r)
    }
    removeItem(t) {
        const r = this.store[t];
        return delete this.store[t],
            Promise.resolve(r)
    }
}
Hr.MemoryStorage = $b;
class Mb {
    constructor(t) {
        this.storage = t
    }
    getItem(t) {
        return Promise.resolve(this.storage.getItem(t))
    }
    setItem(t, r) {
        return Promise.resolve(this.storage.setItem(t, r))
    }
    removeItem(t) {
        return Promise.resolve(this.storage.removeItem(t))
    }
}
Hr.StorageWrapper = Mb;
Object.defineProperty(Wi, "__esModule", {
    value: !0
});
Wi.AuthenticationClient = void 0;
const Nd = Bd
    , Rb = Hr
    , Ld = (e, t) => {
        const r = new RegExp(`(?:&?)${t}=([^&]*)`)
            , n = e.hash ? e.hash.match(r) : null;
        if (n !== null) {
            const [,o] = n;
            return [o, r]
        }
        return [null, r]
    }
;
class Ib {
    constructor(t, r) {
        const n = t.io || t.primus
            , o = new Rb.StorageWrapper(t.get("storage") || r.storage);
        this.app = t,
            this.options = r,
            this.authenticated = !1,
            this.app.set("storage", o),
        n && this.handleSocket(n)
    }
    get service() {
        return this.app.service(this.options.path)
    }
    get storage() {
        return this.app.get("storage")
    }
    handleSocket(t) {
        const r = this.app.io ? "connect" : "open"
            , n = this.app.io ? "disconnect" : "disconnection";
        t.on(n, () => {
                const o = new Promise(i => t.once(r, a => i(a))).then( () => this.authenticated ? this.reAuthenticate(!0) : null);
                this.app.set("authentication", o)
            }
        )
    }
    getFromLocation(t) {
        const [r,n] = Ld(t, this.options.locationKey);
        if (r !== null)
            return t.hash = t.hash.replace(n, ""),
                Promise.resolve(r);
        const [o,i] = Ld(t, this.options.locationErrorKey);
        return o !== null ? (t.hash = t.hash.replace(i, ""),
            Promise.reject(new Nd.NotAuthenticated(decodeURIComponent(o)))) : Promise.resolve(null)
    }
    setAccessToken(t) {
        return this.storage.setItem(this.options.storageKey, t)
    }
    getAccessToken() {
        return this.storage.getItem(this.options.storageKey).then(t => !t && typeof window != "undefined" && window.location ? this.getFromLocation(window.location) : t || null)
    }
    removeAccessToken() {
        return this.storage.removeItem(this.options.storageKey)
    }
    reset() {
        return this.app.set("authentication", null),
            this.authenticated = !1,
            Promise.resolve(null)
    }
    handleError(t, r) {
        if (t.code === 401 || t.code === 403) {
            const n = this.removeAccessToken().then( () => this.reset());
            return r === "logout" ? n : n.then( () => Promise.reject(t))
        }
        return Promise.reject(t)
    }
    reAuthenticate(t=!1, r) {
        const n = this.app.get("authentication");
        return !n || t === !0 ? this.getAccessToken().then(o => {
                if (!o)
                    throw new Nd.NotAuthenticated("No accessToken found in storage");
                return this.authenticate({
                    strategy: r || this.options.jwtStrategy,
                    accessToken: o
                })
            }
        ) : n
    }
    authenticate(t, r) {
        if (!t)
            return this.reAuthenticate();
        const n = this.service.create(t, r).then(o => {
                const {accessToken: i} = o;
                return this.authenticated = !0,
                    this.app.emit("login", o),
                    this.app.emit("authenticated", o),
                    this.setAccessToken(i).then( () => o)
            }
        ).catch(o => this.handleError(o, "authenticate"));
        return this.app.set("authentication", n),
            n
    }
    logout() {
        return Promise.resolve(this.app.get("authentication")).then( () => this.service.remove(null).then(t => this.removeAccessToken().then( () => this.reset()).then( () => (this.app.emit("logout", t),
            t)))).catch(t => this.handleError(t, "logout"))
    }
}
Wi.AuthenticationClient = Ib;
var jd = {}
    , zi = {}
    , So = {}
    , Ue = {}
    , El = {};
(function(e) {
        Object.defineProperty(e, "__esModule", {
            value: !0
        }),
            e.createSymbol = e.makeUrl = e.isPromise = e._ = e.stripSlashes = void 0;
        function t(i) {
            return i.replace(/^(\/+)|(\/+)$/g, "")
        }
        e.stripSlashes = t,
            e._ = {
                each(i, a) {
                    i && typeof i.forEach == "function" ? i.forEach(a) : e._.isObject(i) && Object.keys(i).forEach(s => a(i[s], s))
                },
                some(i, a) {
                    return Object.keys(i).map(s => [i[s], s]).some( ([s,l]) => a(s, l))
                },
                every(i, a) {
                    return Object.keys(i).map(s => [i[s], s]).every( ([s,l]) => a(s, l))
                },
                keys(i) {
                    return Object.keys(i)
                },
                values(i) {
                    return e._.keys(i).map(a => i[a])
                },
                isMatch(i, a) {
                    return e._.keys(a).every(s => i[s] === a[s])
                },
                isEmpty(i) {
                    return e._.keys(i).length === 0
                },
                isObject(i) {
                    return typeof i == "object" && !Array.isArray(i) && i !== null
                },
                isObjectOrArray(i) {
                    return typeof i == "object" && i !== null
                },
                extend(i, ...a) {
                    return Object.assign(i, ...a)
                },
                omit(i, ...a) {
                    const s = e._.extend({}, i);
                    return a.forEach(l => delete s[l]),
                        s
                },
                pick(i, ...a) {
                    return a.reduce( (s, l) => (i[l] !== void 0 && (s[l] = i[l]),
                        s), {})
                },
                merge(i, a) {
                    return e._.isObject(i) && e._.isObject(a) && Object.keys(a).forEach(s => {
                            e._.isObject(a[s]) ? (i[s] || Object.assign(i, {
                                [s]: {}
                            }),
                                e._.merge(i[s], a[s])) : Object.assign(i, {
                                [s]: a[s]
                            })
                        }
                    ),
                        i
                }
            };
        function r(i) {
            return e._.isObject(i) && typeof i.then == "function"
        }
        e.isPromise = r;
        function n(i, a={}) {
            const s = typeof a.get == "function" ? a.get.bind(a) : () => {}
                , l = s("env") || "production"
                , c = s("host") || {}.HOST_NAME || "localhost"
                , u = l === "development" || l === "test" || l === void 0 ? "http" : "https"
                , f = s("port") || {}.PORT || 3030
                , d = l === "development" || l === "test" || l === void 0 ? `:${f}` : "";
            return i = i || "",
                `${u}://${c}${d}/${e.stripSlashes(i)}`
        }
        e.makeUrl = n;
        function o(i) {
            return typeof Symbol != "undefined" ? Symbol(i) : i
        }
        e.createSymbol = o
    }
)(El);
Object.defineProperty(Ue, "__esModule", {
    value: !0
});
Ue.enableHooks = Ue.processHooks = Ue.getHooks = Ue.isHookObject = Ue.convertHookData = Ue.makeArguments = Ue.defaultMakeArguments = Ue.createHookObject = Ue.ACTIVATE_HOOKS = void 0;
const Hd = El
    , {each: Fl, pick: Db} = Hd._;
Ue.ACTIVATE_HOOKS = (0,
    Hd.createSymbol)("__feathersActivateHooks");
function Bb(e, t={}) {
    const r = {};
    return Object.defineProperty(r, "toJSON", {
        value() {
            return Db(this, "type", "method", "path", "params", "id", "data", "result", "error")
        }
    }),
        Object.assign(r, t, {
            method: e,
            get path() {
                const {app: n, service: o} = t;
                return !o || !n || !n.services ? null : Object.keys(n.services).find(i => n.services[i] === o)
            }
        })
}
Ue.createHookObject = Bb;
function Ud(e) {
    const t = [];
    return typeof e.id != "undefined" && t.push(e.id),
    e.data && t.push(e.data),
        t.push(e.params || {}),
        t
}
Ue.defaultMakeArguments = Ud;
function Nb(e) {
    switch (e.method) {
        case "find":
            return [e.params];
        case "get":
        case "remove":
            return [e.id, e.params];
        case "update":
        case "patch":
            return [e.id, e.data, e.params];
        case "create":
            return [e.data, e.params]
    }
    return Ud(e)
}
Ue.makeArguments = Nb;
function Wd(e) {
    let t = {};
    return Array.isArray(e) ? t = {
        all: e
    } : typeof e != "object" ? t = {
        all: [e]
    } : Fl(e, function(r, n) {
        t[n] = Array.isArray(r) ? r : [r]
    }),
        t
}
Ue.convertHookData = Wd;
function qd(e) {
    return typeof e == "object" && typeof e.method == "string" && typeof e.type == "string"
}
Ue.isHookObject = qd;
function Lb(e, t, r, n, o=!1) {
    const i = e.__hooks[r][n] || []
        , a = t.__hooks[r][n] || [];
    return o ? a.concat(i) : i.concat(a)
}
Ue.getHooks = Lb;
function jb(e, t) {
    let r = t;
    const n = i => {
            if (i) {
                if (!qd(i))
                    throw new Error(`${r.type} hook for '${r.method}' method returned invalid hook object`);
                r = i
            }
            return r
        }
    ;
    return e.reduce( (i, a) => {
            const s = a.bind(this);
            return i.then(l => s(l)).then(n)
        }
        , Promise.resolve(r)).then( () => r).catch(i => {
            throw i.hook = r,
                i
        }
    )
}
Ue.processHooks = jb;
function Hb(e, t, r) {
    if (typeof e.hooks == "function")
        return e;
    const n = {};
    return r.forEach(o => {
            n[o] = {}
        }
    ),
        Object.defineProperty(e, "__hooks", {
            configurable: !0,
            value: n,
            writable: !0
        }),
        Object.assign(e, {
            hooks(o) {
                return Fl(o, (i, a) => {
                        if (!this.__hooks[a])
                            throw new Error(`'${a}' is not a valid hook type`);
                        const s = Wd(i);
                        Fl(s, (l, c) => {
                                if (c !== "all" && t.indexOf(c) === -1)
                                    throw new Error(`'${c}' is not a valid hook method`)
                            }
                        ),
                            t.forEach(l => {
                                    const c = this.__hooks[a][l] || (this.__hooks[a][l] = []);
                                    s.all && c.push.apply(c, s.all),
                                    s[l] && c.push.apply(c, s[l])
                                }
                            )
                    }
                ),
                    this
            }
        })
}
Ue.enableHooks = Hb;
(function(e) {
        var t = Le && Le.__createBinding || (Object.create ? function(a, s, l, c) {
                        c === void 0 && (c = l);
                        var u = Object.getOwnPropertyDescriptor(s, l);
                        (!u || ("get"in u ? !s.__esModule : u.writable || u.configurable)) && (u = {
                            enumerable: !0,
                            get: function() {
                                return s[l]
                            }
                        }),
                            Object.defineProperty(a, c, u)
                    }
                    : function(a, s, l, c) {
                        c === void 0 && (c = l),
                            a[c] = s[l]
                    }
            )
            , r = Le && Le.__setModuleDefault || (Object.create ? function(a, s) {
                        Object.defineProperty(a, "default", {
                            enumerable: !0,
                            value: s
                        })
                    }
                    : function(a, s) {
                        a.default = s
                    }
            )
            , n = Le && Le.__importStar || function(a) {
                if (a && a.__esModule)
                    return a;
                var s = {};
                if (a != null)
                    for (var l in a)
                        l !== "default" && Object.prototype.hasOwnProperty.call(a, l) && t(s, a, l);
                return r(s, a),
                    s
            }
            , o = Le && Le.__exportStar || function(a, s) {
                for (var l in a)
                    l !== "default" && !Object.prototype.hasOwnProperty.call(s, l) && t(s, a, l)
            }
        ;
        Object.defineProperty(e, "__esModule", {
            value: !0
        }),
            e.hooks = void 0;
        const i = n(Ue);
        o(El, e),
            e.hooks = i
    }
)(So);
Object.defineProperty(zi, "__esModule", {
    value: !0
});
zi.authentication = void 0;
const Ub = So
    , Wb = () => e => {
        const {app: t, params: r, path: n, method: o, app: {authentication: i}} = e;
        return (0,
            Ub.stripSlashes)(i.options.path) === n && o === "create" ? e : Promise.resolve(t.get("authentication")).then(a => (a && (e.params = Object.assign({}, a, r)),
            e))
    }
;
zi.authentication = Wb;
var Vi = {};
Object.defineProperty(Vi, "__esModule", {
    value: !0
});
Vi.populateHeader = void 0;
const qb = () => e => {
        const {app: t, params: {accessToken: r}} = e
            , n = t.authentication;
        if (t.rest && r) {
            const {scheme: o, header: i} = n.options
                , a = `${o} ${r}`;
            e.params.headers = Object.assign({}, {
                [i]: a
            }, e.params.headers)
        }
        return e
    }
;
Vi.populateHeader = qb;
(function(e) {
        Object.defineProperty(e, "__esModule", {
            value: !0
        }),
            e.populateHeader = e.authentication = void 0;
        var t = zi;
        Object.defineProperty(e, "authentication", {
            enumerable: !0,
            get: function() {
                return t.authentication
            }
        });
        var r = Vi;
        Object.defineProperty(e, "populateHeader", {
            enumerable: !0,
            get: function() {
                return r.populateHeader
            }
        })
    }
)(jd);
(function(e, t) {
        var r = Le && Le.__createBinding || (Object.create ? function(u, f, d, p) {
                        p === void 0 && (p = d),
                            Object.defineProperty(u, p, {
                                enumerable: !0,
                                get: function() {
                                    return f[d]
                                }
                            })
                    }
                    : function(u, f, d, p) {
                        p === void 0 && (p = d),
                            u[p] = f[d]
                    }
            )
            , n = Le && Le.__setModuleDefault || (Object.create ? function(u, f) {
                        Object.defineProperty(u, "default", {
                            enumerable: !0,
                            value: f
                        })
                    }
                    : function(u, f) {
                        u.default = f
                    }
            )
            , o = Le && Le.__importStar || function(u) {
                if (u && u.__esModule)
                    return u;
                var f = {};
                if (u != null)
                    for (var d in u)
                        d !== "default" && Object.prototype.hasOwnProperty.call(u, d) && r(f, u, d);
                return n(f, u),
                    f
            }
        ;
        Object.defineProperty(t, "__esModule", {
            value: !0
        }),
            t.defaults = t.defaultStorage = t.hooks = t.MemoryStorage = t.AuthenticationClient = t.getDefaultStorage = void 0;
        const i = Wi;
        Object.defineProperty(t, "AuthenticationClient", {
            enumerable: !0,
            get: function() {
                return i.AuthenticationClient
            }
        });
        const a = o(jd);
        t.hooks = a;
        const s = Hr;
        Object.defineProperty(t, "MemoryStorage", {
            enumerable: !0,
            get: function() {
                return s.MemoryStorage
            }
        });
        const l = () => {
                try {
                    return new s.StorageWrapper(window.localStorage)
                } catch {}
                return new s.MemoryStorage
            }
        ;
        t.getDefaultStorage = l,
            t.defaultStorage = (0,
                t.getDefaultStorage)(),
            t.defaults = {
                header: "Authorization",
                scheme: "Bearer",
                storageKey: "feathers-jwt",
                locationKey: "access_token",
                locationErrorKey: "error",
                jwtStrategy: "jwt",
                path: "/authentication",
                Authentication: i.AuthenticationClient,
                storage: t.defaultStorage
            };
        const c = (u={}) => {
                const f = Object.assign({}, t.defaults, u)
                    , {Authentication: d} = f;
                return p => {
                    const g = new d(p,f);
                    p.authentication = g,
                        p.authenticate = g.authenticate.bind(g),
                        p.reAuthenticate = g.reAuthenticate.bind(g),
                        p.logout = g.logout.bind(g),
                        p.hooks({
                            before: {
                                all: [a.authentication(), a.populateHeader()]
                            }
                        })
                }
            }
        ;
        t.default = c,
            e.exports = Object.assign(c, e.exports)
    }
)(sl, sl.exports);
var IA = K0(sl.exports)
    , Al = {
    exports: {}
}
    , Ki = {
    exports: {}
};
(function(e, t) {
        (function(r, n) {
                e.exports = n()
            }
        )(Le, function() {
            var r = typeof Object.getOwnPropertySymbols == "function";
            function n(o, i, a, s) {
                var l = typeof i == "function"
                    , c = function() {
                    var u = this._super;
                    this._super = l ? i : o[a];
                    var f = s.apply(this, arguments);
                    return this._super = u,
                        f
                };
                return l && (Object.keys(i).forEach(function(u) {
                    c[u] = i[u]
                }),
                r && Object.getOwnPropertySymbols(i).forEach(function(u) {
                    c[u] = i[u]
                })),
                    c
            }
            return {
                create: function() {
                    var o = Object.create(this)
                        , i = typeof o.__init == "string" ? o.__init : "init";
                    return typeof o[i] == "function" && o[i].apply(o, arguments),
                        o
                },
                mixin: function(o, i) {
                    var a = i || this
                        , s = /\b_super\b/
                        , l = Object.getPrototypeOf(a) || a.prototype
                        , c = {}
                        , u = o
                        , f = function(p) {
                        var g = Object.getOwnPropertyDescriptor(u, p);
                        !c[p] && g && (c[p] = g)
                    };
                    do
                        Object.getOwnPropertyNames(u).forEach(f),
                        r && Object.getOwnPropertySymbols(u).forEach(f);
                    while ((u = Object.getPrototypeOf(u)) && Object.getPrototypeOf(u));
                    var d = function(p) {
                        var g = c[p];
                        typeof g.value == "function" && s.test(g.value) && (g.value = n(l, a[p], p, g.value)),
                            Object.defineProperty(a, p, g)
                    };
                    return Object.keys(c).forEach(d),
                    r && Object.getOwnPropertySymbols(c).forEach(d),
                        a
                },
                extend: function(o, i) {
                    return this.mixin(o, Object.create(i || this))
                },
                proxy: function(o) {
                    var i = this[o]
                        , a = Array.prototype.slice.call(arguments, 1);
                    return a.unshift(this),
                        i.bind.apply(i, a)
                }
            }
        })
    }
)(Ki);
var kl = {
    exports: {}
}
    , En = 1e3
    , Fn = En * 60
    , An = Fn * 60
    , Ur = An * 24
    , zb = Ur * 7
    , Vb = Ur * 365.25
    , Kb = function(e, t) {
    t = t || {};
    var r = typeof e;
    if (r === "string" && e.length > 0)
        return Gb(e);
    if (r === "number" && isFinite(e))
        return t.long ? Xb(e) : Yb(e);
    throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(e))
};
function Gb(e) {
    if (e = String(e),
        !(e.length > 100)) {
        var t = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(e);
        if (!!t) {
            var r = parseFloat(t[1])
                , n = (t[2] || "ms").toLowerCase();
            switch (n) {
                case "years":
                case "year":
                case "yrs":
                case "yr":
                case "y":
                    return r * Vb;
                case "weeks":
                case "week":
                case "w":
                    return r * zb;
                case "days":
                case "day":
                case "d":
                    return r * Ur;
                case "hours":
                case "hour":
                case "hrs":
                case "hr":
                case "h":
                    return r * An;
                case "minutes":
                case "minute":
                case "mins":
                case "min":
                case "m":
                    return r * Fn;
                case "seconds":
                case "second":
                case "secs":
                case "sec":
                case "s":
                    return r * En;
                case "milliseconds":
                case "millisecond":
                case "msecs":
                case "msec":
                case "ms":
                    return r;
                default:
                    return
            }
        }
    }
}
function Yb(e) {
    var t = Math.abs(e);
    return t >= Ur ? Math.round(e / Ur) + "d" : t >= An ? Math.round(e / An) + "h" : t >= Fn ? Math.round(e / Fn) + "m" : t >= En ? Math.round(e / En) + "s" : e + "ms"
}
function Xb(e) {
    var t = Math.abs(e);
    return t >= Ur ? Gi(e, t, Ur, "day") : t >= An ? Gi(e, t, An, "hour") : t >= Fn ? Gi(e, t, Fn, "minute") : t >= En ? Gi(e, t, En, "second") : e + " ms"
}
function Gi(e, t, r, n) {
    var o = t >= r * 1.5;
    return Math.round(e / r) + " " + n + (o ? "s" : "")
}
function Jb(e) {
    r.debug = r,
        r.default = r,
        r.coerce = l,
        r.disable = i,
        r.enable = o,
        r.enabled = a,
        r.humanize = Kb,
        r.destroy = c,
        Object.keys(e).forEach(u => {
                r[u] = e[u]
            }
        ),
        r.names = [],
        r.skips = [],
        r.formatters = {};
    function t(u) {
        let f = 0;
        for (let d = 0; d < u.length; d++)
            f = (f << 5) - f + u.charCodeAt(d),
                f |= 0;
        return r.colors[Math.abs(f) % r.colors.length]
    }
    r.selectColor = t;
    function r(u) {
        let f, d = null, p, g;
        function m(...h) {
            if (!m.enabled)
                return;
            const v = m
                , w = Number(new Date)
                , S = w - (f || w);
            v.diff = S,
                v.prev = f,
                v.curr = w,
                f = w,
                h[0] = r.coerce(h[0]),
            typeof h[0] != "string" && h.unshift("%O");
            let b = 0;
            h[0] = h[0].replace(/%([a-zA-Z%])/g, (C, _) => {
                    if (C === "%%")
                        return "%";
                    b++;
                    const E = r.formatters[_];
                    if (typeof E == "function") {
                        const A = h[b];
                        C = E.call(v, A),
                            h.splice(b, 1),
                            b--
                    }
                    return C
                }
            ),
                r.formatArgs.call(v, h),
                (v.log || r.log).apply(v, h)
        }
        return m.namespace = u,
            m.useColors = r.useColors(),
            m.color = r.selectColor(u),
            m.extend = n,
            m.destroy = r.destroy,
            Object.defineProperty(m, "enabled", {
                enumerable: !0,
                configurable: !1,
                get: () => d !== null ? d : (p !== r.namespaces && (p = r.namespaces,
                    g = r.enabled(u)),
                    g),
                set: h => {
                    d = h
                }
            }),
        typeof r.init == "function" && r.init(m),
            m
    }
    function n(u, f) {
        const d = r(this.namespace + (typeof f == "undefined" ? ":" : f) + u);
        return d.log = this.log,
            d
    }
    function o(u) {
        r.save(u),
            r.namespaces = u,
            r.names = [],
            r.skips = [];
        let f;
        const d = (typeof u == "string" ? u : "").split(/[\s,]+/)
            , p = d.length;
        for (f = 0; f < p; f++)
            !d[f] || (u = d[f].replace(/\*/g, ".*?"),
                u[0] === "-" ? r.skips.push(new RegExp("^" + u.substr(1) + "$")) : r.names.push(new RegExp("^" + u + "$")))
    }
    function i() {
        const u = [...r.names.map(s), ...r.skips.map(s).map(f => "-" + f)].join(",");
        return r.enable(""),
            u
    }
    function a(u) {
        if (u[u.length - 1] === "*")
            return !0;
        let f, d;
        for (f = 0,
                 d = r.skips.length; f < d; f++)
            if (r.skips[f].test(u))
                return !1;
        for (f = 0,
                 d = r.names.length; f < d; f++)
            if (r.names[f].test(u))
                return !0;
        return !1
    }
    function s(u) {
        return u.toString().substring(2, u.toString().length - 2).replace(/\.\*\?$/, "*")
    }
    function l(u) {
        return u instanceof Error ? u.stack || u.message : u
    }
    function c() {
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.")
    }
    return r.enable(r.load()),
        r
}
var Qb = Jb;
(function(e, t) {
        t.formatArgs = n,
            t.save = o,
            t.load = i,
            t.useColors = r,
            t.storage = a(),
            t.destroy = ( () => {
                    let l = !1;
                    return () => {
                        l || (l = !0,
                            console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."))
                    }
                }
            )(),
            t.colors = ["#0000CC", "#0000FF", "#0033CC", "#0033FF", "#0066CC", "#0066FF", "#0099CC", "#0099FF", "#00CC00", "#00CC33", "#00CC66", "#00CC99", "#00CCCC", "#00CCFF", "#3300CC", "#3300FF", "#3333CC", "#3333FF", "#3366CC", "#3366FF", "#3399CC", "#3399FF", "#33CC00", "#33CC33", "#33CC66", "#33CC99", "#33CCCC", "#33CCFF", "#6600CC", "#6600FF", "#6633CC", "#6633FF", "#66CC00", "#66CC33", "#9900CC", "#9900FF", "#9933CC", "#9933FF", "#99CC00", "#99CC33", "#CC0000", "#CC0033", "#CC0066", "#CC0099", "#CC00CC", "#CC00FF", "#CC3300", "#CC3333", "#CC3366", "#CC3399", "#CC33CC", "#CC33FF", "#CC6600", "#CC6633", "#CC9900", "#CC9933", "#CCCC00", "#CCCC33", "#FF0000", "#FF0033", "#FF0066", "#FF0099", "#FF00CC", "#FF00FF", "#FF3300", "#FF3333", "#FF3366", "#FF3399", "#FF33CC", "#FF33FF", "#FF6600", "#FF6633", "#FF9900", "#FF9933", "#FFCC00", "#FFCC33"];
        function r() {
            return typeof window != "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs) ? !0 : typeof navigator != "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/) ? !1 : typeof document != "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window != "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator != "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || typeof navigator != "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/)
        }
        function n(l) {
            if (l[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + l[0] + (this.useColors ? "%c " : " ") + "+" + e.exports.humanize(this.diff),
                !this.useColors)
                return;
            const c = "color: " + this.color;
            l.splice(1, 0, c, "color: inherit");
            let u = 0
                , f = 0;
            l[0].replace(/%[a-zA-Z%]/g, d => {
                    d !== "%%" && (u++,
                    d === "%c" && (f = u))
                }
            ),
                l.splice(f, 0, c)
        }
        t.log = console.debug || console.log || ( () => {}
        );
        function o(l) {
            try {
                l ? t.storage.setItem("debug", l) : t.storage.removeItem("debug")
            } catch {}
        }
        function i() {
            let l;
            try {
                l = t.storage.getItem("debug")
            } catch {}
            return !l && typeof process != "undefined" && "env"in process && (l = {}.DEBUG),
                l
        }
        function a() {
            try {
                return localStorage
            } catch {}
        }
        e.exports = Qb(t);
        const {formatters: s} = e.exports;
        s.j = function(l) {
            try {
                return JSON.stringify(l)
            } catch (c) {
                return "[UnexpectedJSONParseError]: " + c.message
            }
        }
    }
)(kl, kl.exports);
var Pl = {
    exports: {}
}, Tl = {
    exports: {}
}, kn = typeof Reflect == "object" ? Reflect : null, zd = kn && typeof kn.apply == "function" ? kn.apply : function(t, r, n) {
    return Function.prototype.apply.call(t, r, n)
}
    , Yi;
kn && typeof kn.ownKeys == "function" ? Yi = kn.ownKeys : Object.getOwnPropertySymbols ? Yi = function(t) {
        return Object.getOwnPropertyNames(t).concat(Object.getOwnPropertySymbols(t))
    }
    : Yi = function(t) {
        return Object.getOwnPropertyNames(t)
    }
;
function Zb(e) {
    console && console.warn && console.warn(e)
}
var Vd = Number.isNaN || function(t) {
        return t !== t
    }
;
function Oe() {
    Oe.init.call(this)
}
Tl.exports = Oe;
Tl.exports.once = n1;
Oe.EventEmitter = Oe;
Oe.prototype._events = void 0;
Oe.prototype._eventsCount = 0;
Oe.prototype._maxListeners = void 0;
var Kd = 10;
function Xi(e) {
    if (typeof e != "function")
        throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof e)
}
Object.defineProperty(Oe, "defaultMaxListeners", {
    enumerable: !0,
    get: function() {
        return Kd
    },
    set: function(e) {
        if (typeof e != "number" || e < 0 || Vd(e))
            throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + e + ".");
        Kd = e
    }
});
Oe.init = function() {
    (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) && (this._events = Object.create(null),
        this._eventsCount = 0),
        this._maxListeners = this._maxListeners || void 0
}
;
Oe.prototype.setMaxListeners = function(t) {
    if (typeof t != "number" || t < 0 || Vd(t))
        throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + t + ".");
    return this._maxListeners = t,
        this
}
;
function Gd(e) {
    return e._maxListeners === void 0 ? Oe.defaultMaxListeners : e._maxListeners
}
Oe.prototype.getMaxListeners = function() {
    return Gd(this)
}
;
Oe.prototype.emit = function(t) {
    for (var r = [], n = 1; n < arguments.length; n++)
        r.push(arguments[n]);
    var o = t === "error"
        , i = this._events;
    if (i !== void 0)
        o = o && i.error === void 0;
    else if (!o)
        return !1;
    if (o) {
        var a;
        if (r.length > 0 && (a = r[0]),
        a instanceof Error)
            throw a;
        var s = new Error("Unhandled error." + (a ? " (" + a.message + ")" : ""));
        throw s.context = a,
            s
    }
    var l = i[t];
    if (l === void 0)
        return !1;
    if (typeof l == "function")
        zd(l, this, r);
    else
        for (var c = l.length, u = Zd(l, c), n = 0; n < c; ++n)
            zd(u[n], this, r);
    return !0
}
;
function Yd(e, t, r, n) {
    var o, i, a;
    if (Xi(r),
        i = e._events,
        i === void 0 ? (i = e._events = Object.create(null),
            e._eventsCount = 0) : (i.newListener !== void 0 && (e.emit("newListener", t, r.listener ? r.listener : r),
            i = e._events),
            a = i[t]),
    a === void 0)
        a = i[t] = r,
            ++e._eventsCount;
    else if (typeof a == "function" ? a = i[t] = n ? [r, a] : [a, r] : n ? a.unshift(r) : a.push(r),
        o = Gd(e),
    o > 0 && a.length > o && !a.warned) {
        a.warned = !0;
        var s = new Error("Possible EventEmitter memory leak detected. " + a.length + " " + String(t) + " listeners added. Use emitter.setMaxListeners() to increase limit");
        s.name = "MaxListenersExceededWarning",
            s.emitter = e,
            s.type = t,
            s.count = a.length,
            Zb(s)
    }
    return e
}
Oe.prototype.addListener = function(t, r) {
    return Yd(this, t, r, !1)
}
;
Oe.prototype.on = Oe.prototype.addListener;
Oe.prototype.prependListener = function(t, r) {
    return Yd(this, t, r, !0)
}
;
function e1() {
    if (!this.fired)
        return this.target.removeListener(this.type, this.wrapFn),
            this.fired = !0,
            arguments.length === 0 ? this.listener.call(this.target) : this.listener.apply(this.target, arguments)
}
function Xd(e, t, r) {
    var n = {
        fired: !1,
        wrapFn: void 0,
        target: e,
        type: t,
        listener: r
    }
        , o = e1.bind(n);
    return o.listener = r,
        n.wrapFn = o,
        o
}
Oe.prototype.once = function(t, r) {
    return Xi(r),
        this.on(t, Xd(this, t, r)),
        this
}
;
Oe.prototype.prependOnceListener = function(t, r) {
    return Xi(r),
        this.prependListener(t, Xd(this, t, r)),
        this
}
;
Oe.prototype.removeListener = function(t, r) {
    var n, o, i, a, s;
    if (Xi(r),
        o = this._events,
    o === void 0)
        return this;
    if (n = o[t],
    n === void 0)
        return this;
    if (n === r || n.listener === r)
        --this._eventsCount == 0 ? this._events = Object.create(null) : (delete o[t],
        o.removeListener && this.emit("removeListener", t, n.listener || r));
    else if (typeof n != "function") {
        for (i = -1,
                 a = n.length - 1; a >= 0; a--)
            if (n[a] === r || n[a].listener === r) {
                s = n[a].listener,
                    i = a;
                break
            }
        if (i < 0)
            return this;
        i === 0 ? n.shift() : t1(n, i),
        n.length === 1 && (o[t] = n[0]),
        o.removeListener !== void 0 && this.emit("removeListener", t, s || r)
    }
    return this
}
;
Oe.prototype.off = Oe.prototype.removeListener;
Oe.prototype.removeAllListeners = function(t) {
    var r, n, o;
    if (n = this._events,
    n === void 0)
        return this;
    if (n.removeListener === void 0)
        return arguments.length === 0 ? (this._events = Object.create(null),
            this._eventsCount = 0) : n[t] !== void 0 && (--this._eventsCount == 0 ? this._events = Object.create(null) : delete n[t]),
            this;
    if (arguments.length === 0) {
        var i = Object.keys(n), a;
        for (o = 0; o < i.length; ++o)
            a = i[o],
            a !== "removeListener" && this.removeAllListeners(a);
        return this.removeAllListeners("removeListener"),
            this._events = Object.create(null),
            this._eventsCount = 0,
            this
    }
    if (r = n[t],
    typeof r == "function")
        this.removeListener(t, r);
    else if (r !== void 0)
        for (o = r.length - 1; o >= 0; o--)
            this.removeListener(t, r[o]);
    return this
}
;
function Jd(e, t, r) {
    var n = e._events;
    if (n === void 0)
        return [];
    var o = n[t];
    return o === void 0 ? [] : typeof o == "function" ? r ? [o.listener || o] : [o] : r ? r1(o) : Zd(o, o.length)
}
Oe.prototype.listeners = function(t) {
    return Jd(this, t, !0)
}
;
Oe.prototype.rawListeners = function(t) {
    return Jd(this, t, !1)
}
;
Oe.listenerCount = function(e, t) {
    return typeof e.listenerCount == "function" ? e.listenerCount(t) : Qd.call(e, t)
}
;
Oe.prototype.listenerCount = Qd;
function Qd(e) {
    var t = this._events;
    if (t !== void 0) {
        var r = t[e];
        if (typeof r == "function")
            return 1;
        if (r !== void 0)
            return r.length
    }
    return 0
}
Oe.prototype.eventNames = function() {
    return this._eventsCount > 0 ? Yi(this._events) : []
}
;
function Zd(e, t) {
    for (var r = new Array(t), n = 0; n < t; ++n)
        r[n] = e[n];
    return r
}
function t1(e, t) {
    for (; t + 1 < e.length; t++)
        e[t] = e[t + 1];
    e.pop()
}
function r1(e) {
    for (var t = new Array(e.length), r = 0; r < t.length; ++r)
        t[r] = e[r].listener || e[r];
    return t
}
function n1(e, t) {
    return new Promise(function(r, n) {
            function o(a) {
                e.removeListener(t, i),
                    n(a)
            }
            function i() {
                typeof e.removeListener == "function" && e.removeListener("error", o),
                    r([].slice.call(arguments))
            }
            ep(e, t, i, {
                once: !0
            }),
            t !== "error" && o1(e, o, {
                once: !0
            })
        }
    )
}
function o1(e, t, r) {
    typeof e.on == "function" && ep(e, "error", t, r)
}
function ep(e, t, r, n) {
    if (typeof e.on == "function")
        n.once ? e.once(t, r) : e.on(t, r);
    else if (typeof e.addEventListener == "function")
        e.addEventListener(t, function o(i) {
            n.once && e.removeEventListener(t, o),
                r(i)
        });
    else
        throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof e)
}
(function(e, t) {
        const {EventEmitter: r} = Tl.exports
            , n = Ki.exports
            , o = t.eventHook = function() {
                return function(s) {
                    const {app: l, service: c} = s
                        , u = s.event === null ? s.event : l.eventMappings[s.method]
                        , f = c._hookEvents && c._hookEvents.indexOf(u) !== -1;
                    u && f && s.type !== "error" && (Array.isArray(s.result) ? s.result : [s.result]).forEach(p => c.emit(u, p, s))
                }
            }
            , i = t.eventMixin = function(s) {
                if (s._serviceEvents)
                    return;
                const l = this
                    , c = typeof s.on == "function" && typeof s.emit == "function";
                typeof s.mixin == "function" && !c && s.mixin(r.prototype),
                    Object.defineProperties(s, {
                        _serviceEvents: {
                            value: Array.isArray(s.events) ? s.events.slice() : []
                        },
                        _hookEvents: {
                            value: []
                        }
                    }),
                    Object.keys(l.eventMappings).forEach(u => {
                            const f = l.eventMappings[u]
                                , d = s._serviceEvents.indexOf(f) !== -1;
                            typeof s[u] == "function" && !d && (s._serviceEvents.push(f),
                                s._hookEvents.push(f))
                        }
                    )
            }
        ;
        e.exports = function() {
            return function(a) {
                Object.assign(a, {
                    eventMappings: {
                        create: "created",
                        update: "updated",
                        remove: "removed",
                        patch: "patched"
                    }
                }),
                    a.hooks({
                        finally: o()
                    }),
                    n.mixin(r.prototype, a),
                    a.mixins.push(i)
            }
        }
    }
)(Pl, Pl.exports);
var Ji = {
    exports: {}
};
const {_: i1} = So
    , a1 = e => {
        const {service: t, method: r} = e
            , n = t.methods[r];
        return e.arguments.forEach( (o, i) => {
                e[n[i]] = o
            }
        ),
        e.params || (e.params = {}),
            e
    }
    , s1 = e => {
        const {service: t, method: r, path: n} = e
            , o = t.methods[r];
        if (o.includes("id") && e.id === void 0)
            throw new Error(`An id must be provided to the '${n}.${r}' method`);
        if (o.includes("data") && !i1.isObjectOrArray(e.data))
            throw new Error(`A data object must be provided to the '${n}.${r}' method`);
        return e
    }
;
var l1 = [a1, s1];
(function(e, t) {
        const {hooks: r, isPromise: n} = So
            , o = l1
            , {createHookObject: i, getHooks: a, processHooks: s, enableHooks: l, ACTIVATE_HOOKS: c} = r
            , u = function({app: p, service: g, method: m, original: h}) {
                return (v={}) => {
                    const w = p.hookTypes.reduce( (S, b) => {
                            const O = v[b] || [];
                            return S[b] = Array.isArray(O) ? O : [O],
                                S
                        }
                        , {});
                    return function(...S) {
                        const b = S[S.length - 1] === !0 ? S.pop() : !1
                            , O = i(m, {
                            type: "before",
                            arguments: S,
                            service: g,
                            app: p
                        });
                        return Promise.resolve(O).then(C => s.call(g, o.concat(w.before), C)).then(C => typeof C.result != "undefined" ? C : new Promise(E => {
                                const A = h || g[m]
                                    , M = g.methods[m].map(F => C[F])
                                    , I = A.apply(g, M);
                                if (!n(I))
                                    throw new Error(`Service method '${C.method}' for '${C.path}' service must return a promise`);
                                E(I)
                            }
                        ).then(E => (C.result = E,
                            C)).catch(E => {
                                throw E.hook = C,
                                    E
                            }
                        )).then(C => {
                                const _ = Object.assign({}, C, {
                                    type: "after"
                                });
                                return s.call(g, w.after, _)
                            }
                        ).catch(C => {
                                const _ = Object.assign({}, C.hook, {
                                    type: "error",
                                    original: C.hook,
                                    error: C,
                                    result: void 0
                                });
                                return s.call(g, w.error, _).catch(E => Object.assign({}, E.hook, {
                                    error: E,
                                    result: void 0
                                }))
                            }
                        ).then(C => s.call(g, w.finally, C).catch(_ => Object.assign({}, _.hook, {
                            error: _,
                            result: void 0
                        }))).then(C => typeof C.error != "undefined" && typeof C.result == "undefined" ? Promise.reject(b ? C : C.error) : b ? C : C.result)
                    }
                }
            }
            , f = t.hookMixin = function(p) {
                if (typeof p.hooks == "function")
                    return;
                p.methods = Object.getOwnPropertyNames(p).filter(v => typeof p[v] == "function" && p[v][c]).reduce( (v, w) => (v[w] = p[w][c],
                    v), p.methods || {}),
                    Object.assign(p.methods, {
                        find: ["params"],
                        get: ["id", "params"],
                        create: ["data", "params"],
                        update: ["id", "data", "params"],
                        patch: ["id", "data", "params"],
                        remove: ["id", "params"]
                    });
                const g = this
                    , m = Object.keys(p.methods)
                    , h = m.reduce( (v, w) => (typeof p[w] != "function" || (v[w] = function() {
                        const S = this
                            , b = Array.from(arguments)
                            , O = S._super.bind(S);
                        return u({
                            app: g,
                            service: S,
                            method: w,
                            original: O
                        })({
                            before: a(g, S, "before", w),
                            after: a(g, S, "after", w, !0),
                            error: a(g, S, "error", w, !0),
                            finally: a(g, S, "finally", w, !0)
                        })(...b)
                    }
                ),
                    v), {});
                l(p, m, g.hookTypes),
                    p.mixin(h)
            }
        ;
        e.exports = function() {
            return function(d) {
                Object.assign(d, {
                    hookTypes: ["before", "after", "error", "finally"]
                }),
                    l(d, d.methods, d.hookTypes),
                    d.mixins.push(f)
            }
        }
            ,
            e.exports.withHooks = u,
            e.exports.ACTIVATE_HOOKS = c,
            e.exports.activateHooks = function(p) {
                return g => (Object.defineProperty(g, c, {
                    value: p
                }),
                    g)
            }
    }
)(Ji, Ji.exports);
var tp = "4.5.15";
const $l = kl.exports("feathers:application")
    , {stripSlashes: rp} = So
    , u1 = Ki.exports
    , c1 = Pl.exports
    , f1 = Ji.exports
    , d1 = tp
    , np = u1.extend({
    create: null
})
    , p1 = {
    init() {
        Object.assign(this, {
            version: d1,
            methods: ["find", "get", "create", "update", "patch", "remove"],
            mixins: [],
            services: {},
            providers: [],
            _setup: !1,
            settings: {}
        }),
            this.configure(f1()),
            this.configure(c1())
    },
    get(e) {
        return this.settings[e]
    },
    set(e, t) {
        return this.settings[e] = t,
            this
    },
    disable(e) {
        return this.settings[e] = !1,
            this
    },
    disabled(e) {
        return !this.settings[e]
    },
    enable(e) {
        return this.settings[e] = !0,
            this
    },
    enabled(e) {
        return !!this.settings[e]
    },
    configure(e) {
        return e.call(this, this),
            this
    },
    service(e, t) {
        if (typeof t != "undefined")
            throw new Error("Registering a new service with `app.service(path, service)` is no longer supported. Use `app.use(path, service)` instead.");
        const r = rp(e) || "/"
            , n = this.services[r];
        return typeof n == "undefined" && typeof this.defaultService == "function" ? this.use(r, this.defaultService(r)).service(r) : n
    },
    use(e, t, r={}) {
        if (typeof e != "string")
            throw new Error(`'${e}' is not a valid service path.`);
        const n = rp(e) || "/"
            , o = typeof t.service == "function" && t.services
            , i = this.methods.concat("setup").some(s => typeof t[s] == "function");
        if (o) {
            const s = t;
            return Object.keys(s.services).forEach(l => this.use(`${n}/${l}`, s.service(l))),
                this
        }
        if (!i)
            throw new Error(`Invalid service object passed for path \`${n}\``);
        const a = np.isPrototypeOf(t) ? t : np.extend(t);
        return $l(`Registering new service at \`${n}\``),
            this.mixins.forEach(s => s.call(this, a, n, r)),
        typeof a._setup == "function" && a._setup(this, n),
            this.providers.forEach(s => s.call(this, a, n, r)),
        this._isSetup && typeof a.setup == "function" && ($l(`Setting up service for \`${n}\``),
            a.setup(this, n)),
            this.services[n] = a,
            this
    },
    setup() {
        return Object.keys(this.services).forEach(e => {
                const t = this.services[e];
                $l(`Setting up service for \`${e}\``),
                typeof t.setup == "function" && t.setup(this, e)
            }
        ),
            this._isSetup = !0,
            this
    }
};
var h1 = p1;
const v1 = Ki.exports
    , m1 = h1
    , g1 = tp
    , {ACTIVATE_HOOKS: y1, activateHooks: b1} = Ji.exports
    , w1 = Object.create(null);
function Oo() {
    const e = Object.create(w1);
    return v1.mixin(m1, e),
        e.init(),
        e
}
Oo.version = g1;
Oo.ACTIVATE_HOOKS = y1;
Oo.activateHooks = b1;
Al.exports = Oo;
Al.exports.default = Oo;
var DA = Al.exports
    , Ml = {
    exports: {}
}
    , Qi = {}
    , Rl = {
    exports: {}
}
    , Pn = 1e3
    , Tn = Pn * 60
    , $n = Tn * 60
    , Wr = $n * 24
    , C1 = Wr * 7
    , _1 = Wr * 365.25
    , x1 = function(e, t) {
    t = t || {};
    var r = typeof e;
    if (r === "string" && e.length > 0)
        return S1(e);
    if (r === "number" && isFinite(e))
        return t.long ? E1(e) : O1(e);
    throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(e))
};
function S1(e) {
    if (e = String(e),
        !(e.length > 100)) {
        var t = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(e);
        if (!!t) {
            var r = parseFloat(t[1])
                , n = (t[2] || "ms").toLowerCase();
            switch (n) {
                case "years":
                case "year":
                case "yrs":
                case "yr":
                case "y":
                    return r * _1;
                case "weeks":
                case "week":
                case "w":
                    return r * C1;
                case "days":
                case "day":
                case "d":
                    return r * Wr;
                case "hours":
                case "hour":
                case "hrs":
                case "hr":
                case "h":
                    return r * $n;
                case "minutes":
                case "minute":
                case "mins":
                case "min":
                case "m":
                    return r * Tn;
                case "seconds":
                case "second":
                case "secs":
                case "sec":
                case "s":
                    return r * Pn;
                case "milliseconds":
                case "millisecond":
                case "msecs":
                case "msec":
                case "ms":
                    return r;
                default:
                    return
            }
        }
    }
}
function O1(e) {
    var t = Math.abs(e);
    return t >= Wr ? Math.round(e / Wr) + "d" : t >= $n ? Math.round(e / $n) + "h" : t >= Tn ? Math.round(e / Tn) + "m" : t >= Pn ? Math.round(e / Pn) + "s" : e + "ms"
}
function E1(e) {
    var t = Math.abs(e);
    return t >= Wr ? Zi(e, t, Wr, "day") : t >= $n ? Zi(e, t, $n, "hour") : t >= Tn ? Zi(e, t, Tn, "minute") : t >= Pn ? Zi(e, t, Pn, "second") : e + " ms"
}
function Zi(e, t, r, n) {
    var o = t >= r * 1.5;
    return Math.round(e / r) + " " + n + (o ? "s" : "")
}
function F1(e) {
    r.debug = r,
        r.default = r,
        r.coerce = l,
        r.disable = i,
        r.enable = o,
        r.enabled = a,
        r.humanize = x1,
        r.destroy = c,
        Object.keys(e).forEach(u => {
                r[u] = e[u]
            }
        ),
        r.names = [],
        r.skips = [],
        r.formatters = {};
    function t(u) {
        let f = 0;
        for (let d = 0; d < u.length; d++)
            f = (f << 5) - f + u.charCodeAt(d),
                f |= 0;
        return r.colors[Math.abs(f) % r.colors.length]
    }
    r.selectColor = t;
    function r(u) {
        let f, d = null, p, g;
        function m(...h) {
            if (!m.enabled)
                return;
            const v = m
                , w = Number(new Date)
                , S = w - (f || w);
            v.diff = S,
                v.prev = f,
                v.curr = w,
                f = w,
                h[0] = r.coerce(h[0]),
            typeof h[0] != "string" && h.unshift("%O");
            let b = 0;
            h[0] = h[0].replace(/%([a-zA-Z%])/g, (C, _) => {
                    if (C === "%%")
                        return "%";
                    b++;
                    const E = r.formatters[_];
                    if (typeof E == "function") {
                        const A = h[b];
                        C = E.call(v, A),
                            h.splice(b, 1),
                            b--
                    }
                    return C
                }
            ),
                r.formatArgs.call(v, h),
                (v.log || r.log).apply(v, h)
        }
        return m.namespace = u,
            m.useColors = r.useColors(),
            m.color = r.selectColor(u),
            m.extend = n,
            m.destroy = r.destroy,
            Object.defineProperty(m, "enabled", {
                enumerable: !0,
                configurable: !1,
                get: () => d !== null ? d : (p !== r.namespaces && (p = r.namespaces,
                    g = r.enabled(u)),
                    g),
                set: h => {
                    d = h
                }
            }),
        typeof r.init == "function" && r.init(m),
            m
    }
    function n(u, f) {
        const d = r(this.namespace + (typeof f == "undefined" ? ":" : f) + u);
        return d.log = this.log,
            d
    }
    function o(u) {
        r.save(u),
            r.namespaces = u,
            r.names = [],
            r.skips = [];
        let f;
        const d = (typeof u == "string" ? u : "").split(/[\s,]+/)
            , p = d.length;
        for (f = 0; f < p; f++)
            !d[f] || (u = d[f].replace(/\*/g, ".*?"),
                u[0] === "-" ? r.skips.push(new RegExp("^" + u.substr(1) + "$")) : r.names.push(new RegExp("^" + u + "$")))
    }
    function i() {
        const u = [...r.names.map(s), ...r.skips.map(s).map(f => "-" + f)].join(",");
        return r.enable(""),
            u
    }
    function a(u) {
        if (u[u.length - 1] === "*")
            return !0;
        let f, d;
        for (f = 0,
                 d = r.skips.length; f < d; f++)
            if (r.skips[f].test(u))
                return !1;
        for (f = 0,
                 d = r.names.length; f < d; f++)
            if (r.names[f].test(u))
                return !0;
        return !1
    }
    function s(u) {
        return u.toString().substring(2, u.toString().length - 2).replace(/\.\*\?$/, "*")
    }
    function l(u) {
        return u instanceof Error ? u.stack || u.message : u
    }
    function c() {
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.")
    }
    return r.enable(r.load()),
        r
}
var A1 = F1;
(function(e, t) {
        t.formatArgs = n,
            t.save = o,
            t.load = i,
            t.useColors = r,
            t.storage = a(),
            t.destroy = ( () => {
                    let l = !1;
                    return () => {
                        l || (l = !0,
                            console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."))
                    }
                }
            )(),
            t.colors = ["#0000CC", "#0000FF", "#0033CC", "#0033FF", "#0066CC", "#0066FF", "#0099CC", "#0099FF", "#00CC00", "#00CC33", "#00CC66", "#00CC99", "#00CCCC", "#00CCFF", "#3300CC", "#3300FF", "#3333CC", "#3333FF", "#3366CC", "#3366FF", "#3399CC", "#3399FF", "#33CC00", "#33CC33", "#33CC66", "#33CC99", "#33CCCC", "#33CCFF", "#6600CC", "#6600FF", "#6633CC", "#6633FF", "#66CC00", "#66CC33", "#9900CC", "#9900FF", "#9933CC", "#9933FF", "#99CC00", "#99CC33", "#CC0000", "#CC0033", "#CC0066", "#CC0099", "#CC00CC", "#CC00FF", "#CC3300", "#CC3333", "#CC3366", "#CC3399", "#CC33CC", "#CC33FF", "#CC6600", "#CC6633", "#CC9900", "#CC9933", "#CCCC00", "#CCCC33", "#FF0000", "#FF0033", "#FF0066", "#FF0099", "#FF00CC", "#FF00FF", "#FF3300", "#FF3333", "#FF3366", "#FF3399", "#FF33CC", "#FF33FF", "#FF6600", "#FF6633", "#FF9900", "#FF9933", "#FFCC00", "#FFCC33"];
        function r() {
            return typeof window != "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs) ? !0 : typeof navigator != "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/) ? !1 : typeof document != "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window != "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator != "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || typeof navigator != "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/)
        }
        function n(l) {
            if (l[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + l[0] + (this.useColors ? "%c " : " ") + "+" + e.exports.humanize(this.diff),
                !this.useColors)
                return;
            const c = "color: " + this.color;
            l.splice(1, 0, c, "color: inherit");
            let u = 0
                , f = 0;
            l[0].replace(/%[a-zA-Z%]/g, d => {
                    d !== "%%" && (u++,
                    d === "%c" && (f = u))
                }
            ),
                l.splice(f, 0, c)
        }
        t.log = console.debug || console.log || ( () => {}
        );
        function o(l) {
            try {
                l ? t.storage.setItem("debug", l) : t.storage.removeItem("debug")
            } catch {}
        }
        function i() {
            let l;
            try {
                l = t.storage.getItem("debug")
            } catch {}
            return !l && typeof process != "undefined" && "env"in process && (l = {}.DEBUG),
                l
        }
        function a() {
            try {
                return localStorage
            } catch {}
        }
        e.exports = A1(t);
        const {formatters: s} = e.exports;
        s.j = function(l) {
            try {
                return JSON.stringify(l)
            } catch (c) {
                return "[UnexpectedJSONParseError]: " + c.message
            }
        }
    }
)(Rl, Rl.exports);
var k1 = Le && Le.__importDefault || function(e) {
        return e && e.__esModule ? e : {
            default: e
        }
    }
;
Object.defineProperty(Qi, "__esModule", {
    value: !0
});
Qi.Service = void 0;
const P1 = k1(Rl.exports)
    , op = Bd
    , ip = (0,
        P1.default)("@feathersjs/transport-commons/client")
    , T1 = ["addListener", "emit", "listenerCount", "listeners", "on", "once", "prependListener", "prependOnceListener", "removeAllListeners", "removeListener"]
    , $1 = ["eventNames", "getMaxListeners", "setMaxListeners"]
    , M1 = e => {
        $1.forEach(t => {
                e[t] = function(...r) {
                    if (typeof this.connection[t] != "function")
                        throw new Error(`Can not call '${t}' on the client service connection`);
                    return this.connection[t](...r)
                }
            }
        ),
            T1.forEach(t => {
                    e[t] = function(r, ...n) {
                        if (typeof this.connection[t] != "function")
                            throw new Error(`Can not call '${t}' on the client service connection`);
                        const o = `${this.path} ${r}`;
                        ip(`Calling emitter method ${t} with namespaced event '${o}'`);
                        const i = this.connection[t](o, ...n);
                        return i === this.connection ? this : i
                    }
                }
            )
    }
;
class R1 {
    constructor(t) {
        this.events = t.events,
            this.path = t.name,
            this.connection = t.connection,
            this.method = t.method,
            this.timeout = t.timeout || 5e3,
            M1(this)
    }
    send(t, ...r) {
        return new Promise( (n, o) => {
                const i = setTimeout( () => o(new op.Timeout(`Timeout of ${this.timeout}ms exceeded calling ${t} on ${this.path}`,{
                    timeout: this.timeout,
                    method: t,
                    path: this.path
                })), this.timeout);
                r.unshift(t, this.path),
                    r.push(function(a, s) {
                        return a = (0,
                            op.convert)(a),
                            clearTimeout(i),
                            a ? o(a) : n(s)
                    }),
                    ip(`Sending socket.${this.method}`, r),
                    this.connection[this.method](...r)
            }
        )
    }
    find(t={}) {
        return this.send("find", t.query || {})
    }
    get(t, r={}) {
        return this.send("get", t, r.query || {})
    }
    create(t, r={}) {
        return this.send("create", t, r.query || {})
    }
    update(t, r, n={}) {
        return this.send("update", t, r, n.query || {})
    }
    patch(t, r, n={}) {
        return this.send("patch", t, r, n.query || {})
    }
    remove(t, r={}) {
        return this.send("remove", t, r.query || {})
    }
    off(t, ...r) {
        if (typeof this.connection.off == "function") {
            const n = this.connection.off(`${this.path} ${t}`, ...r);
            return n === this.connection ? this : n
        } else if (r.length === 0)
            return this.removeAllListeners(t);
        return this.removeListener(t, ...r)
    }
}
Qi.Service = R1;
var I1 = Qi.Service;
const ap = I1;
function sp(e, t) {
    if (!e)
        throw new Error("Socket.io connection needs to be provided");
    if (e && e.io && e.io.engine && e.io.engine.transport && e.io.engine.transport.query && e.io.engine.transport.query.EIO > 3)
        throw console.error("You are trying to use the Socket.io client version 3 or later with Feathers v4 which only supports Socket.io version 2. Please use socket.io-client version 2 instead."),
            new Error("socket.io-client must be version 2.x");
    const r = function(o) {
        const i = Object.keys(this.eventMappings || {}).map(s => this.eventMappings[s])
            , a = Object.assign({}, t, {
            events: i,
            name: o,
            connection: e,
            method: "emit"
        });
        return new ap(a)
    }
        , n = function(o) {
        if (typeof o.defaultService == "function")
            throw new Error("Only one default client provider can be configured");
        o.io = e,
            o.defaultService = r
    };
    return n.Service = ap,
        n.service = r,
        n
}
Ml.exports = sp;
Ml.exports.default = sp;
var BA = Ml.exports;
function NA(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "fill-rule": "evenodd",
            d: "M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z",
            "clip-rule": "evenodd"
        })])
}
function LA(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            d: "M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"
        }), V("path", {
            d: "M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"
        })])
}
function jA(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            d: "M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"
        }), V("path", {
            "fill-rule": "evenodd",
            d: "M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z",
            "clip-rule": "evenodd"
        })])
}
function HA(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            d: "M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"
        }), V("path", {
            d: "M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z"
        })])
}
function UA(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "fill-rule": "evenodd",
            d: "M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z",
            "clip-rule": "evenodd"
        })])
}
function WA(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "fill-rule": "evenodd",
            d: "M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z",
            "clip-rule": "evenodd"
        })])
}
function qA(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "fill-rule": "evenodd",
            d: "M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z",
            "clip-rule": "evenodd"
        })])
}
function zA(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "fill-rule": "evenodd",
            d: "M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z",
            "clip-rule": "evenodd"
        })])
}
function VA(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "fill-rule": "evenodd",
            d: "M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z",
            "clip-rule": "evenodd"
        })])
}
function KA(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "fill-rule": "evenodd",
            d: "M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z",
            "clip-rule": "evenodd"
        })])
}
function GA(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "fill-rule": "evenodd",
            d: "M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z",
            "clip-rule": "evenodd"
        })])
}
function je(e, t, ...r) {
    if (e in t) {
        let o = t[e];
        return typeof o == "function" ? o(...r) : o
    }
    let n = new Error(`Tried to handle "${e}" but there is no handler defined. Only defined handlers are: ${Object.keys(t).map(o => `"${o}"`).join(", ")}.`);
    throw Error.captureStackTrace && Error.captureStackTrace(n, je),
        n
}
function ue(n) {
    var o = n
        , {visible: e=!0, features: t=0} = o
        , r = Ft(o, ["visible", "features"]);
    var i;
    if (e || t & 2 && r.props.static)
        return Il(r);
    if (t & 1) {
        let a = ((i = r.props.unmount) != null ? i : !0) ? 0 : 1;
        return je(a, {
            [0]() {
                return null
            },
            [1]() {
                return Il(Qe(z({}, r), {
                    props: Qe(z({}, r.props), {
                        hidden: !0,
                        style: {
                            display: "none"
                        }
                    })
                }))
            }
        })
    }
    return Il(r)
}
function Il({props: e, attrs: t, slots: r, slot: n, name: o}) {
    var i;
    let c = dr(e, ["unmount", "static"])
        , {as: a} = c
        , s = Ft(c, ["as"])
        , l = (i = r.default) == null ? void 0 : i.call(r, n);
    if (a === "template") {
        if (Object.keys(s).length > 0 || Object.keys(t).length > 0) {
            let[u,...f] = l != null ? l : [];
            if (!D1(u) || f.length > 0)
                throw new Error(['Passing props on "template"!', "", `The current component <${o} /> is rendering a "template".`, "However we need to passthrough the following props:", Object.keys(s).concat(Object.keys(t)).map(d => `  - ${d}`).join(`
`), "", "You can apply a few solutions:", ['Add an `as="..."` prop, to ensure that we render an actual element instead of a "template".', "Render a single element as the child so that we can forward the props onto that element."].map(d => `  - ${d}`).join(`
`)].join(`
`));
            return Mr(u, s)
        }
        return Array.isArray(l) && l.length === 1 ? l[0] : l
    }
    return Pt(a, s, l)
}
function dr(e, t=[]) {
    let r = Object.assign({}, e);
    for (let n of t)
        n in r && delete r[n];
    return r
}
function D1(e) {
    return e == null ? !1 : typeof e.type == "string" || typeof e.type == "object" || typeof e.type == "function"
}
var B1 = 0;
function N1() {
    return ++B1
}
function Ee() {
    return N1()
}
function L1(e) {
    throw new Error("Unexpected object: " + e)
}
function Dl(e, t) {
    let r = t.resolveItems();
    if (r.length <= 0)
        return null;
    let n = t.resolveActiveIndex()
        , o = n != null ? n : -1
        , i = ( () => {
            switch (e.focus) {
                case 0:
                    return r.findIndex(a => !t.resolveDisabled(a));
                case 1:
                {
                    let a = r.slice().reverse().findIndex( (s, l, c) => o !== -1 && c.length - l - 1 >= o ? !1 : !t.resolveDisabled(s));
                    return a === -1 ? a : r.length - 1 - a
                }
                case 2:
                    return r.findIndex( (a, s) => s <= o ? !1 : !t.resolveDisabled(a));
                case 3:
                {
                    let a = r.slice().reverse().findIndex(s => !t.resolveDisabled(s));
                    return a === -1 ? a : r.length - 1 - a
                }
                case 4:
                    return r.findIndex(a => t.resolveId(a) === e.id);
                case 5:
                    return null;
                default:
                    L1(e)
            }
        }
    )();
    return i === -1 ? n : i
}
function R(e) {
    return e == null || e.value == null ? null : "$el"in e.value ? e.value.$el : e.value
}
function wt(e, t, r) {
    typeof window != "undefined" && Re(n => {
            window.addEventListener(e, t, r),
                n( () => {
                        window.removeEventListener(e, t, r)
                    }
                )
        }
    )
}
var lp = Symbol("Context");
function j1() {
    return Yt() !== null
}
function Yt() {
    return Ce(lp, null)
}
function Mn(e) {
    Me(lp, e)
}
function up(e, t) {
    if (e)
        return e;
    let r = t != null ? t : "button";
    if (typeof r == "string" && r.toLowerCase() === "button")
        return "button"
}
function qr(e, t) {
    let r = U(up(e.value.type, e.value.as));
    return Pe( () => {
            r.value = up(e.value.type, e.value.as)
        }
    ),
        Re( () => {
                var n;
                r.value || !R(t) || R(t)instanceof HTMLButtonElement && !((n = R(t)) == null ? void 0 : n.hasAttribute("type")) && (r.value = "button")
            }
        ),
        r
}
function Bl({container: e, accept: t, walk: r, enabled: n}) {
    Re( () => {
            let o = e.value;
            if (!o || n !== void 0 && !n.value)
                return;
            let i = Object.assign(s => t(s), {
                acceptNode: t
            })
                , a = document.createTreeWalker(o, NodeFilter.SHOW_ELEMENT, i, !1);
            for (; a.nextNode(); )
                r(a.currentNode)
        }
    )
}
var cp = Symbol("ComboboxContext");
function Rn(e) {
    let t = Ce(cp, null);
    if (t === null) {
        let r = new Error(`<${e} /> is missing a parent <Combobox /> component.`);
        throw Error.captureStackTrace && Error.captureStackTrace(r, Rn),
            r
    }
    return t
}
var YA = ie({
    name: "Combobox",
    emits: {
        "update:modelValue": e => !0
    },
    props: {
        as: {
            type: [Object, String],
            default: "template"
        },
        disabled: {
            type: [Boolean],
            default: !1
        },
        modelValue: {
            type: [Object, String, Number, Boolean]
        }
    },
    setup(e, {slots: t, attrs: r, emit: n}) {
        let o = U(1)
            , i = U(null)
            , a = U(null)
            , s = U(null)
            , l = U(null)
            , c = U({
            static: !1,
            hold: !1
        })
            , u = U([])
            , f = U(null)
            , d = W( () => e.modelValue)
            , p = {
            comboboxState: o,
            value: d,
            inputRef: a,
            labelRef: i,
            buttonRef: s,
            optionsRef: l,
            disabled: W( () => e.disabled),
            options: u,
            activeOptionIndex: f,
            inputPropsRef: U({
                displayValue: void 0
            }),
            optionsPropsRef: c,
            closeCombobox() {
                e.disabled || o.value !== 1 && (o.value = 1,
                    f.value = null)
            },
            openCombobox() {
                e.disabled || o.value !== 0 && (o.value = 0)
            },
            goToOption(m, h) {
                if (e.disabled || l.value && !c.value.static && o.value === 1)
                    return;
                let v = Dl(m === 4 ? {
                    focus: 4,
                    id: h
                } : {
                    focus: m
                }, {
                    resolveItems: () => u.value,
                    resolveActiveIndex: () => f.value,
                    resolveId: w => w.id,
                    resolveDisabled: w => w.dataRef.disabled
                });
                f.value !== v && (f.value = v)
            },
            syncInputValue() {
                let m = p.value.value;
                if (!R(p.inputRef) || m === void 0)
                    return;
                let h = p.inputPropsRef.value.displayValue;
                typeof h == "function" ? p.inputRef.value.value = h(m) : typeof m == "string" && (p.inputRef.value.value = m)
            },
            selectOption(m) {
                let h = u.value.find(w => w.id === m);
                if (!h)
                    return;
                let {dataRef: v} = h;
                n("update:modelValue", v.value),
                    p.syncInputValue()
            },
            selectActiveOption() {
                if (f.value === null)
                    return;
                let {dataRef: m} = u.value[f.value];
                n("update:modelValue", m.value),
                    p.syncInputValue()
            },
            registerOption(m, h) {
                var v, w;
                let S = f.value !== null ? u.value[f.value] : null
                    , b = Array.from((w = (v = l.value) == null ? void 0 : v.querySelectorAll('[id^="headlessui-combobox-option-"]')) != null ? w : []).reduce( (O, C, _) => Object.assign(O, {
                    [C.id]: _
                }), {});
                u.value = [...u.value, {
                    id: m,
                    dataRef: h
                }].sort( (O, C) => b[O.id] - b[C.id]),
                    f.value = ( () => S === null ? null : u.value.indexOf(S))()
            },
            unregisterOption(m) {
                let h = u.value.slice()
                    , v = f.value !== null ? h[f.value] : null
                    , w = h.findIndex(S => S.id === m);
                w !== -1 && h.splice(w, 1),
                    u.value = h,
                    f.value = ( () => w === f.value || v === null ? null : h.indexOf(v))()
            }
        };
        wt("mousedown", m => {
                var h, v, w;
                let S = m.target;
                o.value === 0 && (((h = R(a)) == null ? void 0 : h.contains(S)) || ((v = R(s)) == null ? void 0 : v.contains(S)) || ((w = R(l)) == null ? void 0 : w.contains(S)) || p.closeCombobox())
            }
        ),
            st([p.value, p.inputRef], () => p.syncInputValue(), {
                immediate: !0
            }),
            Me(cp, p),
            Mn(W( () => je(o.value, {
                [0]: 0,
                [1]: 1
            })));
        let g = W( () => f.value === null ? null : u.value[f.value].dataRef.value);
        return () => {
            let m = {
                open: o.value === 0,
                disabled: e.disabled,
                activeIndex: f.value,
                activeOption: g.value
            };
            return ue({
                props: dr(e, ["modelValue", "onUpdate:modelValue", "disabled"]),
                slot: m,
                slots: t,
                attrs: r,
                name: "Combobox"
            })
        }
    }
});
ie({
    name: "ComboboxLabel",
    props: {
        as: {
            type: [Object, String],
            default: "label"
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = Rn("ComboboxLabel")
            , o = `headlessui-combobox-label-${Ee()}`;
        function i() {
            var a;
            (a = R(n.inputRef)) == null || a.focus({
                preventScroll: !0
            })
        }
        return () => {
            let a = {
                open: n.comboboxState.value === 0,
                disabled: n.disabled.value
            }
                , s = {
                id: o,
                ref: n.labelRef,
                onClick: i
            };
            return ue({
                props: z(z({}, e), s),
                slot: a,
                attrs: t,
                slots: r,
                name: "ComboboxLabel"
            })
        }
    }
});
var XA = ie({
    name: "ComboboxButton",
    props: {
        as: {
            type: [Object, String],
            default: "button"
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = Rn("ComboboxButton")
            , o = `headlessui-combobox-button-${Ee()}`;
        function i(l) {
            n.disabled.value || (n.comboboxState.value === 0 ? n.closeCombobox() : (l.preventDefault(),
                n.openCombobox()),
                Se( () => {
                        var c;
                        return (c = R(n.inputRef)) == null ? void 0 : c.focus({
                            preventScroll: !0
                        })
                    }
                ))
        }
        function a(l) {
            switch (l.key) {
                case "ArrowDown":
                    l.preventDefault(),
                        l.stopPropagation(),
                    n.comboboxState.value === 1 && (n.openCombobox(),
                        Se( () => {
                                n.value.value || n.goToOption(0)
                            }
                        )),
                        Se( () => {
                                var c;
                                return (c = n.inputRef.value) == null ? void 0 : c.focus({
                                    preventScroll: !0
                                })
                            }
                        );
                    return;
                case "ArrowUp":
                    l.preventDefault(),
                        l.stopPropagation(),
                    n.comboboxState.value === 1 && (n.openCombobox(),
                        Se( () => {
                                n.value.value || n.goToOption(3)
                            }
                        )),
                        Se( () => {
                                var c;
                                return (c = n.inputRef.value) == null ? void 0 : c.focus({
                                    preventScroll: !0
                                })
                            }
                        );
                    return;
                case "Escape":
                    l.preventDefault(),
                    n.optionsRef.value && !n.optionsPropsRef.value.static && l.stopPropagation(),
                        n.closeCombobox(),
                        Se( () => {
                                var c;
                                return (c = n.inputRef.value) == null ? void 0 : c.focus({
                                    preventScroll: !0
                                })
                            }
                        );
                    return
            }
        }
        let s = qr(W( () => ({
            as: e.as,
            type: t.type
        })), n.buttonRef);
        return () => {
            var l, c;
            let u = {
                open: n.comboboxState.value === 0,
                disabled: n.disabled.value
            }
                , f = {
                ref: n.buttonRef,
                id: o,
                type: s.value,
                tabindex: "-1",
                "aria-haspopup": !0,
                "aria-controls": (l = R(n.optionsRef)) == null ? void 0 : l.id,
                "aria-expanded": n.disabled.value ? void 0 : n.comboboxState.value === 0,
                "aria-labelledby": n.labelRef.value ? [(c = R(n.labelRef)) == null ? void 0 : c.id, o].join(" ") : void 0,
                disabled: n.disabled.value === !0 ? !0 : void 0,
                onKeydown: a,
                onClick: i
            };
            return ue({
                props: z(z({}, e), f),
                slot: u,
                attrs: t,
                slots: r,
                name: "ComboboxButton"
            })
        }
    }
})
    , JA = ie({
    name: "ComboboxInput",
    props: {
        as: {
            type: [Object, String],
            default: "input"
        },
        static: {
            type: Boolean,
            default: !1
        },
        unmount: {
            type: Boolean,
            default: !0
        },
        displayValue: {
            type: Function
        }
    },
    emits: {
        change: e => !0
    },
    setup(e, {emit: t, attrs: r, slots: n}) {
        let o = Rn("ComboboxInput")
            , i = `headlessui-combobox-input-${Ee()}`;
        o.inputPropsRef = W( () => e);
        function a(l) {
            switch (l.key) {
                case "Enter":
                    l.preventDefault(),
                        l.stopPropagation(),
                        o.selectActiveOption(),
                        o.closeCombobox();
                    break;
                case "ArrowDown":
                    return l.preventDefault(),
                        l.stopPropagation(),
                        je(o.comboboxState.value, {
                            [0]: () => o.goToOption(2),
                            [1]: () => {
                                o.openCombobox(),
                                    Se( () => {
                                            o.value.value || o.goToOption(0)
                                        }
                                    )
                            }
                        });
                case "ArrowUp":
                    return l.preventDefault(),
                        l.stopPropagation(),
                        je(o.comboboxState.value, {
                            [0]: () => o.goToOption(1),
                            [1]: () => {
                                o.openCombobox(),
                                    Se( () => {
                                            o.value.value || o.goToOption(3)
                                        }
                                    )
                            }
                        });
                case "Home":
                case "PageUp":
                    return l.preventDefault(),
                        l.stopPropagation(),
                        o.goToOption(0);
                case "End":
                case "PageDown":
                    return l.preventDefault(),
                        l.stopPropagation(),
                        o.goToOption(3);
                case "Escape":
                    l.preventDefault(),
                    o.optionsRef.value && !o.optionsPropsRef.value.static && l.stopPropagation(),
                        o.closeCombobox();
                    break;
                case "Tab":
                    o.selectActiveOption(),
                        o.closeCombobox();
                    break
            }
        }
        function s(l) {
            o.openCombobox(),
                t("change", l)
        }
        return () => {
            var l, c, u, f, d;
            let p = {
                open: o.comboboxState.value === 0
            }
                , g = {
                "aria-controls": (l = o.optionsRef.value) == null ? void 0 : l.id,
                "aria-expanded": o.disabled ? void 0 : o.comboboxState.value === 0,
                "aria-activedescendant": o.activeOptionIndex.value === null || (c = o.options.value[o.activeOptionIndex.value]) == null ? void 0 : c.id,
                "aria-labelledby": (d = (u = R(o.labelRef)) == null ? void 0 : u.id) != null ? d : (f = R(o.buttonRef)) == null ? void 0 : f.id,
                id: i,
                onKeydown: a,
                onChange: s,
                onInput: s,
                role: "combobox",
                type: "text",
                tabIndex: 0,
                ref: o.inputRef
            }
                , m = dr(e, ["displayValue"]);
            return ue({
                props: z(z({}, m), g),
                slot: p,
                attrs: r,
                slots: n,
                features: 1 | 2,
                name: "ComboboxInput"
            })
        }
    }
})
    , QA = ie({
    name: "ComboboxOptions",
    props: {
        as: {
            type: [Object, String],
            default: "ul"
        },
        static: {
            type: Boolean,
            default: !1
        },
        unmount: {
            type: Boolean,
            default: !0
        },
        hold: {
            type: [Boolean],
            default: !1
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = Rn("ComboboxOptions")
            , o = `headlessui-combobox-options-${Ee()}`;
        Re( () => {
                n.optionsPropsRef.value.static = e.static
            }
        ),
            Re( () => {
                    n.optionsPropsRef.value.hold = e.hold
                }
            );
        let i = Yt()
            , a = W( () => i !== null ? i.value === 0 : n.comboboxState.value === 0);
        return Bl({
            container: W( () => R(n.optionsRef)),
            enabled: W( () => n.comboboxState.value === 0),
            accept(s) {
                return s.getAttribute("role") === "option" ? NodeFilter.FILTER_REJECT : s.hasAttribute("role") ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT
            },
            walk(s) {
                s.setAttribute("role", "none")
            }
        }),
            () => {
                var s, l, c, u;
                let f = {
                    open: n.comboboxState.value === 0
                }
                    , d = {
                    "aria-activedescendant": n.activeOptionIndex.value === null || (s = n.options.value[n.activeOptionIndex.value]) == null ? void 0 : s.id,
                    "aria-labelledby": (u = (l = R(n.labelRef)) == null ? void 0 : l.id) != null ? u : (c = R(n.buttonRef)) == null ? void 0 : c.id,
                    id: o,
                    ref: n.optionsRef,
                    role: "listbox"
                }
                    , p = dr(e, ["hold"]);
                return ue({
                    props: z(z({}, p), d),
                    slot: f,
                    attrs: t,
                    slots: r,
                    features: 1 | 2,
                    visible: a.value,
                    name: "ComboboxOptions"
                })
            }
    }
})
    , ZA = ie({
    name: "ComboboxOption",
    props: {
        as: {
            type: [Object, String],
            default: "li"
        },
        value: {
            type: [Object, String, Number, Boolean]
        },
        disabled: {
            type: Boolean,
            default: !1
        }
    },
    setup(e, {slots: t, attrs: r}) {
        let n = Rn("ComboboxOption")
            , o = `headlessui-combobox-option-${Ee()}`
            , i = W( () => n.activeOptionIndex.value !== null ? n.options.value[n.activeOptionIndex.value].id === o : !1)
            , a = W( () => ce(n.value.value) === ce(e.value))
            , s = W( () => ({
            disabled: e.disabled,
            value: e.value
        }));
        Pe( () => n.registerOption(o, s)),
            Ve( () => n.unregisterOption(o)),
            Pe( () => {
                    st([n.comboboxState, a], () => {
                            n.comboboxState.value === 0 && (!a.value || n.goToOption(4, o))
                        }
                        , {
                            immediate: !0
                        })
                }
            ),
            Re( () => {
                    n.comboboxState.value === 0 && (!i.value || Se( () => {
                            var d, p;
                            return (p = (d = document.getElementById(o)) == null ? void 0 : d.scrollIntoView) == null ? void 0 : p.call(d, {
                                block: "nearest"
                            })
                        }
                    ))
                }
            );
        function l(d) {
            if (e.disabled)
                return d.preventDefault();
            n.selectOption(o),
                n.closeCombobox(),
                Se( () => {
                        var p;
                        return (p = R(n.inputRef)) == null ? void 0 : p.focus({
                            preventScroll: !0
                        })
                    }
                )
        }
        function c() {
            if (e.disabled)
                return n.goToOption(5);
            n.goToOption(4, o)
        }
        function u() {
            e.disabled || i.value || n.goToOption(4, o)
        }
        function f() {
            e.disabled || !i.value || n.optionsPropsRef.value.hold || n.goToOption(5)
        }
        return () => {
            let {disabled: d} = e
                , p = {
                active: i.value,
                selected: a.value,
                disabled: d
            }
                , g = {
                id: o,
                role: "option",
                tabIndex: d === !0 ? void 0 : -1,
                "aria-disabled": d === !0 ? !0 : void 0,
                "aria-selected": a.value === !0 ? a.value : void 0,
                disabled: void 0,
                onClick: l,
                onFocus: c,
                onPointermove: u,
                onMousemove: u,
                onPointerleave: f,
                onMouseleave: f
            };
            return ue({
                props: z(z({}, e), g),
                slot: p,
                attrs: r,
                slots: t,
                name: "ComboboxOption"
            })
        }
    }
})
    , Nl = ["[contentEditable=true]", "[tabindex]", "a[href]", "area[href]", "button:not([disabled])", "iframe", "input:not([disabled])", "select:not([disabled])", "textarea:not([disabled])"].map(e => `${e}:not([tabindex='-1'])`).join(",");
function ea(e=document.body) {
    return e == null ? [] : Array.from(e.querySelectorAll(Nl))
}
function H1(e, t=0) {
    return e === document.body ? !1 : je(t, {
        [0]() {
            return e.matches(Nl)
        },
        [1]() {
            let r = e;
            for (; r !== null; ) {
                if (r.matches(Nl))
                    return !0;
                r = r.parentElement
            }
            return !1
        }
    })
}
function Eo(e) {
    e == null || e.focus({
        preventScroll: !0
    })
}
function tt(e, t) {
    let r = Array.isArray(e) ? e.slice().sort( (u, f) => {
            let d = u.compareDocumentPosition(f);
            return d & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : d & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0
        }
    ) : ea(e), n = document.activeElement, o = ( () => {
            if (t & (1 | 4))
                return 1;
            if (t & (2 | 8))
                return -1;
            throw new Error("Missing Focus.First, Focus.Previous, Focus.Next or Focus.Last")
        }
    )(), i = ( () => {
            if (t & 1)
                return 0;
            if (t & 2)
                return Math.max(0, r.indexOf(n)) - 1;
            if (t & 4)
                return Math.max(0, r.indexOf(n)) + 1;
            if (t & 8)
                return r.length - 1;
            throw new Error("Missing Focus.First, Focus.Previous, Focus.Next or Focus.Last")
        }
    )(), a = t & 32 ? {
        preventScroll: !0
    } : {}, s = 0, l = r.length, c;
    do {
        if (s >= l || s + l <= 0)
            return 0;
        let u = i + s;
        if (t & 16)
            u = (u + l) % l;
        else {
            if (u < 0)
                return 3;
            if (u >= l)
                return 1
        }
        c = r[u],
        c == null || c.focus(a),
            s += o
    } while (c !== document.activeElement);
    return c.hasAttribute("tabindex") || c.setAttribute("tabindex", "0"),
        2
}
function Ll(e, t) {
    for (let r of e)
        if (r.contains(t))
            return !0;
    return !1
}
function fp(e, t=U(!0), r=U({})) {
    let n = U(typeof window != "undefined" ? document.activeElement : null)
        , o = U(null);
    function i() {
        if (!t.value || e.value.size !== 1)
            return;
        let {initialFocus: s} = r.value
            , l = document.activeElement;
        if (s) {
            if (s === l)
                return
        } else if (Ll(e.value, l))
            return;
        if (n.value = l,
            s)
            Eo(s);
        else {
            let c = !1;
            for (let u of e.value)
                if (tt(u, 1) === 2) {
                    c = !0;
                    break
                }
            c || console.warn("There are no focusable elements inside the <FocusTrap />")
        }
        o.value = document.activeElement
    }
    function a() {
        Eo(n.value),
            n.value = null,
            o.value = null
    }
    Re(i),
        os( () => {
                t.value ? i() : a()
            }
        ),
        Ve(a),
        wt("keydown", s => {
                if (!!t.value && s.key === "Tab" && !!document.activeElement && e.value.size === 1) {
                    s.preventDefault();
                    for (let l of e.value)
                        if (tt(l, (s.shiftKey ? 2 : 4) | 16) === 2) {
                            o.value = document.activeElement;
                            break
                        }
                }
            }
        ),
        wt("focus", s => {
                if (!t.value || e.value.size !== 1)
                    return;
                let l = o.value;
                if (!l)
                    return;
                let c = s.target;
                c && c instanceof HTMLElement ? Ll(e.value, c) ? (o.value = c,
                    Eo(c)) : (s.preventDefault(),
                    s.stopPropagation(),
                    Eo(l)) : Eo(o.value)
            }
            , !0)
}
var dp = "body > *"
    , In = new Set
    , pr = new Map;
function pp(e) {
    e.setAttribute("aria-hidden", "true"),
        e.inert = !0
}
function hp(e) {
    let t = pr.get(e);
    !t || (t["aria-hidden"] === null ? e.removeAttribute("aria-hidden") : e.setAttribute("aria-hidden", t["aria-hidden"]),
        e.inert = t.inert)
}
function U1(e, t=U(!0)) {
    Re(r => {
            if (!t.value || !e.value)
                return;
            let n = e.value;
            In.add(n);
            for (let o of pr.keys())
                o.contains(n) && (hp(o),
                    pr.delete(o));
            document.querySelectorAll(dp).forEach(o => {
                    if (o instanceof HTMLElement) {
                        for (let i of In)
                            if (o.contains(i))
                                return;
                        In.size === 1 && (pr.set(o, {
                            "aria-hidden": o.getAttribute("aria-hidden"),
                            inert: o.inert
                        }),
                            pp(o))
                    }
                }
            ),
                r( () => {
                        if (In.delete(n),
                        In.size > 0)
                            document.querySelectorAll(dp).forEach(o => {
                                    if (o instanceof HTMLElement && !pr.has(o)) {
                                        for (let i of In)
                                            if (o.contains(i))
                                                return;
                                        pr.set(o, {
                                            "aria-hidden": o.getAttribute("aria-hidden"),
                                            inert: o.inert
                                        }),
                                            pp(o)
                                    }
                                }
                            );
                        else
                            for (let o of pr.keys())
                                hp(o),
                                    pr.delete(o)
                    }
                )
        }
    )
}
var vp = Symbol("StackContext");
function mp() {
    return Ce(vp, () => {}
    )
}
function W1(e) {
    let t = mp();
    Re(r => {
            let n = e == null ? void 0 : e.value;
            !n || (t(0, n),
                r( () => t(1, n)))
        }
    )
}
function gp(e) {
    let t = mp();
    function r(...n) {
        e == null || e(...n),
            t(...n)
    }
    Me(vp, r)
}
var yp = Symbol("ForcePortalRootContext");
function q1() {
    return Ce(yp, !1)
}
var bp = ie({
    name: "ForcePortalRoot",
    props: {
        as: {
            type: [Object, String],
            default: "template"
        },
        force: {
            type: Boolean,
            default: !1
        }
    },
    setup(e, {slots: t, attrs: r}) {
        return Me(yp, e.force),
            () => {
                let i = e
                    , {force: n} = i
                    , o = Ft(i, ["force"]);
                return ue({
                    props: o,
                    slot: {},
                    slots: t,
                    attrs: r,
                    name: "ForcePortalRoot"
                })
            }
    }
});
function z1() {
    let e = document.getElementById("headlessui-portal-root");
    if (e)
        return e;
    let t = document.createElement("div");
    return t.setAttribute("id", "headlessui-portal-root"),
        document.body.appendChild(t)
}
var V1 = ie({
    name: "Portal",
    props: {
        as: {
            type: [Object, String],
            default: "div"
        }
    },
    setup(e, {slots: t, attrs: r}) {
        let n = q1()
            , o = Ce(wp, null)
            , i = U(n === !0 || o === null ? z1() : o.resolveTarget());
        Re( () => {
                n || o !== null && (i.value = o.resolveTarget())
            }
        );
        let a = U(null);
        return W1(a),
            Ve( () => {
                    var s;
                    let l = document.getElementById("headlessui-portal-root");
                    !l || i.value === l && i.value.children.length <= 0 && ((s = i.value.parentElement) == null || s.removeChild(i.value))
                }
            ),
            gp(),
            () => {
                if (i.value === null)
                    return null;
                let s = {
                    ref: a
                };
                return Pt(gg, {
                    to: i.value
                }, ue({
                    props: z(z({}, e), s),
                    slot: {},
                    attrs: r,
                    slots: t,
                    name: "Portal"
                }))
            }
    }
})
    , wp = Symbol("PortalGroupContext")
    , K1 = ie({
    name: "PortalGroup",
    props: {
        as: {
            type: [Object, String],
            default: "template"
        },
        target: {
            type: Object,
            default: null
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = er({
            resolveTarget() {
                return e.target
            }
        });
        return Me(wp, n),
            () => {
                let a = e
                    , {target: o} = a
                    , i = Ft(a, ["target"]);
                return ue({
                    props: i,
                    slot: {},
                    attrs: t,
                    slots: r,
                    name: "PortalGroup"
                })
            }
    }
})
    , Cp = Symbol("DescriptionContext");
function G1() {
    let e = Ce(Cp, null);
    if (e === null)
        throw new Error("Missing parent");
    return e
}
function ta({slot: e=U({}), name: t="Description", props: r={}}={}) {
    let n = U([]);
    function o(i) {
        return n.value.push(i),
            () => {
                let a = n.value.indexOf(i);
                a !== -1 && n.value.splice(a, 1)
            }
    }
    return Me(Cp, {
        register: o,
        slot: e,
        name: t,
        props: r
    }),
        W( () => n.value.length > 0 ? n.value.join(" ") : void 0)
}
ie({
    name: "Description",
    props: {
        as: {
            type: [Object, String],
            default: "p"
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = G1()
            , o = `headlessui-description-${Ee()}`;
        return Pe( () => Ve(n.register(o))),
            () => {
                let {name: i="Description", slot: a=U({}), props: s={}} = n
                    , l = e
                    , c = Qe(z({}, Object.entries(s).reduce( (u, [f,d]) => Object.assign(u, {
                    [f]: lt(d)
                }), {})), {
                    id: o
                });
                return ue({
                    props: z(z({}, l), c),
                    slot: a.value,
                    attrs: t,
                    slots: r,
                    name: i
                })
            }
    }
});
var _p = Symbol("DialogContext");
function jl(e) {
    let t = Ce(_p, null);
    if (t === null) {
        let r = new Error(`<${e} /> is missing a parent <Dialog /> component.`);
        throw Error.captureStackTrace && Error.captureStackTrace(r, jl),
            r
    }
    return t
}
var ra = "DC8F892D-2EBD-447C-A4C8-A03058436FF4";
ie({
    name: "Dialog",
    inheritAttrs: !1,
    props: {
        as: {
            type: [Object, String],
            default: "div"
        },
        static: {
            type: Boolean,
            default: !1
        },
        unmount: {
            type: Boolean,
            default: !0
        },
        open: {
            type: [Boolean, String],
            default: ra
        },
        initialFocus: {
            type: Object,
            default: null
        }
    },
    emits: {
        close: e => !0
    },
    setup(e, {emit: t, attrs: r, slots: n}) {
        let o = U(new Set)
            , i = Yt()
            , a = W( () => e.open === ra && i !== null ? je(i.value, {
            [0]: !0,
            [1]: !1
        }) : e.open);
        if (!(e.open !== ra || i !== null))
            throw new Error("You forgot to provide an `open` prop to the `Dialog`.");
        if (typeof a.value != "boolean")
            throw new Error(`You provided an \`open\` prop to the \`Dialog\`, but the value is not a boolean. Received: ${a.value === ra ? void 0 : e.open}`);
        let s = W( () => e.open ? 0 : 1)
            , l = W( () => i !== null ? i.value === 0 : s.value === 0)
            , c = U(null)
            , u = U(s.value === 0);
        os( () => {
                u.value = s.value === 0
            }
        );
        let f = `headlessui-dialog-${Ee()}`
            , d = W( () => ({
            initialFocus: e.initialFocus
        }));
        fp(o, u, d),
            U1(c, u),
            gp( (v, w) => je(v, {
                [0]() {
                    o.value.add(w)
                },
                [1]() {
                    o.value.delete(w)
                }
            }));
        let p = ta({
            name: "DialogDescription",
            slot: W( () => ({
                open: a.value
            }))
        })
            , g = U(null)
            , m = {
            titleId: g,
            dialogState: s,
            setTitleId(v) {
                g.value !== v && (g.value = v)
            },
            close() {
                t("close", !1)
            }
        };
        Me(_p, m),
            wt("mousedown", v => {
                    let w = v.target;
                    s.value === 0 && o.value.size === 1 && (Ll(o.value, w) || (m.close(),
                        Se( () => w == null ? void 0 : w.focus())))
                }
            ),
            wt("keydown", v => {
                    v.key === "Escape" && s.value === 0 && (o.value.size > 1 || (v.preventDefault(),
                        v.stopPropagation(),
                        m.close()))
                }
            ),
            Re(v => {
                    if (s.value !== 0)
                        return;
                    let w = document.documentElement.style.overflow
                        , S = document.documentElement.style.paddingRight
                        , b = window.innerWidth - document.documentElement.clientWidth;
                    document.documentElement.style.overflow = "hidden",
                        document.documentElement.style.paddingRight = `${b}px`,
                        v( () => {
                                document.documentElement.style.overflow = w,
                                    document.documentElement.style.paddingRight = S
                            }
                        )
                }
            ),
            Re(v => {
                    if (s.value !== 0)
                        return;
                    let w = R(c);
                    if (!w)
                        return;
                    let S = new IntersectionObserver(b => {
                            for (let O of b)
                                O.boundingClientRect.x === 0 && O.boundingClientRect.y === 0 && O.boundingClientRect.width === 0 && O.boundingClientRect.height === 0 && m.close()
                        }
                    );
                    S.observe(w),
                        v( () => S.disconnect())
                }
            );
        function h(v) {
            v.stopPropagation()
        }
        return () => {
            let v = Qe(z({}, r), {
                ref: c,
                id: f,
                role: "dialog",
                "aria-modal": s.value === 0 ? !0 : void 0,
                "aria-labelledby": g.value,
                "aria-describedby": p.value,
                onClick: h
            })
                , C = e
                , {open: w, initialFocus: S} = C
                , b = Ft(C, ["open", "initialFocus"])
                , O = {
                open: s.value === 0
            };
            return Pt(bp, {
                force: !0
            }, () => Pt(V1, () => Pt(K1, {
                target: c.value
            }, () => Pt(bp, {
                force: !1
            }, () => ue({
                props: z(z({}, b), v),
                slot: O,
                attrs: r,
                slots: n,
                visible: l.value,
                features: 1 | 2,
                name: "Dialog"
            })))))
        }
    }
});
ie({
    name: "DialogOverlay",
    props: {
        as: {
            type: [Object, String],
            default: "div"
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = jl("DialogOverlay")
            , o = `headlessui-dialog-overlay-${Ee()}`;
        function i(a) {
            a.target === a.currentTarget && (a.preventDefault(),
                a.stopPropagation(),
                n.close())
        }
        return () => ue({
            props: Qe(z({}, e), {
                id: o,
                "aria-hidden": !0,
                onClick: i
            }),
            slot: {
                open: n.dialogState.value === 0
            },
            attrs: t,
            slots: r,
            name: "DialogOverlay"
        })
    }
});
ie({
    name: "DialogTitle",
    props: {
        as: {
            type: [Object, String],
            default: "h2"
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = jl("DialogTitle")
            , o = `headlessui-dialog-title-${Ee()}`;
        return Pe( () => {
                n.setTitleId(o),
                    Ve( () => n.setTitleId(null))
            }
        ),
            () => ue({
                props: Qe(z({}, e), {
                    id: o
                }),
                slot: {
                    open: n.dialogState.value === 0
                },
                attrs: t,
                slots: r,
                name: "DialogTitle"
            })
    }
});
var xp = Symbol("DisclosureContext");
function Hl(e) {
    let t = Ce(xp, null);
    if (t === null) {
        let r = new Error(`<${e} /> is missing a parent <Disclosure /> component.`);
        throw Error.captureStackTrace && Error.captureStackTrace(r, Hl),
            r
    }
    return t
}
var Sp = Symbol("DisclosurePanelContext");
function Y1() {
    return Ce(Sp, null)
}
var ek = ie({
    name: "Disclosure",
    props: {
        as: {
            type: [Object, String],
            default: "template"
        },
        defaultOpen: {
            type: [Boolean],
            default: !1
        }
    },
    setup(e, {slots: t, attrs: r}) {
        let n = `headlessui-disclosure-button-${Ee()}`
            , o = `headlessui-disclosure-panel-${Ee()}`
            , i = U(e.defaultOpen ? 0 : 1)
            , a = U(null)
            , s = U(null)
            , l = {
            buttonId: n,
            panelId: o,
            disclosureState: i,
            panel: a,
            button: s,
            toggleDisclosure() {
                i.value = je(i.value, {
                    [0]: 1,
                    [1]: 0
                })
            },
            closeDisclosure() {
                i.value !== 1 && (i.value = 1)
            },
            close(c) {
                l.closeDisclosure();
                let u = ( () => c ? c instanceof HTMLElement ? c : c.value instanceof HTMLElement ? R(c) : R(l.button) : R(l.button))();
                u == null || u.focus()
            }
        };
        return Me(xp, l),
            Mn(W( () => je(i.value, {
                [0]: 0,
                [1]: 1
            }))),
            () => {
                let d = e
                    , {defaultOpen: c} = d
                    , u = Ft(d, ["defaultOpen"])
                    , f = {
                    open: i.value === 0,
                    close: l.close
                };
                return ue({
                    props: u,
                    slot: f,
                    slots: t,
                    attrs: r,
                    name: "Disclosure"
                })
            }
    }
})
    , tk = ie({
    name: "DisclosureButton",
    props: {
        as: {
            type: [Object, String],
            default: "button"
        },
        disabled: {
            type: [Boolean],
            default: !1
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = Hl("DisclosureButton")
            , o = Y1()
            , i = o === null ? !1 : o === n.panelId
            , a = U(null);
        i || Re( () => {
                n.button.value = a.value
            }
        );
        let s = qr(W( () => ({
            as: e.as,
            type: t.type
        })), a);
        function l() {
            var f;
            e.disabled || (i ? (n.toggleDisclosure(),
            (f = R(n.button)) == null || f.focus()) : n.toggleDisclosure())
        }
        function c(f) {
            var d;
            if (!e.disabled)
                if (i)
                    switch (f.key) {
                        case " ":
                        case "Enter":
                            f.preventDefault(),
                                f.stopPropagation(),
                                n.toggleDisclosure(),
                            (d = R(n.button)) == null || d.focus();
                            break
                    }
                else
                    switch (f.key) {
                        case " ":
                        case "Enter":
                            f.preventDefault(),
                                f.stopPropagation(),
                                n.toggleDisclosure();
                            break
                    }
        }
        function u(f) {
            switch (f.key) {
                case " ":
                    f.preventDefault();
                    break
            }
        }
        return () => {
            let f = {
                open: n.disclosureState.value === 0
            }
                , d = i ? {
                ref: a,
                type: s.value,
                onClick: l,
                onKeydown: c
            } : {
                id: n.buttonId,
                ref: a,
                type: s.value,
                "aria-expanded": e.disabled ? void 0 : n.disclosureState.value === 0,
                "aria-controls": R(n.panel) ? n.panelId : void 0,
                disabled: e.disabled ? !0 : void 0,
                onClick: l,
                onKeydown: c,
                onKeyup: u
            };
            return ue({
                props: z(z({}, e), d),
                slot: f,
                attrs: t,
                slots: r,
                name: "DisclosureButton"
            })
        }
    }
})
    , rk = ie({
    name: "DisclosurePanel",
    props: {
        as: {
            type: [Object, String],
            default: "div"
        },
        static: {
            type: Boolean,
            default: !1
        },
        unmount: {
            type: Boolean,
            default: !0
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = Hl("DisclosurePanel");
        Me(Sp, n.panelId);
        let o = Yt()
            , i = W( () => o !== null ? o.value === 0 : n.disclosureState.value === 0);
        return () => {
            let a = {
                open: n.disclosureState.value === 0,
                close: n.close
            }
                , s = {
                id: n.panelId,
                ref: n.panel
            };
            return ue({
                props: z(z({}, e), s),
                slot: a,
                attrs: t,
                slots: r,
                features: 1 | 2,
                visible: i.value,
                name: "DisclosurePanel"
            })
        }
    }
});
ie({
    name: "FocusTrap",
    props: {
        as: {
            type: [Object, String],
            default: "div"
        },
        initialFocus: {
            type: Object,
            default: null
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = U(new Set)
            , o = U(null)
            , i = U(!0)
            , a = W( () => ({
            initialFocus: e.initialFocus
        }));
        return Pe( () => {
                !o.value || (n.value.add(o.value),
                    fp(n, i, a))
            }
        ),
            Ve( () => {
                    i.value = !1
                }
            ),
            () => {
                let s = {}
                    , l = {
                    ref: o
                }
                    , f = e
                    , {initialFocus: c} = f
                    , u = Ft(f, ["initialFocus"]);
                return ue({
                    props: z(z({}, u), l),
                    slot: s,
                    attrs: t,
                    slots: r,
                    name: "FocusTrap"
                })
            }
    }
});
function X1(e) {
    requestAnimationFrame( () => requestAnimationFrame(e))
}
var Op = Symbol("ListboxContext");
function Fo(e) {
    let t = Ce(Op, null);
    if (t === null) {
        let r = new Error(`<${e} /> is missing a parent <Listbox /> component.`);
        throw Error.captureStackTrace && Error.captureStackTrace(r, Fo),
            r
    }
    return t
}
ie({
    name: "Listbox",
    emits: {
        "update:modelValue": e => !0
    },
    props: {
        as: {
            type: [Object, String],
            default: "template"
        },
        disabled: {
            type: [Boolean],
            default: !1
        },
        horizontal: {
            type: [Boolean],
            default: !1
        },
        modelValue: {
            type: [Object, String, Number, Boolean]
        }
    },
    setup(e, {slots: t, attrs: r, emit: n}) {
        let o = U(1)
            , i = U(null)
            , a = U(null)
            , s = U(null)
            , l = U([])
            , c = U("")
            , u = U(null)
            , f = W( () => e.modelValue)
            , d = {
            listboxState: o,
            value: f,
            orientation: W( () => e.horizontal ? "horizontal" : "vertical"),
            labelRef: i,
            buttonRef: a,
            optionsRef: s,
            disabled: W( () => e.disabled),
            options: l,
            searchQuery: c,
            activeOptionIndex: u,
            closeListbox() {
                e.disabled || o.value !== 1 && (o.value = 1,
                    u.value = null)
            },
            openListbox() {
                e.disabled || o.value !== 0 && (o.value = 0)
            },
            goToOption(p, g) {
                if (e.disabled || o.value === 1)
                    return;
                let m = Dl(p === 4 ? {
                    focus: 4,
                    id: g
                } : {
                    focus: p
                }, {
                    resolveItems: () => l.value,
                    resolveActiveIndex: () => u.value,
                    resolveId: h => h.id,
                    resolveDisabled: h => h.dataRef.disabled
                });
                c.value === "" && u.value === m || (c.value = "",
                    u.value = m)
            },
            search(p) {
                if (e.disabled || o.value === 1)
                    return;
                let g = c.value !== "" ? 0 : 1;
                c.value += p.toLowerCase();
                let m = (u.value !== null ? l.value.slice(u.value + g).concat(l.value.slice(0, u.value + g)) : l.value).find(v => v.dataRef.textValue.startsWith(c.value) && !v.dataRef.disabled)
                    , h = m ? l.value.indexOf(m) : -1;
                h === -1 || h === u.value || (u.value = h)
            },
            clearSearch() {
                e.disabled || o.value !== 1 && c.value !== "" && (c.value = "")
            },
            registerOption(p, g) {
                var m, h;
                let v = Array.from((h = (m = s.value) == null ? void 0 : m.querySelectorAll('[id^="headlessui-listbox-option-"]')) != null ? h : []).reduce( (w, S, b) => Object.assign(w, {
                    [S.id]: b
                }), {});
                l.value = [...l.value, {
                    id: p,
                    dataRef: g
                }].sort( (w, S) => v[w.id] - v[S.id])
            },
            unregisterOption(p) {
                let g = l.value.slice()
                    , m = u.value !== null ? g[u.value] : null
                    , h = g.findIndex(v => v.id === p);
                h !== -1 && g.splice(h, 1),
                    l.value = g,
                    u.value = ( () => h === u.value || m === null ? null : g.indexOf(m))()
            },
            select(p) {
                e.disabled || n("update:modelValue", p)
            }
        };
        return wt("mousedown", p => {
                var g, m, h;
                let v = p.target
                    , w = document.activeElement;
                o.value === 0 && (((g = R(a)) == null ? void 0 : g.contains(v)) || (((m = R(s)) == null ? void 0 : m.contains(v)) || d.closeListbox(),
                !(w !== document.body && (w == null ? void 0 : w.contains(v))) && (p.defaultPrevented || (h = R(a)) == null || h.focus({
                    preventScroll: !0
                }))))
            }
        ),
            Me(Op, d),
            Mn(W( () => je(o.value, {
                [0]: 0,
                [1]: 1
            }))),
            () => {
                let p = {
                    open: o.value === 0,
                    disabled: e.disabled
                };
                return ue({
                    props: dr(e, ["modelValue", "onUpdate:modelValue", "disabled", "horizontal"]),
                    slot: p,
                    slots: t,
                    attrs: r,
                    name: "Listbox"
                })
            }
    }
});
ie({
    name: "ListboxLabel",
    props: {
        as: {
            type: [Object, String],
            default: "label"
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = Fo("ListboxLabel")
            , o = `headlessui-listbox-label-${Ee()}`;
        function i() {
            var a;
            (a = R(n.buttonRef)) == null || a.focus({
                preventScroll: !0
            })
        }
        return () => {
            let a = {
                open: n.listboxState.value === 0,
                disabled: n.disabled.value
            }
                , s = {
                id: o,
                ref: n.labelRef,
                onClick: i
            };
            return ue({
                props: z(z({}, e), s),
                slot: a,
                attrs: t,
                slots: r,
                name: "ListboxLabel"
            })
        }
    }
});
ie({
    name: "ListboxButton",
    props: {
        as: {
            type: [Object, String],
            default: "button"
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = Fo("ListboxButton")
            , o = `headlessui-listbox-button-${Ee()}`;
        function i(c) {
            switch (c.key) {
                case " ":
                case "Enter":
                case "ArrowDown":
                    c.preventDefault(),
                        n.openListbox(),
                        Se( () => {
                                var u;
                                (u = R(n.optionsRef)) == null || u.focus({
                                    preventScroll: !0
                                }),
                                n.value.value || n.goToOption(0)
                            }
                        );
                    break;
                case "ArrowUp":
                    c.preventDefault(),
                        n.openListbox(),
                        Se( () => {
                                var u;
                                (u = R(n.optionsRef)) == null || u.focus({
                                    preventScroll: !0
                                }),
                                n.value.value || n.goToOption(3)
                            }
                        );
                    break
            }
        }
        function a(c) {
            switch (c.key) {
                case " ":
                    c.preventDefault();
                    break
            }
        }
        function s(c) {
            n.disabled.value || (n.listboxState.value === 0 ? (n.closeListbox(),
                Se( () => {
                        var u;
                        return (u = R(n.buttonRef)) == null ? void 0 : u.focus({
                            preventScroll: !0
                        })
                    }
                )) : (c.preventDefault(),
                n.openListbox(),
                X1( () => {
                        var u;
                        return (u = R(n.optionsRef)) == null ? void 0 : u.focus({
                            preventScroll: !0
                        })
                    }
                )))
        }
        let l = qr(W( () => ({
            as: e.as,
            type: t.type
        })), n.buttonRef);
        return () => {
            var c, u;
            let f = {
                open: n.listboxState.value === 0,
                disabled: n.disabled.value
            }
                , d = {
                ref: n.buttonRef,
                id: o,
                type: l.value,
                "aria-haspopup": !0,
                "aria-controls": (c = R(n.optionsRef)) == null ? void 0 : c.id,
                "aria-expanded": n.disabled.value ? void 0 : n.listboxState.value === 0,
                "aria-labelledby": n.labelRef.value ? [(u = R(n.labelRef)) == null ? void 0 : u.id, o].join(" ") : void 0,
                disabled: n.disabled.value === !0 ? !0 : void 0,
                onKeydown: i,
                onKeyup: a,
                onClick: s
            };
            return ue({
                props: z(z({}, e), d),
                slot: f,
                attrs: t,
                slots: r,
                name: "ListboxButton"
            })
        }
    }
});
ie({
    name: "ListboxOptions",
    props: {
        as: {
            type: [Object, String],
            default: "ul"
        },
        static: {
            type: Boolean,
            default: !1
        },
        unmount: {
            type: Boolean,
            default: !0
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = Fo("ListboxOptions")
            , o = `headlessui-listbox-options-${Ee()}`
            , i = U(null);
        function a(c) {
            switch (i.value && clearTimeout(i.value),
                c.key) {
                case " ":
                    if (n.searchQuery.value !== "")
                        return c.preventDefault(),
                            c.stopPropagation(),
                            n.search(c.key);
                case "Enter":
                    if (c.preventDefault(),
                        c.stopPropagation(),
                    n.activeOptionIndex.value !== null) {
                        let {dataRef: u} = n.options.value[n.activeOptionIndex.value];
                        n.select(u.value)
                    }
                    n.closeListbox(),
                        Se( () => {
                                var u;
                                return (u = R(n.buttonRef)) == null ? void 0 : u.focus({
                                    preventScroll: !0
                                })
                            }
                        );
                    break;
                case je(n.orientation.value, {
                    vertical: "ArrowDown",
                    horizontal: "ArrowRight"
                }):
                    return c.preventDefault(),
                        c.stopPropagation(),
                        n.goToOption(2);
                case je(n.orientation.value, {
                    vertical: "ArrowUp",
                    horizontal: "ArrowLeft"
                }):
                    return c.preventDefault(),
                        c.stopPropagation(),
                        n.goToOption(1);
                case "Home":
                case "PageUp":
                    return c.preventDefault(),
                        c.stopPropagation(),
                        n.goToOption(0);
                case "End":
                case "PageDown":
                    return c.preventDefault(),
                        c.stopPropagation(),
                        n.goToOption(3);
                case "Escape":
                    c.preventDefault(),
                        c.stopPropagation(),
                        n.closeListbox(),
                        Se( () => {
                                var u;
                                return (u = R(n.buttonRef)) == null ? void 0 : u.focus({
                                    preventScroll: !0
                                })
                            }
                        );
                    break;
                case "Tab":
                    c.preventDefault(),
                        c.stopPropagation();
                    break;
                default:
                    c.key.length === 1 && (n.search(c.key),
                        i.value = setTimeout( () => n.clearSearch(), 350));
                    break
            }
        }
        let s = Yt()
            , l = W( () => s !== null ? s.value === 0 : n.listboxState.value === 0);
        return () => {
            var c, u, f, d;
            let p = {
                open: n.listboxState.value === 0
            }
                , g = {
                "aria-activedescendant": n.activeOptionIndex.value === null || (c = n.options.value[n.activeOptionIndex.value]) == null ? void 0 : c.id,
                "aria-labelledby": (d = (u = R(n.labelRef)) == null ? void 0 : u.id) != null ? d : (f = R(n.buttonRef)) == null ? void 0 : f.id,
                "aria-orientation": n.orientation.value,
                id: o,
                onKeydown: a,
                role: "listbox",
                tabIndex: 0,
                ref: n.optionsRef
            };
            return ue({
                props: z(z({}, e), g),
                slot: p,
                attrs: t,
                slots: r,
                features: 1 | 2,
                visible: l.value,
                name: "ListboxOptions"
            })
        }
    }
});
ie({
    name: "ListboxOption",
    props: {
        as: {
            type: [Object, String],
            default: "li"
        },
        value: {
            type: [Object, String, Number, Boolean]
        },
        disabled: {
            type: Boolean,
            default: !1
        }
    },
    setup(e, {slots: t, attrs: r}) {
        let n = Fo("ListboxOption")
            , o = `headlessui-listbox-option-${Ee()}`
            , i = W( () => n.activeOptionIndex.value !== null ? n.options.value[n.activeOptionIndex.value].id === o : !1)
            , a = W( () => ce(n.value.value) === ce(e.value))
            , s = U({
            disabled: e.disabled,
            value: e.value,
            textValue: ""
        });
        Pe( () => {
                var d, p;
                let g = (p = (d = document.getElementById(o)) == null ? void 0 : d.textContent) == null ? void 0 : p.toLowerCase().trim();
                g !== void 0 && (s.value.textValue = g)
            }
        ),
            Pe( () => n.registerOption(o, s)),
            Ve( () => n.unregisterOption(o)),
            Pe( () => {
                    st([n.listboxState, a], () => {
                            var d, p;
                            n.listboxState.value === 0 && (!a.value || (n.goToOption(4, o),
                            (p = (d = document.getElementById(o)) == null ? void 0 : d.focus) == null || p.call(d)))
                        }
                        , {
                            immediate: !0
                        })
                }
            ),
            Re( () => {
                    n.listboxState.value === 0 && (!i.value || Se( () => {
                            var d, p;
                            return (p = (d = document.getElementById(o)) == null ? void 0 : d.scrollIntoView) == null ? void 0 : p.call(d, {
                                block: "nearest"
                            })
                        }
                    ))
                }
            );
        function l(d) {
            if (e.disabled)
                return d.preventDefault();
            n.select(e.value),
                n.closeListbox(),
                Se( () => {
                        var p;
                        return (p = R(n.buttonRef)) == null ? void 0 : p.focus({
                            preventScroll: !0
                        })
                    }
                )
        }
        function c() {
            if (e.disabled)
                return n.goToOption(5);
            n.goToOption(4, o)
        }
        function u() {
            e.disabled || i.value || n.goToOption(4, o)
        }
        function f() {
            e.disabled || !i.value || n.goToOption(5)
        }
        return () => {
            let {disabled: d} = e
                , p = {
                active: i.value,
                selected: a.value,
                disabled: d
            }
                , g = {
                id: o,
                role: "option",
                tabIndex: d === !0 ? void 0 : -1,
                "aria-disabled": d === !0 ? !0 : void 0,
                "aria-selected": a.value === !0 ? a.value : void 0,
                disabled: void 0,
                onClick: l,
                onFocus: c,
                onPointermove: u,
                onMousemove: u,
                onPointerleave: f,
                onMouseleave: f
            };
            return ue({
                props: z(z({}, e), g),
                slot: p,
                attrs: r,
                slots: t,
                name: "ListboxOption"
            })
        }
    }
});
function J1(e) {
    requestAnimationFrame( () => requestAnimationFrame(e))
}
var Ep = Symbol("MenuContext");
function na(e) {
    let t = Ce(Ep, null);
    if (t === null) {
        let r = new Error(`<${e} /> is missing a parent <Menu /> component.`);
        throw Error.captureStackTrace && Error.captureStackTrace(r, na),
            r
    }
    return t
}
ie({
    name: "Menu",
    props: {
        as: {
            type: [Object, String],
            default: "template"
        }
    },
    setup(e, {slots: t, attrs: r}) {
        let n = U(1)
            , o = U(null)
            , i = U(null)
            , a = U([])
            , s = U("")
            , l = U(null)
            , c = {
            menuState: n,
            buttonRef: o,
            itemsRef: i,
            items: a,
            searchQuery: s,
            activeItemIndex: l,
            closeMenu: () => {
                n.value = 1,
                    l.value = null
            }
            ,
            openMenu: () => n.value = 0,
            goToItem(u, f) {
                let d = Dl(u === 4 ? {
                    focus: 4,
                    id: f
                } : {
                    focus: u
                }, {
                    resolveItems: () => a.value,
                    resolveActiveIndex: () => l.value,
                    resolveId: p => p.id,
                    resolveDisabled: p => p.dataRef.disabled
                });
                s.value === "" && l.value === d || (s.value = "",
                    l.value = d)
            },
            search(u) {
                let f = s.value !== "" ? 0 : 1;
                s.value += u.toLowerCase();
                let d = (l.value !== null ? a.value.slice(l.value + f).concat(a.value.slice(0, l.value + f)) : a.value).find(g => g.dataRef.textValue.startsWith(s.value) && !g.dataRef.disabled)
                    , p = d ? a.value.indexOf(d) : -1;
                p === -1 || p === l.value || (l.value = p)
            },
            clearSearch() {
                s.value = ""
            },
            registerItem(u, f) {
                var d, p;
                let g = Array.from((p = (d = i.value) == null ? void 0 : d.querySelectorAll('[id^="headlessui-menu-item-"]')) != null ? p : []).reduce( (m, h, v) => Object.assign(m, {
                    [h.id]: v
                }), {});
                a.value = [...a.value, {
                    id: u,
                    dataRef: f
                }].sort( (m, h) => g[m.id] - g[h.id])
            },
            unregisterItem(u) {
                let f = a.value.slice()
                    , d = l.value !== null ? f[l.value] : null
                    , p = f.findIndex(g => g.id === u);
                p !== -1 && f.splice(p, 1),
                    a.value = f,
                    l.value = ( () => p === l.value || d === null ? null : f.indexOf(d))()
            }
        };
        return wt("mousedown", u => {
                var f, d, p;
                let g = u.target
                    , m = document.activeElement;
                n.value === 0 && (((f = R(o)) == null ? void 0 : f.contains(g)) || (((d = R(i)) == null ? void 0 : d.contains(g)) || c.closeMenu(),
                !(m !== document.body && (m == null ? void 0 : m.contains(g))) && (u.defaultPrevented || (p = R(o)) == null || p.focus({
                    preventScroll: !0
                }))))
            }
        ),
            Me(Ep, c),
            Mn(W( () => je(n.value, {
                [0]: 0,
                [1]: 1
            }))),
            () => {
                let u = {
                    open: n.value === 0
                };
                return ue({
                    props: e,
                    slot: u,
                    slots: t,
                    attrs: r,
                    name: "Menu"
                })
            }
    }
});
ie({
    name: "MenuButton",
    props: {
        disabled: {
            type: Boolean,
            default: !1
        },
        as: {
            type: [Object, String],
            default: "button"
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = na("MenuButton")
            , o = `headlessui-menu-button-${Ee()}`;
        function i(c) {
            switch (c.key) {
                case " ":
                case "Enter":
                case "ArrowDown":
                    c.preventDefault(),
                        c.stopPropagation(),
                        n.openMenu(),
                        Se( () => {
                                var u;
                                (u = R(n.itemsRef)) == null || u.focus({
                                    preventScroll: !0
                                }),
                                    n.goToItem(0)
                            }
                        );
                    break;
                case "ArrowUp":
                    c.preventDefault(),
                        c.stopPropagation(),
                        n.openMenu(),
                        Se( () => {
                                var u;
                                (u = R(n.itemsRef)) == null || u.focus({
                                    preventScroll: !0
                                }),
                                    n.goToItem(3)
                            }
                        );
                    break
            }
        }
        function a(c) {
            switch (c.key) {
                case " ":
                    c.preventDefault();
                    break
            }
        }
        function s(c) {
            e.disabled || (n.menuState.value === 0 ? (n.closeMenu(),
                Se( () => {
                        var u;
                        return (u = R(n.buttonRef)) == null ? void 0 : u.focus({
                            preventScroll: !0
                        })
                    }
                )) : (c.preventDefault(),
                c.stopPropagation(),
                n.openMenu(),
                J1( () => {
                        var u;
                        return (u = R(n.itemsRef)) == null ? void 0 : u.focus({
                            preventScroll: !0
                        })
                    }
                )))
        }
        let l = qr(W( () => ({
            as: e.as,
            type: t.type
        })), n.buttonRef);
        return () => {
            var c;
            let u = {
                open: n.menuState.value === 0
            }
                , f = {
                ref: n.buttonRef,
                id: o,
                type: l.value,
                "aria-haspopup": !0,
                "aria-controls": (c = R(n.itemsRef)) == null ? void 0 : c.id,
                "aria-expanded": e.disabled ? void 0 : n.menuState.value === 0,
                onKeydown: i,
                onKeyup: a,
                onClick: s
            };
            return ue({
                props: z(z({}, e), f),
                slot: u,
                attrs: t,
                slots: r,
                name: "MenuButton"
            })
        }
    }
});
ie({
    name: "MenuItems",
    props: {
        as: {
            type: [Object, String],
            default: "div"
        },
        static: {
            type: Boolean,
            default: !1
        },
        unmount: {
            type: Boolean,
            default: !0
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = na("MenuItems")
            , o = `headlessui-menu-items-${Ee()}`
            , i = U(null);
        Bl({
            container: W( () => R(n.itemsRef)),
            enabled: W( () => n.menuState.value === 0),
            accept(u) {
                return u.getAttribute("role") === "menuitem" ? NodeFilter.FILTER_REJECT : u.hasAttribute("role") ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT
            },
            walk(u) {
                u.setAttribute("role", "none")
            }
        });
        function a(u) {
            var f;
            switch (i.value && clearTimeout(i.value),
                u.key) {
                case " ":
                    if (n.searchQuery.value !== "")
                        return u.preventDefault(),
                            u.stopPropagation(),
                            n.search(u.key);
                case "Enter":
                    if (u.preventDefault(),
                        u.stopPropagation(),
                    n.activeItemIndex.value !== null) {
                        let {id: d} = n.items.value[n.activeItemIndex.value];
                        (f = document.getElementById(d)) == null || f.click()
                    }
                    n.closeMenu(),
                        Se( () => {
                                var d;
                                return (d = R(n.buttonRef)) == null ? void 0 : d.focus({
                                    preventScroll: !0
                                })
                            }
                        );
                    break;
                case "ArrowDown":
                    return u.preventDefault(),
                        u.stopPropagation(),
                        n.goToItem(2);
                case "ArrowUp":
                    return u.preventDefault(),
                        u.stopPropagation(),
                        n.goToItem(1);
                case "Home":
                case "PageUp":
                    return u.preventDefault(),
                        u.stopPropagation(),
                        n.goToItem(0);
                case "End":
                case "PageDown":
                    return u.preventDefault(),
                        u.stopPropagation(),
                        n.goToItem(3);
                case "Escape":
                    u.preventDefault(),
                        u.stopPropagation(),
                        n.closeMenu(),
                        Se( () => {
                                var d;
                                return (d = R(n.buttonRef)) == null ? void 0 : d.focus({
                                    preventScroll: !0
                                })
                            }
                        );
                    break;
                case "Tab":
                    u.preventDefault(),
                        u.stopPropagation();
                    break;
                default:
                    u.key.length === 1 && (n.search(u.key),
                        i.value = setTimeout( () => n.clearSearch(), 350));
                    break
            }
        }
        function s(u) {
            switch (u.key) {
                case " ":
                    u.preventDefault();
                    break
            }
        }
        let l = Yt()
            , c = W( () => l !== null ? l.value === 0 : n.menuState.value === 0);
        return () => {
            var u, f;
            let d = {
                open: n.menuState.value === 0
            }
                , p = {
                "aria-activedescendant": n.activeItemIndex.value === null || (u = n.items.value[n.activeItemIndex.value]) == null ? void 0 : u.id,
                "aria-labelledby": (f = R(n.buttonRef)) == null ? void 0 : f.id,
                id: o,
                onKeydown: a,
                onKeyup: s,
                role: "menu",
                tabIndex: 0,
                ref: n.itemsRef
            };
            return ue({
                props: z(z({}, e), p),
                slot: d,
                attrs: t,
                slots: r,
                features: 1 | 2,
                visible: c.value,
                name: "MenuItems"
            })
        }
    }
});
ie({
    name: "MenuItem",
    props: {
        as: {
            type: [Object, String],
            default: "template"
        },
        disabled: {
            type: Boolean,
            default: !1
        }
    },
    setup(e, {slots: t, attrs: r}) {
        let n = na("MenuItem")
            , o = `headlessui-menu-item-${Ee()}`
            , i = W( () => n.activeItemIndex.value !== null ? n.items.value[n.activeItemIndex.value].id === o : !1)
            , a = U({
            disabled: e.disabled,
            textValue: ""
        });
        Pe( () => {
                var f, d;
                let p = (d = (f = document.getElementById(o)) == null ? void 0 : f.textContent) == null ? void 0 : d.toLowerCase().trim();
                p !== void 0 && (a.value.textValue = p)
            }
        ),
            Pe( () => n.registerItem(o, a)),
            Ve( () => n.unregisterItem(o)),
            Re( () => {
                    n.menuState.value === 0 && (!i.value || Se( () => {
                            var f, d;
                            return (d = (f = document.getElementById(o)) == null ? void 0 : f.scrollIntoView) == null ? void 0 : d.call(f, {
                                block: "nearest"
                            })
                        }
                    ))
                }
            );
        function s(f) {
            if (e.disabled)
                return f.preventDefault();
            n.closeMenu(),
                Se( () => {
                        var d;
                        return (d = R(n.buttonRef)) == null ? void 0 : d.focus({
                            preventScroll: !0
                        })
                    }
                )
        }
        function l() {
            if (e.disabled)
                return n.goToItem(5);
            n.goToItem(4, o)
        }
        function c() {
            e.disabled || i.value || n.goToItem(4, o)
        }
        function u() {
            e.disabled || !i.value || n.goToItem(5)
        }
        return () => {
            let {disabled: f} = e
                , d = {
                active: i.value,
                disabled: f
            };
            return ue({
                props: Qe(z({}, e), {
                    id: o,
                    role: "menuitem",
                    tabIndex: f === !0 ? void 0 : -1,
                    "aria-disabled": f === !0 ? !0 : void 0,
                    onClick: s,
                    onFocus: l,
                    onPointermove: c,
                    onMousemove: c,
                    onPointerleave: u,
                    onMouseleave: u
                }),
                slot: d,
                attrs: r,
                slots: t,
                name: "MenuItem"
            })
        }
    }
});
var Fp = Symbol("PopoverContext");
function oa(e) {
    let t = Ce(Fp, null);
    if (t === null) {
        let r = new Error(`<${e} /> is missing a parent <${Z1.name} /> component.`);
        throw Error.captureStackTrace && Error.captureStackTrace(r, oa),
            r
    }
    return t
}
var Ap = Symbol("PopoverGroupContext");
function kp() {
    return Ce(Ap, null)
}
var Pp = Symbol("PopoverPanelContext");
function Q1() {
    return Ce(Pp, null)
}
var Z1 = ie({
    name: "Popover",
    props: {
        as: {
            type: [Object, String],
            default: "div"
        }
    },
    setup(e, {slots: t, attrs: r}) {
        let n = `headlessui-popover-button-${Ee()}`
            , o = `headlessui-popover-panel-${Ee()}`
            , i = U(1)
            , a = U(null)
            , s = U(null)
            , l = {
            popoverState: i,
            buttonId: n,
            panelId: o,
            panel: s,
            button: a,
            togglePopover() {
                i.value = je(i.value, {
                    [0]: 1,
                    [1]: 0
                })
            },
            closePopover() {
                i.value !== 1 && (i.value = 1)
            },
            close(p) {
                l.closePopover();
                let g = ( () => p ? p instanceof HTMLElement ? p : p.value instanceof HTMLElement ? R(p) : R(l.button) : R(l.button))();
                g == null || g.focus()
            }
        };
        Me(Fp, l),
            Mn(W( () => je(i.value, {
                [0]: 0,
                [1]: 1
            })));
        let c = {
            buttonId: n,
            panelId: o,
            close() {
                l.closePopover()
            }
        }
            , u = kp()
            , f = u == null ? void 0 : u.registerPopover;
        function d() {
            var p, g, m;
            return (m = u == null ? void 0 : u.isFocusWithinPopoverGroup()) != null ? m : ((p = R(a)) == null ? void 0 : p.contains(document.activeElement)) || ((g = R(s)) == null ? void 0 : g.contains(document.activeElement))
        }
        return Re( () => f == null ? void 0 : f(c)),
            wt("focus", () => {
                    i.value === 0 && (d() || !a || !s || l.closePopover())
                }
                , !0),
            wt("mousedown", p => {
                    var g, m, h;
                    let v = p.target;
                    i.value === 0 && (((g = R(a)) == null ? void 0 : g.contains(v)) || ((m = R(s)) == null ? void 0 : m.contains(v)) || (l.closePopover(),
                    H1(v, 1) || (p.preventDefault(),
                    (h = R(a)) == null || h.focus())))
                }
            ),
            () => {
                let p = {
                    open: i.value === 0,
                    close: l.close
                };
                return ue({
                    props: e,
                    slot: p,
                    slots: t,
                    attrs: r,
                    name: "Popover"
                })
            }
    }
})
    , nk = ie({
    name: "PopoverButton",
    props: {
        as: {
            type: [Object, String],
            default: "button"
        },
        disabled: {
            type: [Boolean],
            default: !1
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = oa("PopoverButton")
            , o = kp()
            , i = o == null ? void 0 : o.closeOthers
            , a = Q1()
            , s = a === null ? !1 : a === n.panelId
            , l = U(null)
            , c = U(typeof window == "undefined" ? null : document.activeElement);
        wt("focus", () => {
                c.value = l.value,
                    l.value = document.activeElement
            }
            , !0);
        let u = U(null);
        s || Re( () => {
                n.button.value = u.value
            }
        );
        let f = qr(W( () => ({
            as: e.as,
            type: t.type
        })), u);
        function d(m) {
            var h, v, w, S;
            if (s) {
                if (n.popoverState.value === 1)
                    return;
                switch (m.key) {
                    case " ":
                    case "Enter":
                        m.preventDefault(),
                            m.stopPropagation(),
                            n.closePopover(),
                        (h = R(n.button)) == null || h.focus();
                        break
                }
            } else
                switch (m.key) {
                    case " ":
                    case "Enter":
                        m.preventDefault(),
                            m.stopPropagation(),
                        n.popoverState.value === 1 && (i == null || i(n.buttonId)),
                            n.togglePopover();
                        break;
                    case "Escape":
                        if (n.popoverState.value !== 0)
                            return i == null ? void 0 : i(n.buttonId);
                        if (!R(n.button) || !((v = R(n.button)) == null ? void 0 : v.contains(document.activeElement)))
                            return;
                        m.preventDefault(),
                            m.stopPropagation(),
                            n.closePopover();
                        break;
                    case "Tab":
                        if (n.popoverState.value !== 0 || !n.panel || !n.button)
                            return;
                        if (m.shiftKey) {
                            if (!c.value || ((w = R(n.button)) == null ? void 0 : w.contains(c.value)) || ((S = R(n.panel)) == null ? void 0 : S.contains(c.value)))
                                return;
                            let b = ea()
                                , O = b.indexOf(c.value);
                            if (b.indexOf(R(n.button)) > O)
                                return;
                            m.preventDefault(),
                                m.stopPropagation(),
                                tt(R(n.panel), 8)
                        } else
                            m.preventDefault(),
                                m.stopPropagation(),
                                tt(R(n.panel), 1);
                        break
                }
        }
        function p(m) {
            var h, v;
            if (!s && (m.key === " " && m.preventDefault(),
            n.popoverState.value === 0 && !!n.panel && !!n.button))
                switch (m.key) {
                    case "Tab":
                        if (!c.value || ((h = R(n.button)) == null ? void 0 : h.contains(c.value)) || ((v = R(n.panel)) == null ? void 0 : v.contains(c.value)))
                            return;
                        let w = ea()
                            , S = w.indexOf(c.value);
                        if (w.indexOf(R(n.button)) > S)
                            return;
                        m.preventDefault(),
                            m.stopPropagation(),
                            tt(R(n.panel), 8);
                        break
                }
        }
        function g() {
            var m, h;
            e.disabled || (s ? (n.closePopover(),
            (m = R(n.button)) == null || m.focus()) : (n.popoverState.value === 1 && (i == null || i(n.buttonId)),
            (h = R(n.button)) == null || h.focus(),
                n.togglePopover()))
        }
        return () => {
            let m = {
                open: n.popoverState.value === 0
            }
                , h = s ? {
                ref: u,
                type: f.value,
                onKeydown: d,
                onClick: g
            } : {
                ref: u,
                id: n.buttonId,
                type: f.value,
                "aria-expanded": e.disabled ? void 0 : n.popoverState.value === 0,
                "aria-controls": R(n.panel) ? n.panelId : void 0,
                disabled: e.disabled ? !0 : void 0,
                onKeydown: d,
                onKeyup: p,
                onClick: g
            };
            return ue({
                props: z(z({}, e), h),
                slot: m,
                attrs: t,
                slots: r,
                name: "PopoverButton"
            })
        }
    }
});
ie({
    name: "PopoverOverlay",
    props: {
        as: {
            type: [Object, String],
            default: "div"
        },
        static: {
            type: Boolean,
            default: !1
        },
        unmount: {
            type: Boolean,
            default: !0
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = oa("PopoverOverlay")
            , o = `headlessui-popover-overlay-${Ee()}`
            , i = Yt()
            , a = W( () => i !== null ? i.value === 0 : n.popoverState.value === 0);
        function s() {
            n.closePopover()
        }
        return () => {
            let l = {
                open: n.popoverState.value === 0
            };
            return ue({
                props: Qe(z({}, e), {
                    id: o,
                    "aria-hidden": !0,
                    onClick: s
                }),
                slot: l,
                attrs: t,
                slots: r,
                features: 1 | 2,
                visible: a.value,
                name: "PopoverOverlay"
            })
        }
    }
});
var ok = ie({
    name: "PopoverPanel",
    props: {
        as: {
            type: [Object, String],
            default: "div"
        },
        static: {
            type: Boolean,
            default: !1
        },
        unmount: {
            type: Boolean,
            default: !0
        },
        focus: {
            type: Boolean,
            default: !1
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let {focus: n} = e
            , o = oa("PopoverPanel");
        Me(Pp, o.panelId),
            Ve( () => {
                    o.panel.value = null
                }
            ),
            Re( () => {
                    var l;
                    if (!n || o.popoverState.value !== 0 || !o.panel)
                        return;
                    let c = document.activeElement;
                    ((l = R(o.panel)) == null ? void 0 : l.contains(c)) || tt(R(o.panel), 1)
                }
            ),
            wt("keydown", l => {
                    var c, u;
                    if (o.popoverState.value !== 0 || !R(o.panel) || l.key !== "Tab" || !document.activeElement || !((c = R(o.panel)) == null ? void 0 : c.contains(document.activeElement)))
                        return;
                    l.preventDefault();
                    let f = tt(R(o.panel), l.shiftKey ? 2 : 4);
                    if (f === 3)
                        return (u = R(o.button)) == null ? void 0 : u.focus();
                    if (f === 1) {
                        if (!R(o.button))
                            return;
                        let d = ea()
                            , p = d.indexOf(R(o.button))
                            , g = d.splice(p + 1).filter(m => {
                                var h;
                                return !((h = R(o.panel)) == null ? void 0 : h.contains(m))
                            }
                        );
                        tt(g, 1) === 0 && tt(document.body, 1)
                    }
                }
            ),
            wt("focus", () => {
                    var l;
                    !n || o.popoverState.value === 0 && (!R(o.panel) || ((l = R(o.panel)) == null ? void 0 : l.contains(document.activeElement)) || o.closePopover())
                }
                , !0);
        let i = Yt()
            , a = W( () => i !== null ? i.value === 0 : o.popoverState.value === 0);
        function s(l) {
            var c, u;
            switch (l.key) {
                case "Escape":
                    if (o.popoverState.value !== 0 || !R(o.panel) || !((c = R(o.panel)) == null ? void 0 : c.contains(document.activeElement)))
                        return;
                    l.preventDefault(),
                        l.stopPropagation(),
                        o.closePopover(),
                    (u = R(o.button)) == null || u.focus();
                    break
            }
        }
        return () => {
            let l = {
                open: o.popoverState.value === 0,
                close: o.close
            }
                , c = {
                ref: o.panel,
                id: o.panelId,
                onKeydown: s
            };
            return ue({
                props: z(z({}, e), c),
                slot: l,
                attrs: t,
                slots: r,
                features: 1 | 2,
                visible: a.value,
                name: "PopoverPanel"
            })
        }
    }
});
ie({
    name: "PopoverGroup",
    props: {
        as: {
            type: [Object, String],
            default: "div"
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = U(null)
            , o = U([]);
        function i(c) {
            let u = o.value.indexOf(c);
            u !== -1 && o.value.splice(u, 1)
        }
        function a(c) {
            return o.value.push(c),
                () => {
                    i(c)
                }
        }
        function s() {
            var c;
            let u = document.activeElement;
            return ((c = R(n)) == null ? void 0 : c.contains(u)) ? !0 : o.value.some(f => {
                    var d, p;
                    return ((d = document.getElementById(f.buttonId)) == null ? void 0 : d.contains(u)) || ((p = document.getElementById(f.panelId)) == null ? void 0 : p.contains(u))
                }
            )
        }
        function l(c) {
            for (let u of o.value)
                u.buttonId !== c && u.close()
        }
        return Me(Ap, {
            registerPopover: a,
            unregisterPopover: i,
            isFocusWithinPopoverGroup: s,
            closeOthers: l
        }),
            () => ue({
                props: Qe(z({}, e), {
                    ref: n
                }),
                slot: {},
                attrs: t,
                slots: r,
                name: "PopoverGroup"
            })
    }
});
var Tp = Symbol("LabelContext");
function $p() {
    let e = Ce(Tp, null);
    if (e === null) {
        let t = new Error("You used a <Label /> component, but it is not inside a parent.");
        throw Error.captureStackTrace && Error.captureStackTrace(t, $p),
            t
    }
    return e
}
function Ul({slot: e={}, name: t="Label", props: r={}}={}) {
    let n = U([]);
    function o(i) {
        return n.value.push(i),
            () => {
                let a = n.value.indexOf(i);
                a !== -1 && n.value.splice(a, 1)
            }
    }
    return Me(Tp, {
        register: o,
        slot: e,
        name: t,
        props: r
    }),
        W( () => n.value.length > 0 ? n.value.join(" ") : void 0)
}
ie({
    name: "Label",
    props: {
        as: {
            type: [Object, String],
            default: "label"
        },
        passive: {
            type: [Boolean],
            default: !1
        }
    },
    setup(e, {slots: t, attrs: r}) {
        let n = $p()
            , o = `headlessui-label-${Ee()}`;
        return Pe( () => Ve(n.register(o))),
            () => {
                let {name: i="Label", slot: a={}, props: s={}} = n
                    , d = e
                    , {passive: l} = d
                    , c = Ft(d, ["passive"])
                    , u = Qe(z({}, Object.entries(s).reduce( (p, [g,m]) => Object.assign(p, {
                    [g]: lt(m)
                }), {})), {
                    id: o
                })
                    , f = z(z({}, c), u);
                return l && delete f.onClick,
                    ue({
                        props: f,
                        slot: a,
                        attrs: r,
                        slots: t,
                        name: i
                    })
            }
    }
});
var Mp = Symbol("RadioGroupContext");
function Rp(e) {
    let t = Ce(Mp, null);
    if (t === null) {
        let r = new Error(`<${e} /> is missing a parent <RadioGroup /> component.`);
        throw Error.captureStackTrace && Error.captureStackTrace(r, Rp),
            r
    }
    return t
}
ie({
    name: "RadioGroup",
    emits: {
        "update:modelValue": e => !0
    },
    props: {
        as: {
            type: [Object, String],
            default: "div"
        },
        disabled: {
            type: [Boolean],
            default: !1
        },
        modelValue: {
            type: [Object, String, Number, Boolean]
        }
    },
    setup(e, {emit: t, attrs: r, slots: n}) {
        let o = U(null)
            , i = U([])
            , a = Ul({
            name: "RadioGroupLabel"
        })
            , s = ta({
            name: "RadioGroupDescription"
        })
            , l = W( () => e.modelValue)
            , c = {
            options: i,
            value: l,
            disabled: W( () => e.disabled),
            firstOption: W( () => i.value.find(d => !d.propsRef.disabled)),
            containsCheckedOption: W( () => i.value.some(d => ce(d.propsRef.value) === ce(e.modelValue))),
            change(d) {
                var p;
                if (e.disabled || l.value === d)
                    return !1;
                let g = (p = i.value.find(m => ce(m.propsRef.value) === ce(d))) == null ? void 0 : p.propsRef;
                return (g == null ? void 0 : g.disabled) ? !1 : (t("update:modelValue", d),
                    !0)
            },
            registerOption(d) {
                var p;
                let g = Array.from((p = o.value) == null ? void 0 : p.querySelectorAll('[id^="headlessui-radiogroup-option-"]')).reduce( (m, h, v) => Object.assign(m, {
                    [h.id]: v
                }), {});
                i.value.push(d),
                    i.value.sort( (m, h) => g[m.id] - g[h.id])
            },
            unregisterOption(d) {
                let p = i.value.findIndex(g => g.id === d);
                p !== -1 && i.value.splice(p, 1)
            }
        };
        Me(Mp, c),
            Bl({
                container: W( () => R(o)),
                accept(d) {
                    return d.getAttribute("role") === "radio" ? NodeFilter.FILTER_REJECT : d.hasAttribute("role") ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT
                },
                walk(d) {
                    d.setAttribute("role", "none")
                }
            });
        function u(d) {
            if (!o.value || !o.value.contains(d.target))
                return;
            let p = i.value.filter(g => g.propsRef.disabled === !1).map(g => g.element);
            switch (d.key) {
                case "ArrowLeft":
                case "ArrowUp":
                    if (d.preventDefault(),
                        d.stopPropagation(),
                    tt(p, 2 | 16) === 2) {
                        let g = i.value.find(m => m.element === document.activeElement);
                        g && c.change(g.propsRef.value)
                    }
                    break;
                case "ArrowRight":
                case "ArrowDown":
                    if (d.preventDefault(),
                        d.stopPropagation(),
                    tt(p, 4 | 16) === 2) {
                        let g = i.value.find(m => m.element === document.activeElement);
                        g && c.change(g.propsRef.value)
                    }
                    break;
                case " ":
                {
                    d.preventDefault(),
                        d.stopPropagation();
                    let g = i.value.find(m => m.element === document.activeElement);
                    g && c.change(g.propsRef.value)
                }
                    break
            }
        }
        let f = `headlessui-radiogroup-${Ee()}`;
        return () => {
            let h = e
                , {modelValue: d, disabled: p} = h
                , g = Ft(h, ["modelValue", "disabled"])
                , m = {
                ref: o,
                id: f,
                role: "radiogroup",
                "aria-labelledby": a.value,
                "aria-describedby": s.value,
                onKeydown: u
            };
            return ue({
                props: z(z({}, g), m),
                slot: {},
                attrs: r,
                slots: n,
                name: "RadioGroup"
            })
        }
    }
});
ie({
    name: "RadioGroupOption",
    props: {
        as: {
            type: [Object, String],
            default: "div"
        },
        value: {
            type: [Object, String, Number, Boolean]
        },
        disabled: {
            type: Boolean,
            default: !1
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = Rp("RadioGroupOption")
            , o = `headlessui-radiogroup-option-${Ee()}`
            , i = Ul({
            name: "RadioGroupLabel"
        })
            , a = ta({
            name: "RadioGroupDescription"
        })
            , s = U(null)
            , l = W( () => ({
            value: e.value,
            disabled: e.disabled
        }))
            , c = U(1);
        Pe( () => n.registerOption({
            id: o,
            element: s,
            propsRef: l
        })),
            Ve( () => n.unregisterOption(o));
        let u = W( () => {
                var v;
                return ((v = n.firstOption.value) == null ? void 0 : v.id) === o
            }
        )
            , f = W( () => n.disabled.value || e.disabled)
            , d = W( () => ce(n.value.value) === ce(e.value))
            , p = W( () => f.value ? -1 : d.value || !n.containsCheckedOption.value && u.value ? 0 : -1);
        function g() {
            var v;
            !n.change(e.value) || (c.value |= 2,
            (v = s.value) == null || v.focus())
        }
        function m() {
            c.value |= 2
        }
        function h() {
            c.value &= ~2
        }
        return () => {
            let v = dr(e, ["value", "disabled"])
                , w = {
                checked: d.value,
                disabled: f.value,
                active: Boolean(c.value & 2)
            }
                , S = {
                id: o,
                ref: s,
                role: "radio",
                "aria-checked": d.value ? "true" : "false",
                "aria-labelledby": i.value,
                "aria-describedby": a.value,
                "aria-disabled": f.value ? !0 : void 0,
                tabIndex: p.value,
                onClick: f.value ? void 0 : g,
                onFocus: f.value ? void 0 : m,
                onBlur: f.value ? void 0 : h
            };
            return ue({
                props: z(z({}, v), S),
                slot: w,
                attrs: t,
                slots: r,
                name: "RadioGroupOption"
            })
        }
    }
});
var Ip = Symbol("GroupContext");
ie({
    name: "SwitchGroup",
    props: {
        as: {
            type: [Object, String],
            default: "template"
        }
    },
    setup(e, {slots: t, attrs: r}) {
        let n = U(null)
            , o = Ul({
            name: "SwitchLabel",
            props: {
                onClick() {
                    !n.value || (n.value.click(),
                        n.value.focus({
                            preventScroll: !0
                        }))
                }
            }
        })
            , i = ta({
            name: "SwitchDescription"
        });
        return Me(Ip, {
            switchRef: n,
            labelledby: o,
            describedby: i
        }),
            () => ue({
                props: e,
                slot: {},
                slots: t,
                attrs: r,
                name: "SwitchGroup"
            })
    }
});
var ik = ie({
    name: "Switch",
    emits: {
        "update:modelValue": e => !0
    },
    props: {
        as: {
            type: [Object, String],
            default: "button"
        },
        modelValue: {
            type: Boolean,
            default: !1
        }
    },
    setup(e, {emit: t, attrs: r, slots: n}) {
        let o = Ce(Ip, null)
            , i = `headlessui-switch-${Ee()}`;
        function a() {
            t("update:modelValue", !e.modelValue)
        }
        let s = U(null)
            , l = o === null ? s : o.switchRef
            , c = qr(W( () => ({
            as: e.as,
            type: r.type
        })), l);
        function u(p) {
            p.preventDefault(),
                a()
        }
        function f(p) {
            p.key !== "Tab" && p.preventDefault(),
            p.key === " " && a()
        }
        function d(p) {
            p.preventDefault()
        }
        return () => {
            let p = {
                checked: e.modelValue
            }
                , g = {
                id: i,
                ref: l,
                role: "switch",
                type: c.value,
                tabIndex: 0,
                "aria-checked": e.modelValue,
                "aria-labelledby": o == null ? void 0 : o.labelledby.value,
                "aria-describedby": o == null ? void 0 : o.describedby.value,
                onClick: u,
                onKeyup: f,
                onKeypress: d
            };
            return ue({
                props: z(z({}, e), g),
                slot: p,
                attrs: r,
                slots: n,
                name: "Switch"
            })
        }
    }
})
    , Dp = Symbol("TabsContext");
function Ao(e) {
    let t = Ce(Dp, null);
    if (t === null) {
        let r = new Error(`<${e} /> is missing a parent <TabGroup /> component.`);
        throw Error.captureStackTrace && Error.captureStackTrace(r, Ao),
            r
    }
    return t
}
var ak = ie({
    name: "TabGroup",
    emits: {
        change: e => !0
    },
    props: {
        as: {
            type: [Object, String],
            default: "template"
        },
        selectedIndex: {
            type: [Number],
            default: null
        },
        defaultIndex: {
            type: [Number],
            default: 0
        },
        vertical: {
            type: [Boolean],
            default: !1
        },
        manual: {
            type: [Boolean],
            default: !1
        }
    },
    setup(e, {slots: t, attrs: r, emit: n}) {
        let o = U(null)
            , i = U([])
            , a = U([])
            , s = {
            selectedIndex: o,
            orientation: W( () => e.vertical ? "vertical" : "horizontal"),
            activation: W( () => e.manual ? "manual" : "auto"),
            tabs: i,
            panels: a,
            setSelectedIndex(l) {
                o.value !== l && (o.value = l,
                    n("change", l))
            },
            registerTab(l) {
                i.value.includes(l) || i.value.push(l)
            },
            unregisterTab(l) {
                let c = i.value.indexOf(l);
                c !== -1 && i.value.splice(c, 1)
            },
            registerPanel(l) {
                a.value.includes(l) || a.value.push(l)
            },
            unregisterPanel(l) {
                let c = a.value.indexOf(l);
                c !== -1 && a.value.splice(c, 1)
            }
        };
        return Me(Dp, s),
            Re( () => {
                    var l;
                    if (s.tabs.value.length <= 0 || e.selectedIndex === null && o.value !== null)
                        return;
                    let c = s.tabs.value.map(d => R(d)).filter(Boolean)
                        , u = c.filter(d => !d.hasAttribute("disabled"))
                        , f = (l = e.selectedIndex) != null ? l : e.defaultIndex;
                    if (f < 0)
                        o.value = c.indexOf(u[0]);
                    else if (f > s.tabs.value.length)
                        o.value = c.indexOf(u[u.length - 1]);
                    else {
                        let d = c.slice(0, f)
                            , p = [...c.slice(f), ...d].find(g => u.includes(g));
                        if (!p)
                            return;
                        o.value = c.indexOf(p)
                    }
                }
            ),
            () => {
                let l = {
                    selectedIndex: o.value
                };
                return ue({
                    props: dr(e, ["selectedIndex", "defaultIndex", "manual", "vertical", "onChange"]),
                    slot: l,
                    slots: t,
                    attrs: r,
                    name: "TabGroup"
                })
            }
    }
});
ie({
    name: "TabList",
    props: {
        as: {
            type: [Object, String],
            default: "div"
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = Ao("TabList");
        return () => {
            let o = {
                selectedIndex: n.selectedIndex.value
            }
                , i = {
                role: "tablist",
                "aria-orientation": n.orientation.value
            };
            return ue({
                props: z(z({}, e), i),
                slot: o,
                attrs: t,
                slots: r,
                name: "TabList"
            })
        }
    }
});
ie({
    name: "Tab",
    props: {
        as: {
            type: [Object, String],
            default: "button"
        },
        disabled: {
            type: [Boolean],
            default: !1
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = Ao("Tab")
            , o = `headlessui-tabs-tab-${Ee()}`
            , i = U();
        Pe( () => n.registerTab(i)),
            Ve( () => n.unregisterTab(i));
        let a = W( () => n.tabs.value.indexOf(i))
            , s = W( () => a.value === n.selectedIndex.value);
        function l(d) {
            let p = n.tabs.value.map(g => R(g)).filter(Boolean);
            if (d.key === " " || d.key === "Enter") {
                d.preventDefault(),
                    d.stopPropagation(),
                    n.setSelectedIndex(a.value);
                return
            }
            switch (d.key) {
                case "Home":
                case "PageUp":
                    return d.preventDefault(),
                        d.stopPropagation(),
                        tt(p, 1);
                case "End":
                case "PageDown":
                    return d.preventDefault(),
                        d.stopPropagation(),
                        tt(p, 8)
            }
            return je(n.orientation.value, {
                vertical() {
                    if (d.key === "ArrowUp")
                        return tt(p, 2 | 16);
                    if (d.key === "ArrowDown")
                        return tt(p, 4 | 16)
                },
                horizontal() {
                    if (d.key === "ArrowLeft")
                        return tt(p, 2 | 16);
                    if (d.key === "ArrowRight")
                        return tt(p, 4 | 16)
                }
            })
        }
        function c() {
            var d;
            (d = R(i)) == null || d.focus()
        }
        function u() {
            var d;
            e.disabled || ((d = R(i)) == null || d.focus(),
                n.setSelectedIndex(a.value))
        }
        let f = qr(W( () => ({
            as: e.as,
            type: t.type
        })), i);
        return () => {
            var d, p;
            let g = {
                selected: s.value
            }
                , m = {
                ref: i,
                onKeydown: l,
                onFocus: n.activation.value === "manual" ? c : u,
                onClick: u,
                id: o,
                role: "tab",
                type: f.value,
                "aria-controls": (p = (d = n.panels.value[a.value]) == null ? void 0 : d.value) == null ? void 0 : p.id,
                "aria-selected": s.value,
                tabIndex: s.value ? 0 : -1,
                disabled: e.disabled ? !0 : void 0
            };
            return ue({
                props: z(z({}, e), m),
                slot: g,
                attrs: t,
                slots: r,
                name: "Tab"
            })
        }
    }
});
ie({
    name: "TabPanels",
    props: {
        as: {
            type: [Object, String],
            default: "div"
        }
    },
    setup(e, {slots: t, attrs: r}) {
        let n = Ao("TabPanels");
        return () => {
            let o = {
                selectedIndex: n.selectedIndex.value
            };
            return ue({
                props: e,
                slot: o,
                attrs: r,
                slots: t,
                name: "TabPanels"
            })
        }
    }
});
ie({
    name: "TabPanel",
    props: {
        as: {
            type: [Object, String],
            default: "div"
        },
        static: {
            type: Boolean,
            default: !1
        },
        unmount: {
            type: Boolean,
            default: !0
        }
    },
    setup(e, {attrs: t, slots: r}) {
        let n = Ao("TabPanel")
            , o = `headlessui-tabs-panel-${Ee()}`
            , i = U();
        Pe( () => n.registerPanel(i)),
            Ve( () => n.unregisterPanel(i));
        let a = W( () => n.panels.value.indexOf(i))
            , s = W( () => a.value === n.selectedIndex.value);
        return () => {
            var l, c;
            let u = {
                selected: s.value
            }
                , f = {
                ref: i,
                id: o,
                role: "tabpanel",
                "aria-labelledby": (c = (l = n.tabs.value[a.value]) == null ? void 0 : l.value) == null ? void 0 : c.id,
                tabIndex: s.value ? 0 : -1
            };
            return ue({
                props: z(z({}, e), f),
                slot: u,
                attrs: t,
                slots: r,
                features: 2 | 1,
                visible: s.value,
                name: "TabPanel"
            })
        }
    }
});
function ew(e) {
    let t = {
        called: !1
    };
    return (...r) => {
        if (!t.called)
            return t.called = !0,
                e(...r)
    }
}
function Bp() {
    let e = []
        , t = []
        , r = {
        enqueue(n) {
            t.push(n)
        },
        requestAnimationFrame(...n) {
            let o = requestAnimationFrame(...n);
            r.add( () => cancelAnimationFrame(o))
        },
        nextFrame(...n) {
            r.requestAnimationFrame( () => {
                    r.requestAnimationFrame(...n)
                }
            )
        },
        setTimeout(...n) {
            let o = setTimeout(...n);
            r.add( () => clearTimeout(o))
        },
        add(n) {
            e.push(n)
        },
        dispose() {
            for (let n of e.splice(0))
                n()
        },
        async workQueue() {
            for (let n of t.splice(0))
                await n()
        }
    };
    return r
}
function Wl(e, ...t) {
    e && t.length > 0 && e.classList.add(...t)
}
function ia(e, ...t) {
    e && t.length > 0 && e.classList.remove(...t)
}
function tw(e, t) {
    let r = Bp();
    if (!e)
        return r.dispose;
    let {transitionDuration: n, transitionDelay: o} = getComputedStyle(e)
        , [i,a] = [n, o].map(s => {
            let[l=0] = s.split(",").filter(Boolean).map(c => c.includes("ms") ? parseFloat(c) : parseFloat(c) * 1e3).sort( (c, u) => u - c);
            return l
        }
    );
    return i !== 0 ? r.setTimeout( () => t("finished"), i + a) : t("finished"),
        r.add( () => t("cancelled")),
        r.dispose
}
function Np(e, t, r, n, o, i) {
    let a = Bp()
        , s = i !== void 0 ? ew(i) : () => {}
    ;
    return ia(e, ...o),
        Wl(e, ...t, ...r),
        a.nextFrame( () => {
                ia(e, ...r),
                    Wl(e, ...n),
                    a.add(tw(e, l => (ia(e, ...n, ...t),
                        Wl(e, ...o),
                        s(l))))
            }
        ),
        a.add( () => ia(e, ...t, ...r, ...n, ...o)),
        a.add( () => s("cancelled")),
        a.dispose
}
function zr(e="") {
    return e.split(" ").filter(t => t.trim().length > 1)
}
var ql = Symbol("TransitionContext");
function rw() {
    return Ce(ql, null) !== null
}
function nw() {
    let e = Ce(ql, null);
    if (e === null)
        throw new Error("A <TransitionChild /> is used but it is missing a parent <TransitionRoot />.");
    return e
}
function ow() {
    let e = Ce(zl, null);
    if (e === null)
        throw new Error("A <TransitionChild /> is used but it is missing a parent <TransitionRoot />.");
    return e
}
var zl = Symbol("NestingContext");
function aa(e) {
    return "children"in e ? aa(e.children) : e.value.filter( ({state: t}) => t === "visible").length > 0
}
function Lp(e) {
    let t = U([])
        , r = U(!1);
    Pe( () => r.value = !0),
        Ve( () => r.value = !1);
    function n(i, a=1) {
        let s = t.value.findIndex( ({id: l}) => l === i);
        s !== -1 && (je(a, {
            [0]() {
                t.value.splice(s, 1)
            },
            [1]() {
                t.value[s].state = "hidden"
            }
        }),
        !aa(t) && r.value && (e == null || e()))
    }
    function o(i) {
        let a = t.value.find( ({id: s}) => s === i);
        return a ? a.state !== "visible" && (a.state = "visible") : t.value.push({
            id: i,
            state: "visible"
        }),
            () => n(i, 0)
    }
    return {
        children: t,
        register: o,
        unregister: n
    }
}
var jp = 1
    , iw = ie({
    props: {
        as: {
            type: [Object, String],
            default: "div"
        },
        show: {
            type: [Boolean],
            default: null
        },
        unmount: {
            type: [Boolean],
            default: !0
        },
        appear: {
            type: [Boolean],
            default: !1
        },
        enter: {
            type: [String],
            default: ""
        },
        enterFrom: {
            type: [String],
            default: ""
        },
        enterTo: {
            type: [String],
            default: ""
        },
        entered: {
            type: [String],
            default: ""
        },
        leave: {
            type: [String],
            default: ""
        },
        leaveFrom: {
            type: [String],
            default: ""
        },
        leaveTo: {
            type: [String],
            default: ""
        }
    },
    emits: {
        beforeEnter: () => !0,
        afterEnter: () => !0,
        beforeLeave: () => !0,
        afterLeave: () => !0
    },
    setup(e, {emit: t, attrs: r, slots: n}) {
        if (!rw() && j1())
            return () => Pt(sw, Qe(z({}, e), {
                onBeforeEnter: () => t("beforeEnter"),
                onAfterEnter: () => t("afterEnter"),
                onBeforeLeave: () => t("beforeLeave"),
                onAfterLeave: () => t("afterLeave")
            }), n);
        let o = U(null)
            , i = U("visible")
            , a = W( () => e.unmount ? 0 : 1)
            , {show: s, appear: l} = nw()
            , {register: c, unregister: u} = ow()
            , f = {
            value: !0
        }
            , d = Ee()
            , p = {
            value: !1
        }
            , g = Lp( () => {
                p.value || (i.value = "hidden",
                    u(d),
                    t("afterLeave"))
            }
        );
        Pe( () => {
                let _ = c(d);
                Ve(_)
            }
        ),
            Re( () => {
                    if (a.value === 1 && !!d) {
                        if (s && i.value !== "visible") {
                            i.value = "visible";
                            return
                        }
                        je(i.value, {
                            hidden: () => u(d),
                            visible: () => c(d)
                        })
                    }
                }
            );
        let m = zr(e.enter)
            , h = zr(e.enterFrom)
            , v = zr(e.enterTo)
            , w = zr(e.entered)
            , S = zr(e.leave)
            , b = zr(e.leaveFrom)
            , O = zr(e.leaveTo);
        Pe( () => {
                Re( () => {
                        if (i.value === "visible") {
                            let _ = R(o);
                            if (_ instanceof Comment && _.data === "")
                                throw new Error("Did you forget to passthrough the `ref` to the actual DOM node?")
                        }
                    }
                )
            }
        );
        function C(_) {
            let E = f.value && !l.value
                , A = R(o);
            !A || !(A instanceof HTMLElement) || E || (p.value = !0,
            s.value && t("beforeEnter"),
            s.value || t("beforeLeave"),
                _(s.value ? Np(A, m, h, v, w, M => {
                        p.value = !1,
                        M === "finished" && t("afterEnter")
                    }
                ) : Np(A, S, b, O, w, M => {
                        p.value = !1,
                        M === "finished" && (aa(g) || (i.value = "hidden",
                            u(d),
                            t("afterLeave")))
                    }
                )))
        }
        return Pe( () => {
                st([s, l], (_, E, A) => {
                        C(A),
                            f.value = !1
                    }
                    , {
                        immediate: !0
                    })
            }
        ),
            Me(zl, g),
            Mn(W( () => je(i.value, {
                visible: 0,
                hidden: 1
            }))),
            () => {
                let ne = e
                    , {appear: _, show: E, enter: A, enterFrom: M, enterTo: I, entered: F, leave: B, leaveFrom: K, leaveTo: oe} = ne
                    , ee = Ft(ne, ["appear", "show", "enter", "enterFrom", "enterTo", "entered", "leave", "leaveFrom", "leaveTo"]);
                return ue({
                    props: Qe(z({}, ee), {
                        ref: o
                    }),
                    slot: {},
                    slots: n,
                    attrs: r,
                    features: jp,
                    visible: i.value === "visible",
                    name: "TransitionChild"
                })
            }
    }
})
    , aw = iw
    , sw = ie({
    inheritAttrs: !1,
    props: {
        as: {
            type: [Object, String],
            default: "div"
        },
        show: {
            type: [Boolean],
            default: null
        },
        unmount: {
            type: [Boolean],
            default: !0
        },
        appear: {
            type: [Boolean],
            default: !1
        },
        enter: {
            type: [String],
            default: ""
        },
        enterFrom: {
            type: [String],
            default: ""
        },
        enterTo: {
            type: [String],
            default: ""
        },
        entered: {
            type: [String],
            default: ""
        },
        leave: {
            type: [String],
            default: ""
        },
        leaveFrom: {
            type: [String],
            default: ""
        },
        leaveTo: {
            type: [String],
            default: ""
        }
    },
    emits: {
        beforeEnter: () => !0,
        afterEnter: () => !0,
        beforeLeave: () => !0,
        afterLeave: () => !0
    },
    setup(e, {emit: t, attrs: r, slots: n}) {
        let o = Yt()
            , i = W( () => e.show === null && o !== null ? je(o.value, {
            [0]: !0,
            [1]: !1
        }) : e.show);
        Re( () => {
                if (![!0, !1].includes(i.value))
                    throw new Error('A <Transition /> is used but it is missing a `:show="true | false"` prop.')
            }
        );
        let a = U(i.value ? "visible" : "hidden")
            , s = Lp( () => {
                a.value = "hidden"
            }
        )
            , l = {
            value: !0
        }
            , c = {
            show: i,
            appear: W( () => e.appear || !l.value)
        };
        return Pe( () => {
                Re( () => {
                        l.value = !1,
                            i.value ? a.value = "visible" : aa(s) || (a.value = "hidden")
                    }
                )
            }
        ),
            Me(zl, s),
            Me(ql, c),
            () => {
                let u = dr(e, ["show", "appear", "unmount"])
                    , f = {
                    unmount: e.unmount
                };
                return ue({
                    props: Qe(z({}, f), {
                        as: "template"
                    }),
                    slot: {},
                    slots: Qe(z({}, n), {
                        default: () => [Pt(aw, z(z(z({
                            onBeforeEnter: () => t("beforeEnter"),
                            onAfterEnter: () => t("afterEnter"),
                            onBeforeLeave: () => t("beforeLeave"),
                            onAfterLeave: () => t("afterLeave")
                        }, r), f), u), n.default)]
                    }),
                    attrs: {},
                    features: jp,
                    visible: a.value === "visible",
                    name: "Transition"
                })
            }
    }
});
function Ct(e) {
    if (e === null || e === !0 || e === !1)
        return NaN;
    var t = Number(e);
    return isNaN(t) ? t : t < 0 ? Math.ceil(t) : Math.floor(t)
}
function De(e, t) {
    if (t.length < e)
        throw new TypeError(e + " argument" + (e > 1 ? "s" : "") + " required, but only " + t.length + " present")
}
function Te(e) {
    De(1, arguments);
    var t = Object.prototype.toString.call(e);
    return e instanceof Date || typeof e == "object" && t === "[object Date]" ? new Date(e.getTime()) : typeof e == "number" || t === "[object Number]" ? new Date(e) : ((typeof e == "string" || t === "[object String]") && typeof console != "undefined" && (console.warn("Starting with v2.0.0-beta.1 date-fns doesn't accept strings as date arguments. Please use `parseISO` to parse strings. See: https://git.io/fjule"),
        console.warn(new Error().stack)),
        new Date(NaN))
}
function lw(e, t) {
    De(2, arguments);
    var r = Te(e).getTime()
        , n = Ct(t);
    return new Date(r + n)
}
function Vl(e) {
    var t = new Date(Date.UTC(e.getFullYear(), e.getMonth(), e.getDate(), e.getHours(), e.getMinutes(), e.getSeconds(), e.getMilliseconds()));
    return t.setUTCFullYear(e.getFullYear()),
    e.getTime() - t.getTime()
}
function sa(e, t) {
    De(2, arguments);
    var r = Te(e)
        , n = Te(t)
        , o = r.getTime() - n.getTime();
    return o < 0 ? -1 : o > 0 ? 1 : o
}
function uw(e) {
    return De(1, arguments),
    e instanceof Date || typeof e == "object" && Object.prototype.toString.call(e) === "[object Date]"
}
function cw(e) {
    if (De(1, arguments),
    !uw(e) && typeof e != "number")
        return !1;
    var t = Te(e);
    return !isNaN(Number(t))
}
function fw(e, t) {
    De(2, arguments);
    var r = Te(e)
        , n = Te(t)
        , o = r.getFullYear() - n.getFullYear()
        , i = r.getMonth() - n.getMonth();
    return o * 12 + i
}
function dw(e, t) {
    return De(2, arguments),
    Te(e).getTime() - Te(t).getTime()
}
var Hp = {
    ceil: Math.ceil,
    round: Math.round,
    floor: Math.floor,
    trunc: function(e) {
        return e < 0 ? Math.ceil(e) : Math.floor(e)
    }
}
    , pw = "trunc";
function hw(e) {
    return e ? Hp[e] : Hp[pw]
}
function vw(e) {
    De(1, arguments);
    var t = Te(e);
    return t.setHours(23, 59, 59, 999),
        t
}
function mw(e) {
    De(1, arguments);
    var t = Te(e)
        , r = t.getMonth();
    return t.setFullYear(t.getFullYear(), r + 1, 0),
        t.setHours(23, 59, 59, 999),
        t
}
function gw(e) {
    De(1, arguments);
    var t = Te(e);
    return vw(t).getTime() === mw(t).getTime()
}
function yw(e, t) {
    De(2, arguments);
    var r = Te(e), n = Te(t), o = sa(r, n), i = Math.abs(fw(r, n)), a;
    if (i < 1)
        a = 0;
    else {
        r.getMonth() === 1 && r.getDate() > 27 && r.setDate(30),
            r.setMonth(r.getMonth() - o * i);
        var s = sa(r, n) === -o;
        gw(Te(e)) && i === 1 && sa(e, n) === 1 && (s = !1),
            a = o * (i - Number(s))
    }
    return a === 0 ? 0 : a
}
function bw(e, t, r) {
    De(2, arguments);
    var n = dw(e, t) / 1e3;
    return hw(r == null ? void 0 : r.roundingMethod)(n)
}
var ww = {
    lessThanXSeconds: {
        one: "less than a second",
        other: "less than {{count}} seconds"
    },
    xSeconds: {
        one: "1 second",
        other: "{{count}} seconds"
    },
    halfAMinute: "half a minute",
    lessThanXMinutes: {
        one: "less than a minute",
        other: "less than {{count}} minutes"
    },
    xMinutes: {
        one: "1 minute",
        other: "{{count}} minutes"
    },
    aboutXHours: {
        one: "about 1 hour",
        other: "about {{count}} hours"
    },
    xHours: {
        one: "1 hour",
        other: "{{count}} hours"
    },
    xDays: {
        one: "1 day",
        other: "{{count}} days"
    },
    aboutXWeeks: {
        one: "about 1 week",
        other: "about {{count}} weeks"
    },
    xWeeks: {
        one: "1 week",
        other: "{{count}} weeks"
    },
    aboutXMonths: {
        one: "about 1 month",
        other: "about {{count}} months"
    },
    xMonths: {
        one: "1 month",
        other: "{{count}} months"
    },
    aboutXYears: {
        one: "about 1 year",
        other: "about {{count}} years"
    },
    xYears: {
        one: "1 year",
        other: "{{count}} years"
    },
    overXYears: {
        one: "over 1 year",
        other: "over {{count}} years"
    },
    almostXYears: {
        one: "almost 1 year",
        other: "almost {{count}} years"
    }
}
    , Cw = function(e, t, r) {
    var n, o = ww[e];
    return typeof o == "string" ? n = o : t === 1 ? n = o.one : n = o.other.replace("{{count}}", t.toString()),
        r != null && r.addSuffix ? r.comparison && r.comparison > 0 ? "in " + n : n + " ago" : n
}
    , _w = Cw;
function Kl(e) {
    return function() {
        var t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}
            , r = t.width ? String(t.width) : e.defaultWidth
            , n = e.formats[r] || e.formats[e.defaultWidth];
        return n
    }
}
var xw = {
    full: "EEEE, MMMM do, y",
    long: "MMMM do, y",
    medium: "MMM d, y",
    short: "MM/dd/yyyy"
}
    , Sw = {
    full: "h:mm:ss a zzzz",
    long: "h:mm:ss a z",
    medium: "h:mm:ss a",
    short: "h:mm a"
}
    , Ow = {
    full: "{{date}} 'at' {{time}}",
    long: "{{date}} 'at' {{time}}",
    medium: "{{date}}, {{time}}",
    short: "{{date}}, {{time}}"
}
    , Ew = {
    date: Kl({
        formats: xw,
        defaultWidth: "full"
    }),
    time: Kl({
        formats: Sw,
        defaultWidth: "full"
    }),
    dateTime: Kl({
        formats: Ow,
        defaultWidth: "full"
    })
}
    , Fw = Ew
    , Aw = {
    lastWeek: "'last' eeee 'at' p",
    yesterday: "'yesterday at' p",
    today: "'today at' p",
    tomorrow: "'tomorrow at' p",
    nextWeek: "eeee 'at' p",
    other: "P"
}
    , kw = function(e, t, r, n) {
    return Aw[e]
}
    , Pw = kw;
function ko(e) {
    return function(t, r) {
        var n = r || {}, o = n.context ? String(n.context) : "standalone", i;
        if (o === "formatting" && e.formattingValues) {
            var a = e.defaultFormattingWidth || e.defaultWidth
                , s = n.width ? String(n.width) : a;
            i = e.formattingValues[s] || e.formattingValues[a]
        } else {
            var l = e.defaultWidth
                , c = n.width ? String(n.width) : e.defaultWidth;
            i = e.values[c] || e.values[l]
        }
        var u = e.argumentCallback ? e.argumentCallback(t) : t;
        return i[u]
    }
}
var Tw = {
    narrow: ["B", "A"],
    abbreviated: ["BC", "AD"],
    wide: ["Before Christ", "Anno Domini"]
}
    , $w = {
    narrow: ["1", "2", "3", "4"],
    abbreviated: ["Q1", "Q2", "Q3", "Q4"],
    wide: ["1st quarter", "2nd quarter", "3rd quarter", "4th quarter"]
}
    , Mw = {
    narrow: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
    abbreviated: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    wide: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
}
    , Rw = {
    narrow: ["S", "M", "T", "W", "T", "F", "S"],
    short: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    abbreviated: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    wide: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
}
    , Iw = {
    narrow: {
        am: "a",
        pm: "p",
        midnight: "mi",
        noon: "n",
        morning: "morning",
        afternoon: "afternoon",
        evening: "evening",
        night: "night"
    },
    abbreviated: {
        am: "AM",
        pm: "PM",
        midnight: "midnight",
        noon: "noon",
        morning: "morning",
        afternoon: "afternoon",
        evening: "evening",
        night: "night"
    },
    wide: {
        am: "a.m.",
        pm: "p.m.",
        midnight: "midnight",
        noon: "noon",
        morning: "morning",
        afternoon: "afternoon",
        evening: "evening",
        night: "night"
    }
}
    , Dw = {
    narrow: {
        am: "a",
        pm: "p",
        midnight: "mi",
        noon: "n",
        morning: "in the morning",
        afternoon: "in the afternoon",
        evening: "in the evening",
        night: "at night"
    },
    abbreviated: {
        am: "AM",
        pm: "PM",
        midnight: "midnight",
        noon: "noon",
        morning: "in the morning",
        afternoon: "in the afternoon",
        evening: "in the evening",
        night: "at night"
    },
    wide: {
        am: "a.m.",
        pm: "p.m.",
        midnight: "midnight",
        noon: "noon",
        morning: "in the morning",
        afternoon: "in the afternoon",
        evening: "in the evening",
        night: "at night"
    }
}
    , Bw = function(e, t) {
    var r = Number(e)
        , n = r % 100;
    if (n > 20 || n < 10)
        switch (n % 10) {
            case 1:
                return r + "st";
            case 2:
                return r + "nd";
            case 3:
                return r + "rd"
        }
    return r + "th"
}
    , Nw = {
    ordinalNumber: Bw,
    era: ko({
        values: Tw,
        defaultWidth: "wide"
    }),
    quarter: ko({
        values: $w,
        defaultWidth: "wide",
        argumentCallback: function(e) {
            return e - 1
        }
    }),
    month: ko({
        values: Mw,
        defaultWidth: "wide"
    }),
    day: ko({
        values: Rw,
        defaultWidth: "wide"
    }),
    dayPeriod: ko({
        values: Iw,
        defaultWidth: "wide",
        formattingValues: Dw,
        defaultFormattingWidth: "wide"
    })
}
    , Lw = Nw;
function Po(e) {
    return function(t) {
        var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}
            , n = r.width
            , o = n && e.matchPatterns[n] || e.matchPatterns[e.defaultMatchWidth]
            , i = t.match(o);
        if (!i)
            return null;
        var a = i[0], s = n && e.parsePatterns[n] || e.parsePatterns[e.defaultParseWidth], l = Array.isArray(s) ? Hw(s, function(f) {
            return f.test(a)
        }) : jw(s, function(f) {
            return f.test(a)
        }), c;
        c = e.valueCallback ? e.valueCallback(l) : l,
            c = r.valueCallback ? r.valueCallback(c) : c;
        var u = t.slice(a.length);
        return {
            value: c,
            rest: u
        }
    }
}
function jw(e, t) {
    for (var r in e)
        if (e.hasOwnProperty(r) && t(e[r]))
            return r
}
function Hw(e, t) {
    for (var r = 0; r < e.length; r++)
        if (t(e[r]))
            return r
}
function Uw(e) {
    return function(t) {
        var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}
            , n = t.match(e.matchPattern);
        if (!n)
            return null;
        var o = n[0]
            , i = t.match(e.parsePattern);
        if (!i)
            return null;
        var a = e.valueCallback ? e.valueCallback(i[0]) : i[0];
        a = r.valueCallback ? r.valueCallback(a) : a;
        var s = t.slice(o.length);
        return {
            value: a,
            rest: s
        }
    }
}
var Ww = /^(\d+)(th|st|nd|rd)?/i
    , qw = /\d+/i
    , zw = {
    narrow: /^(b|a)/i,
    abbreviated: /^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,
    wide: /^(before christ|before common era|anno domini|common era)/i
}
    , Vw = {
    any: [/^b/i, /^(a|c)/i]
}
    , Kw = {
    narrow: /^[1234]/i,
    abbreviated: /^q[1234]/i,
    wide: /^[1234](th|st|nd|rd)? quarter/i
}
    , Gw = {
    any: [/1/i, /2/i, /3/i, /4/i]
}
    , Yw = {
    narrow: /^[jfmasond]/i,
    abbreviated: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
    wide: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
}
    , Xw = {
    narrow: [/^j/i, /^f/i, /^m/i, /^a/i, /^m/i, /^j/i, /^j/i, /^a/i, /^s/i, /^o/i, /^n/i, /^d/i],
    any: [/^ja/i, /^f/i, /^mar/i, /^ap/i, /^may/i, /^jun/i, /^jul/i, /^au/i, /^s/i, /^o/i, /^n/i, /^d/i]
}
    , Jw = {
    narrow: /^[smtwf]/i,
    short: /^(su|mo|tu|we|th|fr|sa)/i,
    abbreviated: /^(sun|mon|tue|wed|thu|fri|sat)/i,
    wide: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
}
    , Qw = {
    narrow: [/^s/i, /^m/i, /^t/i, /^w/i, /^t/i, /^f/i, /^s/i],
    any: [/^su/i, /^m/i, /^tu/i, /^w/i, /^th/i, /^f/i, /^sa/i]
}
    , Zw = {
    narrow: /^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,
    any: /^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i
}
    , eC = {
    any: {
        am: /^a/i,
        pm: /^p/i,
        midnight: /^mi/i,
        noon: /^no/i,
        morning: /morning/i,
        afternoon: /afternoon/i,
        evening: /evening/i,
        night: /night/i
    }
}
    , tC = {
    ordinalNumber: Uw({
        matchPattern: Ww,
        parsePattern: qw,
        valueCallback: function(e) {
            return parseInt(e, 10)
        }
    }),
    era: Po({
        matchPatterns: zw,
        defaultMatchWidth: "wide",
        parsePatterns: Vw,
        defaultParseWidth: "any"
    }),
    quarter: Po({
        matchPatterns: Kw,
        defaultMatchWidth: "wide",
        parsePatterns: Gw,
        defaultParseWidth: "any",
        valueCallback: function(e) {
            return e + 1
        }
    }),
    month: Po({
        matchPatterns: Yw,
        defaultMatchWidth: "wide",
        parsePatterns: Xw,
        defaultParseWidth: "any"
    }),
    day: Po({
        matchPatterns: Jw,
        defaultMatchWidth: "wide",
        parsePatterns: Qw,
        defaultParseWidth: "any"
    }),
    dayPeriod: Po({
        matchPatterns: Zw,
        defaultMatchWidth: "any",
        parsePatterns: eC,
        defaultParseWidth: "any"
    })
}
    , rC = tC
    , nC = {
    code: "en-US",
    formatDistance: _w,
    formatLong: Fw,
    formatRelative: Pw,
    localize: Lw,
    match: rC,
    options: {
        weekStartsOn: 0,
        firstWeekContainsDate: 1
    }
}
    , Up = nC;
function oC(e, t) {
    De(2, arguments);
    var r = Ct(t);
    return lw(e, -r)
}
var iC = 864e5;
function aC(e) {
    De(1, arguments);
    var t = Te(e)
        , r = t.getTime();
    t.setUTCMonth(0, 1),
        t.setUTCHours(0, 0, 0, 0);
    var n = t.getTime()
        , o = r - n;
    return Math.floor(o / iC) + 1
}
function la(e) {
    De(1, arguments);
    var t = 1
        , r = Te(e)
        , n = r.getUTCDay()
        , o = (n < t ? 7 : 0) + n - t;
    return r.setUTCDate(r.getUTCDate() - o),
        r.setUTCHours(0, 0, 0, 0),
        r
}
function Wp(e) {
    De(1, arguments);
    var t = Te(e)
        , r = t.getUTCFullYear()
        , n = new Date(0);
    n.setUTCFullYear(r + 1, 0, 4),
        n.setUTCHours(0, 0, 0, 0);
    var o = la(n)
        , i = new Date(0);
    i.setUTCFullYear(r, 0, 4),
        i.setUTCHours(0, 0, 0, 0);
    var a = la(i);
    return t.getTime() >= o.getTime() ? r + 1 : t.getTime() >= a.getTime() ? r : r - 1
}
function sC(e) {
    De(1, arguments);
    var t = Wp(e)
        , r = new Date(0);
    r.setUTCFullYear(t, 0, 4),
        r.setUTCHours(0, 0, 0, 0);
    var n = la(r);
    return n
}
var lC = 6048e5;
function uC(e) {
    De(1, arguments);
    var t = Te(e)
        , r = la(t).getTime() - sC(t).getTime();
    return Math.round(r / lC) + 1
}
function ua(e, t) {
    De(1, arguments);
    var r = t || {}
        , n = r.locale
        , o = n && n.options && n.options.weekStartsOn
        , i = o == null ? 0 : Ct(o)
        , a = r.weekStartsOn == null ? i : Ct(r.weekStartsOn);
    if (!(a >= 0 && a <= 6))
        throw new RangeError("weekStartsOn must be between 0 and 6 inclusively");
    var s = Te(e)
        , l = s.getUTCDay()
        , c = (l < a ? 7 : 0) + l - a;
    return s.setUTCDate(s.getUTCDate() - c),
        s.setUTCHours(0, 0, 0, 0),
        s
}
function qp(e, t) {
    De(1, arguments);
    var r = Te(e)
        , n = r.getUTCFullYear()
        , o = t || {}
        , i = o.locale
        , a = i && i.options && i.options.firstWeekContainsDate
        , s = a == null ? 1 : Ct(a)
        , l = o.firstWeekContainsDate == null ? s : Ct(o.firstWeekContainsDate);
    if (!(l >= 1 && l <= 7))
        throw new RangeError("firstWeekContainsDate must be between 1 and 7 inclusively");
    var c = new Date(0);
    c.setUTCFullYear(n + 1, 0, l),
        c.setUTCHours(0, 0, 0, 0);
    var u = ua(c, t)
        , f = new Date(0);
    f.setUTCFullYear(n, 0, l),
        f.setUTCHours(0, 0, 0, 0);
    var d = ua(f, t);
    return r.getTime() >= u.getTime() ? n + 1 : r.getTime() >= d.getTime() ? n : n - 1
}
function cC(e, t) {
    De(1, arguments);
    var r = t || {}
        , n = r.locale
        , o = n && n.options && n.options.firstWeekContainsDate
        , i = o == null ? 1 : Ct(o)
        , a = r.firstWeekContainsDate == null ? i : Ct(r.firstWeekContainsDate)
        , s = qp(e, t)
        , l = new Date(0);
    l.setUTCFullYear(s, 0, a),
        l.setUTCHours(0, 0, 0, 0);
    var c = ua(l, t);
    return c
}
var fC = 6048e5;
function dC(e, t) {
    De(1, arguments);
    var r = Te(e)
        , n = ua(r, t).getTime() - cC(r, t).getTime();
    return Math.round(n / fC) + 1
}
function _e(e, t) {
    for (var r = e < 0 ? "-" : "", n = Math.abs(e).toString(); n.length < t; )
        n = "0" + n;
    return r + n
}
var pC = {
    y: function(e, t) {
        var r = e.getUTCFullYear()
            , n = r > 0 ? r : 1 - r;
        return _e(t === "yy" ? n % 100 : n, t.length)
    },
    M: function(e, t) {
        var r = e.getUTCMonth();
        return t === "M" ? String(r + 1) : _e(r + 1, 2)
    },
    d: function(e, t) {
        return _e(e.getUTCDate(), t.length)
    },
    a: function(e, t) {
        var r = e.getUTCHours() / 12 >= 1 ? "pm" : "am";
        switch (t) {
            case "a":
            case "aa":
                return r.toUpperCase();
            case "aaa":
                return r;
            case "aaaaa":
                return r[0];
            case "aaaa":
            default:
                return r === "am" ? "a.m." : "p.m."
        }
    },
    h: function(e, t) {
        return _e(e.getUTCHours() % 12 || 12, t.length)
    },
    H: function(e, t) {
        return _e(e.getUTCHours(), t.length)
    },
    m: function(e, t) {
        return _e(e.getUTCMinutes(), t.length)
    },
    s: function(e, t) {
        return _e(e.getUTCSeconds(), t.length)
    },
    S: function(e, t) {
        var r = t.length
            , n = e.getUTCMilliseconds()
            , o = Math.floor(n * Math.pow(10, r - 3));
        return _e(o, t.length)
    }
}
    , hr = pC
    , Dn = {
    am: "am",
    pm: "pm",
    midnight: "midnight",
    noon: "noon",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
}
    , hC = {
    G: function(e, t, r) {
        var n = e.getUTCFullYear() > 0 ? 1 : 0;
        switch (t) {
            case "G":
            case "GG":
            case "GGG":
                return r.era(n, {
                    width: "abbreviated"
                });
            case "GGGGG":
                return r.era(n, {
                    width: "narrow"
                });
            case "GGGG":
            default:
                return r.era(n, {
                    width: "wide"
                })
        }
    },
    y: function(e, t, r) {
        if (t === "yo") {
            var n = e.getUTCFullYear()
                , o = n > 0 ? n : 1 - n;
            return r.ordinalNumber(o, {
                unit: "year"
            })
        }
        return hr.y(e, t)
    },
    Y: function(e, t, r, n) {
        var o = qp(e, n)
            , i = o > 0 ? o : 1 - o;
        if (t === "YY") {
            var a = i % 100;
            return _e(a, 2)
        }
        return t === "Yo" ? r.ordinalNumber(i, {
            unit: "year"
        }) : _e(i, t.length)
    },
    R: function(e, t) {
        var r = Wp(e);
        return _e(r, t.length)
    },
    u: function(e, t) {
        var r = e.getUTCFullYear();
        return _e(r, t.length)
    },
    Q: function(e, t, r) {
        var n = Math.ceil((e.getUTCMonth() + 1) / 3);
        switch (t) {
            case "Q":
                return String(n);
            case "QQ":
                return _e(n, 2);
            case "Qo":
                return r.ordinalNumber(n, {
                    unit: "quarter"
                });
            case "QQQ":
                return r.quarter(n, {
                    width: "abbreviated",
                    context: "formatting"
                });
            case "QQQQQ":
                return r.quarter(n, {
                    width: "narrow",
                    context: "formatting"
                });
            case "QQQQ":
            default:
                return r.quarter(n, {
                    width: "wide",
                    context: "formatting"
                })
        }
    },
    q: function(e, t, r) {
        var n = Math.ceil((e.getUTCMonth() + 1) / 3);
        switch (t) {
            case "q":
                return String(n);
            case "qq":
                return _e(n, 2);
            case "qo":
                return r.ordinalNumber(n, {
                    unit: "quarter"
                });
            case "qqq":
                return r.quarter(n, {
                    width: "abbreviated",
                    context: "standalone"
                });
            case "qqqqq":
                return r.quarter(n, {
                    width: "narrow",
                    context: "standalone"
                });
            case "qqqq":
            default:
                return r.quarter(n, {
                    width: "wide",
                    context: "standalone"
                })
        }
    },
    M: function(e, t, r) {
        var n = e.getUTCMonth();
        switch (t) {
            case "M":
            case "MM":
                return hr.M(e, t);
            case "Mo":
                return r.ordinalNumber(n + 1, {
                    unit: "month"
                });
            case "MMM":
                return r.month(n, {
                    width: "abbreviated",
                    context: "formatting"
                });
            case "MMMMM":
                return r.month(n, {
                    width: "narrow",
                    context: "formatting"
                });
            case "MMMM":
            default:
                return r.month(n, {
                    width: "wide",
                    context: "formatting"
                })
        }
    },
    L: function(e, t, r) {
        var n = e.getUTCMonth();
        switch (t) {
            case "L":
                return String(n + 1);
            case "LL":
                return _e(n + 1, 2);
            case "Lo":
                return r.ordinalNumber(n + 1, {
                    unit: "month"
                });
            case "LLL":
                return r.month(n, {
                    width: "abbreviated",
                    context: "standalone"
                });
            case "LLLLL":
                return r.month(n, {
                    width: "narrow",
                    context: "standalone"
                });
            case "LLLL":
            default:
                return r.month(n, {
                    width: "wide",
                    context: "standalone"
                })
        }
    },
    w: function(e, t, r, n) {
        var o = dC(e, n);
        return t === "wo" ? r.ordinalNumber(o, {
            unit: "week"
        }) : _e(o, t.length)
    },
    I: function(e, t, r) {
        var n = uC(e);
        return t === "Io" ? r.ordinalNumber(n, {
            unit: "week"
        }) : _e(n, t.length)
    },
    d: function(e, t, r) {
        return t === "do" ? r.ordinalNumber(e.getUTCDate(), {
            unit: "date"
        }) : hr.d(e, t)
    },
    D: function(e, t, r) {
        var n = aC(e);
        return t === "Do" ? r.ordinalNumber(n, {
            unit: "dayOfYear"
        }) : _e(n, t.length)
    },
    E: function(e, t, r) {
        var n = e.getUTCDay();
        switch (t) {
            case "E":
            case "EE":
            case "EEE":
                return r.day(n, {
                    width: "abbreviated",
                    context: "formatting"
                });
            case "EEEEE":
                return r.day(n, {
                    width: "narrow",
                    context: "formatting"
                });
            case "EEEEEE":
                return r.day(n, {
                    width: "short",
                    context: "formatting"
                });
            case "EEEE":
            default:
                return r.day(n, {
                    width: "wide",
                    context: "formatting"
                })
        }
    },
    e: function(e, t, r, n) {
        var o = e.getUTCDay()
            , i = (o - n.weekStartsOn + 8) % 7 || 7;
        switch (t) {
            case "e":
                return String(i);
            case "ee":
                return _e(i, 2);
            case "eo":
                return r.ordinalNumber(i, {
                    unit: "day"
                });
            case "eee":
                return r.day(o, {
                    width: "abbreviated",
                    context: "formatting"
                });
            case "eeeee":
                return r.day(o, {
                    width: "narrow",
                    context: "formatting"
                });
            case "eeeeee":
                return r.day(o, {
                    width: "short",
                    context: "formatting"
                });
            case "eeee":
            default:
                return r.day(o, {
                    width: "wide",
                    context: "formatting"
                })
        }
    },
    c: function(e, t, r, n) {
        var o = e.getUTCDay()
            , i = (o - n.weekStartsOn + 8) % 7 || 7;
        switch (t) {
            case "c":
                return String(i);
            case "cc":
                return _e(i, t.length);
            case "co":
                return r.ordinalNumber(i, {
                    unit: "day"
                });
            case "ccc":
                return r.day(o, {
                    width: "abbreviated",
                    context: "standalone"
                });
            case "ccccc":
                return r.day(o, {
                    width: "narrow",
                    context: "standalone"
                });
            case "cccccc":
                return r.day(o, {
                    width: "short",
                    context: "standalone"
                });
            case "cccc":
            default:
                return r.day(o, {
                    width: "wide",
                    context: "standalone"
                })
        }
    },
    i: function(e, t, r) {
        var n = e.getUTCDay()
            , o = n === 0 ? 7 : n;
        switch (t) {
            case "i":
                return String(o);
            case "ii":
                return _e(o, t.length);
            case "io":
                return r.ordinalNumber(o, {
                    unit: "day"
                });
            case "iii":
                return r.day(n, {
                    width: "abbreviated",
                    context: "formatting"
                });
            case "iiiii":
                return r.day(n, {
                    width: "narrow",
                    context: "formatting"
                });
            case "iiiiii":
                return r.day(n, {
                    width: "short",
                    context: "formatting"
                });
            case "iiii":
            default:
                return r.day(n, {
                    width: "wide",
                    context: "formatting"
                })
        }
    },
    a: function(e, t, r) {
        var n = e.getUTCHours()
            , o = n / 12 >= 1 ? "pm" : "am";
        switch (t) {
            case "a":
            case "aa":
                return r.dayPeriod(o, {
                    width: "abbreviated",
                    context: "formatting"
                });
            case "aaa":
                return r.dayPeriod(o, {
                    width: "abbreviated",
                    context: "formatting"
                }).toLowerCase();
            case "aaaaa":
                return r.dayPeriod(o, {
                    width: "narrow",
                    context: "formatting"
                });
            case "aaaa":
            default:
                return r.dayPeriod(o, {
                    width: "wide",
                    context: "formatting"
                })
        }
    },
    b: function(e, t, r) {
        var n = e.getUTCHours(), o;
        switch (n === 12 ? o = Dn.noon : n === 0 ? o = Dn.midnight : o = n / 12 >= 1 ? "pm" : "am",
            t) {
            case "b":
            case "bb":
                return r.dayPeriod(o, {
                    width: "abbreviated",
                    context: "formatting"
                });
            case "bbb":
                return r.dayPeriod(o, {
                    width: "abbreviated",
                    context: "formatting"
                }).toLowerCase();
            case "bbbbb":
                return r.dayPeriod(o, {
                    width: "narrow",
                    context: "formatting"
                });
            case "bbbb":
            default:
                return r.dayPeriod(o, {
                    width: "wide",
                    context: "formatting"
                })
        }
    },
    B: function(e, t, r) {
        var n = e.getUTCHours(), o;
        switch (n >= 17 ? o = Dn.evening : n >= 12 ? o = Dn.afternoon : n >= 4 ? o = Dn.morning : o = Dn.night,
            t) {
            case "B":
            case "BB":
            case "BBB":
                return r.dayPeriod(o, {
                    width: "abbreviated",
                    context: "formatting"
                });
            case "BBBBB":
                return r.dayPeriod(o, {
                    width: "narrow",
                    context: "formatting"
                });
            case "BBBB":
            default:
                return r.dayPeriod(o, {
                    width: "wide",
                    context: "formatting"
                })
        }
    },
    h: function(e, t, r) {
        if (t === "ho") {
            var n = e.getUTCHours() % 12;
            return n === 0 && (n = 12),
                r.ordinalNumber(n, {
                    unit: "hour"
                })
        }
        return hr.h(e, t)
    },
    H: function(e, t, r) {
        return t === "Ho" ? r.ordinalNumber(e.getUTCHours(), {
            unit: "hour"
        }) : hr.H(e, t)
    },
    K: function(e, t, r) {
        var n = e.getUTCHours() % 12;
        return t === "Ko" ? r.ordinalNumber(n, {
            unit: "hour"
        }) : _e(n, t.length)
    },
    k: function(e, t, r) {
        var n = e.getUTCHours();
        return n === 0 && (n = 24),
            t === "ko" ? r.ordinalNumber(n, {
                unit: "hour"
            }) : _e(n, t.length)
    },
    m: function(e, t, r) {
        return t === "mo" ? r.ordinalNumber(e.getUTCMinutes(), {
            unit: "minute"
        }) : hr.m(e, t)
    },
    s: function(e, t, r) {
        return t === "so" ? r.ordinalNumber(e.getUTCSeconds(), {
            unit: "second"
        }) : hr.s(e, t)
    },
    S: function(e, t) {
        return hr.S(e, t)
    },
    X: function(e, t, r, n) {
        var o = n._originalDate || e
            , i = o.getTimezoneOffset();
        if (i === 0)
            return "Z";
        switch (t) {
            case "X":
                return Vp(i);
            case "XXXX":
            case "XX":
                return Vr(i);
            case "XXXXX":
            case "XXX":
            default:
                return Vr(i, ":")
        }
    },
    x: function(e, t, r, n) {
        var o = n._originalDate || e
            , i = o.getTimezoneOffset();
        switch (t) {
            case "x":
                return Vp(i);
            case "xxxx":
            case "xx":
                return Vr(i);
            case "xxxxx":
            case "xxx":
            default:
                return Vr(i, ":")
        }
    },
    O: function(e, t, r, n) {
        var o = n._originalDate || e
            , i = o.getTimezoneOffset();
        switch (t) {
            case "O":
            case "OO":
            case "OOO":
                return "GMT" + zp(i, ":");
            case "OOOO":
            default:
                return "GMT" + Vr(i, ":")
        }
    },
    z: function(e, t, r, n) {
        var o = n._originalDate || e
            , i = o.getTimezoneOffset();
        switch (t) {
            case "z":
            case "zz":
            case "zzz":
                return "GMT" + zp(i, ":");
            case "zzzz":
            default:
                return "GMT" + Vr(i, ":")
        }
    },
    t: function(e, t, r, n) {
        var o = n._originalDate || e
            , i = Math.floor(o.getTime() / 1e3);
        return _e(i, t.length)
    },
    T: function(e, t, r, n) {
        var o = n._originalDate || e
            , i = o.getTime();
        return _e(i, t.length)
    }
};
function zp(e, t) {
    var r = e > 0 ? "-" : "+"
        , n = Math.abs(e)
        , o = Math.floor(n / 60)
        , i = n % 60;
    if (i === 0)
        return r + String(o);
    var a = t || "";
    return r + String(o) + a + _e(i, 2)
}
function Vp(e, t) {
    if (e % 60 == 0) {
        var r = e > 0 ? "-" : "+";
        return r + _e(Math.abs(e) / 60, 2)
    }
    return Vr(e, t)
}
function Vr(e, t) {
    var r = t || ""
        , n = e > 0 ? "-" : "+"
        , o = Math.abs(e)
        , i = _e(Math.floor(o / 60), 2)
        , a = _e(o % 60, 2);
    return n + i + r + a
}
var vC = hC;
function Kp(e, t) {
    switch (e) {
        case "P":
            return t.date({
                width: "short"
            });
        case "PP":
            return t.date({
                width: "medium"
            });
        case "PPP":
            return t.date({
                width: "long"
            });
        case "PPPP":
        default:
            return t.date({
                width: "full"
            })
    }
}
function Gp(e, t) {
    switch (e) {
        case "p":
            return t.time({
                width: "short"
            });
        case "pp":
            return t.time({
                width: "medium"
            });
        case "ppp":
            return t.time({
                width: "long"
            });
        case "pppp":
        default:
            return t.time({
                width: "full"
            })
    }
}
function mC(e, t) {
    var r = e.match(/(P+)(p+)?/) || []
        , n = r[1]
        , o = r[2];
    if (!o)
        return Kp(e, t);
    var i;
    switch (n) {
        case "P":
            i = t.dateTime({
                width: "short"
            });
            break;
        case "PP":
            i = t.dateTime({
                width: "medium"
            });
            break;
        case "PPP":
            i = t.dateTime({
                width: "long"
            });
            break;
        case "PPPP":
        default:
            i = t.dateTime({
                width: "full"
            });
            break
    }
    return i.replace("{{date}}", Kp(n, t)).replace("{{time}}", Gp(o, t))
}
var gC = {
    p: Gp,
    P: mC
}
    , yC = gC
    , bC = ["D", "DD"]
    , wC = ["YY", "YYYY"];
function CC(e) {
    return bC.indexOf(e) !== -1
}
function _C(e) {
    return wC.indexOf(e) !== -1
}
function Yp(e, t, r) {
    if (e === "YYYY")
        throw new RangeError("Use `yyyy` instead of `YYYY` (in `".concat(t, "`) for formatting years to the input `").concat(r, "`; see: https://git.io/fxCyr"));
    if (e === "YY")
        throw new RangeError("Use `yy` instead of `YY` (in `".concat(t, "`) for formatting years to the input `").concat(r, "`; see: https://git.io/fxCyr"));
    if (e === "D")
        throw new RangeError("Use `d` instead of `D` (in `".concat(t, "`) for formatting days of the month to the input `").concat(r, "`; see: https://git.io/fxCyr"));
    if (e === "DD")
        throw new RangeError("Use `dd` instead of `DD` (in `".concat(t, "`) for formatting days of the month to the input `").concat(r, "`; see: https://git.io/fxCyr"))
}
var xC = /[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g
    , SC = /P+p+|P+|p+|''|'(''|[^'])+('|$)|./g
    , OC = /^'([^]*?)'?$/
    , EC = /''/g
    , FC = /[a-zA-Z]/;
function sk(e, t, r) {
    De(2, arguments);
    var n = String(t)
        , o = r || {}
        , i = o.locale || Up
        , a = i.options && i.options.firstWeekContainsDate
        , s = a == null ? 1 : Ct(a)
        , l = o.firstWeekContainsDate == null ? s : Ct(o.firstWeekContainsDate);
    if (!(l >= 1 && l <= 7))
        throw new RangeError("firstWeekContainsDate must be between 1 and 7 inclusively");
    var c = i.options && i.options.weekStartsOn
        , u = c == null ? 0 : Ct(c)
        , f = o.weekStartsOn == null ? u : Ct(o.weekStartsOn);
    if (!(f >= 0 && f <= 6))
        throw new RangeError("weekStartsOn must be between 0 and 6 inclusively");
    if (!i.localize)
        throw new RangeError("locale must contain localize property");
    if (!i.formatLong)
        throw new RangeError("locale must contain formatLong property");
    var d = Te(e);
    if (!cw(d))
        throw new RangeError("Invalid time value");
    var p = Vl(d)
        , g = oC(d, p)
        , m = {
        firstWeekContainsDate: l,
        weekStartsOn: f,
        locale: i,
        _originalDate: d
    }
        , h = n.match(SC).map(function(v) {
        var w = v[0];
        if (w === "p" || w === "P") {
            var S = yC[w];
            return S(v, i.formatLong, m)
        }
        return v
    }).join("").match(xC).map(function(v) {
        if (v === "''")
            return "'";
        var w = v[0];
        if (w === "'")
            return AC(v);
        var S = vC[w];
        if (S)
            return !o.useAdditionalWeekYearTokens && _C(v) && Yp(v, t, e),
            !o.useAdditionalDayOfYearTokens && CC(v) && Yp(v, t, e),
                S(g, v, i.localize, m);
        if (w.match(FC))
            throw new RangeError("Format string contains an unescaped latin alphabet character `" + w + "`");
        return v
    }).join("");
    return h
}
function AC(e) {
    return e.match(OC)[1].replace(EC, "'")
}
function kC(e, t) {
    if (e == null)
        throw new TypeError("assign requires that input parameter not be null or undefined");
    t = t || {};
    for (var r in t)
        Object.prototype.hasOwnProperty.call(t, r) && (e[r] = t[r]);
    return e
}
function PC(e) {
    return kC({}, e)
}
var Xp = 1440
    , TC = 2520
    , Gl = 43200
    , $C = 86400;
function lk(e, t) {
    var r = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    De(2, arguments);
    var n = r.locale || Up;
    if (!n.formatDistance)
        throw new RangeError("locale must contain formatDistance property");
    var o = sa(e, t);
    if (isNaN(o))
        throw new RangeError("Invalid time value");
    var i = PC(r);
    i.addSuffix = Boolean(r.addSuffix),
        i.comparison = o;
    var a, s;
    o > 0 ? (a = Te(t),
        s = Te(e)) : (a = Te(e),
        s = Te(t));
    var l = bw(s, a), c = (Vl(s) - Vl(a)) / 1e3, u = Math.round((l - c) / 60), f;
    if (u < 2)
        return r.includeSeconds ? l < 5 ? n.formatDistance("lessThanXSeconds", 5, i) : l < 10 ? n.formatDistance("lessThanXSeconds", 10, i) : l < 20 ? n.formatDistance("lessThanXSeconds", 20, i) : l < 40 ? n.formatDistance("halfAMinute", null, i) : l < 60 ? n.formatDistance("lessThanXMinutes", 1, i) : n.formatDistance("xMinutes", 1, i) : u === 0 ? n.formatDistance("lessThanXMinutes", 1, i) : n.formatDistance("xMinutes", u, i);
    if (u < 45)
        return n.formatDistance("xMinutes", u, i);
    if (u < 90)
        return n.formatDistance("aboutXHours", 1, i);
    if (u < Xp) {
        var d = Math.round(u / 60);
        return n.formatDistance("aboutXHours", d, i)
    } else {
        if (u < TC)
            return n.formatDistance("xDays", 1, i);
        if (u < Gl) {
            var p = Math.round(u / Xp);
            return n.formatDistance("xDays", p, i)
        } else if (u < $C)
            return f = Math.round(u / Gl),
                n.formatDistance("aboutXMonths", f, i)
    }
    if (f = yw(s, a),
    f < 12) {
        var g = Math.round(u / Gl);
        return n.formatDistance("xMonths", g, i)
    } else {
        var m = f % 12
            , h = Math.floor(f / 12);
        return m < 3 ? n.formatDistance("aboutXYears", h, i) : m < 9 ? n.formatDistance("overXYears", h, i) : n.formatDistance("almostXYears", h + 1, i)
    }
}
function uk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
        })])
}
function ck(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M10 19l-7-7m0 0l7-7m-7 7h18"
        })])
}
function fk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        })])
}
function dk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        })])
}
function pk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
        }), V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M15 13a3 3 0 11-6 0 3 3 0 016 0z"
        })])
}
function hk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        })])
}
function vk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        })])
}
function mk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M5 13l4 4L19 7"
        })])
}
function gk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M19 9l-7 7-7-7"
        })])
}
function yk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        })])
}
function bk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        }), V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        })])
}
function wk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        })])
}
function Ck(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
        })])
}
function _k(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        })])
}
function xk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
        })])
}
function Sk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
        })])
}
function Ok(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        })])
}
function Ek(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        })])
}
function Fk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
        })])
}
function Ak(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M13 10V3L4 14h7v7l9-11h-7z"
        })])
}
function kk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        })])
}
function Pk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
        })])
}
function Tk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        })])
}
function $k(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
        })])
}
function Mk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
        })])
}
function Rk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        })])
}
function Ik(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
        })])
}
function Dk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        })])
}
function Bk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
        })])
}
function Nk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01"
        })])
}
function Lk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        })])
}
function jk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
        })])
}
function Hk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        })])
}
function Uk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        })])
}
function Wk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        })])
}
function qk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        })])
}
function zk(e, t) {
    return Z(),
        re("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            fill: "none",
            viewBox: "0 0 24 24",
            "stroke-width": "2",
            stroke: "currentColor",
            "aria-hidden": "true"
        }, [V("path", {
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            d: "M6 18L18 6M6 6l12 12"
        })])
}
function Yl(e, t, r) {
    var n, o, i, a, s;
    t == null && (t = 100);
    function l() {
        var u = Date.now() - a;
        u < t && u >= 0 ? n = setTimeout(l, t - u) : (n = null,
        r || (s = e.apply(i, o),
            i = o = null))
    }
    var c = function() {
        i = this,
            o = arguments,
            a = Date.now();
        var u = r && !n;
        return n || (n = setTimeout(l, t)),
        u && (s = e.apply(i, o),
            i = o = null),
            s
    };
    return c.clear = function() {
        n && (clearTimeout(n),
            n = null)
    }
        ,
        c.flush = function() {
            n && (s = e.apply(i, o),
                i = o = null,
                clearTimeout(n),
                n = null)
        }
        ,
        c
}
Yl.debounce = Yl;
var Xl = Yl;
function MC(e, t, r) {
    et(e) ? st(e, (n, o) => {
            o == null || o.removeEventListener(t, r),
            n == null || n.addEventListener(t, r)
        }
    ) : Pe( () => {
            e.addEventListener(t, r)
        }
    ),
        uo( () => {
                var n;
                (n = lt(e)) === null || n === void 0 || n.removeEventListener(t, r)
            }
        )
}
function RC(e, t) {
    const r = "pointerdown";
    return window ? MC(window, r, o => {
            const i = lt(e);
            !i || i === o.target || o.composedPath().includes(i) || t(o)
        }
    ) : void 0
}
function IC(e, t, r) {
    let n = null;
    const o = U(!1);
    Pe( () => {
            (e.content !== void 0 || r.value) && (o.value = !0),
                n = new MutationObserver(i),
                n.observe(t.value, {
                    childList: !0,
                    subtree: !0
                })
        }
    ),
        uo( () => n.disconnect()),
        st(r, a => {
                a ? o.value = !0 : o.value = !1
            }
        );
    const i = () => {
            e.content ? o.value = !0 : o.value = !1
        }
    ;
    return {
        hasContent: o
    }
}
function Bn(e, t) {
    var r = e.getBoundingClientRect()
        , n = 1
        , o = 1;
    return {
        width: r.width / n,
        height: r.height / o,
        top: r.top / o,
        right: r.right / n,
        bottom: r.bottom / o,
        left: r.left / n,
        x: r.left / n,
        y: r.top / o
    }
}
function Mt(e) {
    if (e == null)
        return window;
    if (e.toString() !== "[object Window]") {
        var t = e.ownerDocument;
        return t && t.defaultView || window
    }
    return e
}
function Jl(e) {
    var t = Mt(e)
        , r = t.pageXOffset
        , n = t.pageYOffset;
    return {
        scrollLeft: r,
        scrollTop: n
    }
}
function To(e) {
    var t = Mt(e).Element;
    return e instanceof t || e instanceof Element
}
function _t(e) {
    var t = Mt(e).HTMLElement;
    return e instanceof t || e instanceof HTMLElement
}
function Jp(e) {
    if (typeof ShadowRoot == "undefined")
        return !1;
    var t = Mt(e).ShadowRoot;
    return e instanceof t || e instanceof ShadowRoot
}
function DC(e) {
    return {
        scrollLeft: e.scrollLeft,
        scrollTop: e.scrollTop
    }
}
function BC(e) {
    return e === Mt(e) || !_t(e) ? Jl(e) : DC(e)
}
function Ht(e) {
    return e ? (e.nodeName || "").toLowerCase() : null
}
function vr(e) {
    return ((To(e) ? e.ownerDocument : e.document) || window.document).documentElement
}
function Ql(e) {
    return Bn(vr(e)).left + Jl(e).scrollLeft
}
function Xt(e) {
    return Mt(e).getComputedStyle(e)
}
function Zl(e) {
    var t = Xt(e)
        , r = t.overflow
        , n = t.overflowX
        , o = t.overflowY;
    return /auto|scroll|overlay|hidden/.test(r + o + n)
}
function NC(e) {
    var t = e.getBoundingClientRect()
        , r = t.width / e.offsetWidth || 1
        , n = t.height / e.offsetHeight || 1;
    return r !== 1 || n !== 1
}
function LC(e, t, r) {
    r === void 0 && (r = !1);
    var n = _t(t);
    _t(t) && NC(t);
    var o = vr(t)
        , i = Bn(e)
        , a = {
        scrollLeft: 0,
        scrollTop: 0
    }
        , s = {
        x: 0,
        y: 0
    };
    return (n || !n && !r) && ((Ht(t) !== "body" || Zl(o)) && (a = BC(t)),
        _t(t) ? (s = Bn(t),
            s.x += t.clientLeft,
            s.y += t.clientTop) : o && (s.x = Ql(o))),
        {
            x: i.left + a.scrollLeft - s.x,
            y: i.top + a.scrollTop - s.y,
            width: i.width,
            height: i.height
        }
}
function eu(e) {
    var t = Bn(e)
        , r = e.offsetWidth
        , n = e.offsetHeight;
    return Math.abs(t.width - r) <= 1 && (r = t.width),
    Math.abs(t.height - n) <= 1 && (n = t.height),
        {
            x: e.offsetLeft,
            y: e.offsetTop,
            width: r,
            height: n
        }
}
function ca(e) {
    return Ht(e) === "html" ? e : e.assignedSlot || e.parentNode || (Jp(e) ? e.host : null) || vr(e)
}
function Qp(e) {
    return ["html", "body", "#document"].indexOf(Ht(e)) >= 0 ? e.ownerDocument.body : _t(e) && Zl(e) ? e : Qp(ca(e))
}
function $o(e, t) {
    var r;
    t === void 0 && (t = []);
    var n = Qp(e)
        , o = n === ((r = e.ownerDocument) == null ? void 0 : r.body)
        , i = Mt(n)
        , a = o ? [i].concat(i.visualViewport || [], Zl(n) ? n : []) : n
        , s = t.concat(a);
    return o ? s : s.concat($o(ca(a)))
}
function jC(e) {
    return ["table", "td", "th"].indexOf(Ht(e)) >= 0
}
function Zp(e) {
    return !_t(e) || Xt(e).position === "fixed" ? null : e.offsetParent
}
function HC(e) {
    var t = navigator.userAgent.toLowerCase().indexOf("firefox") !== -1
        , r = navigator.userAgent.indexOf("Trident") !== -1;
    if (r && _t(e)) {
        var n = Xt(e);
        if (n.position === "fixed")
            return null
    }
    for (var o = ca(e); _t(o) && ["html", "body"].indexOf(Ht(o)) < 0; ) {
        var i = Xt(o);
        if (i.transform !== "none" || i.perspective !== "none" || i.contain === "paint" || ["transform", "perspective"].indexOf(i.willChange) !== -1 || t && i.willChange === "filter" || t && i.filter && i.filter !== "none")
            return o;
        o = o.parentNode
    }
    return null
}
function Mo(e) {
    for (var t = Mt(e), r = Zp(e); r && jC(r) && Xt(r).position === "static"; )
        r = Zp(r);
    return r && (Ht(r) === "html" || Ht(r) === "body" && Xt(r).position === "static") ? t : r || HC(e) || t
}
var xt = "top"
    , Rt = "bottom"
    , It = "right"
    , St = "left"
    , tu = "auto"
    , Ro = [xt, Rt, It, St]
    , Nn = "start"
    , Io = "end"
    , UC = "clippingParents"
    , eh = "viewport"
    , Do = "popper"
    , WC = "reference"
    , th = Ro.reduce(function(e, t) {
    return e.concat([t + "-" + Nn, t + "-" + Io])
}, [])
    , rh = [].concat(Ro, [tu]).reduce(function(e, t) {
    return e.concat([t, t + "-" + Nn, t + "-" + Io])
}, [])
    , qC = "beforeRead"
    , zC = "read"
    , VC = "afterRead"
    , KC = "beforeMain"
    , GC = "main"
    , YC = "afterMain"
    , XC = "beforeWrite"
    , JC = "write"
    , QC = "afterWrite"
    , ZC = [qC, zC, VC, KC, GC, YC, XC, JC, QC];
function e3(e) {
    var t = new Map
        , r = new Set
        , n = [];
    e.forEach(function(i) {
        t.set(i.name, i)
    });
    function o(i) {
        r.add(i.name);
        var a = [].concat(i.requires || [], i.requiresIfExists || []);
        a.forEach(function(s) {
            if (!r.has(s)) {
                var l = t.get(s);
                l && o(l)
            }
        }),
            n.push(i)
    }
    return e.forEach(function(i) {
        r.has(i.name) || o(i)
    }),
        n
}
function t3(e) {
    var t = e3(e);
    return ZC.reduce(function(r, n) {
        return r.concat(t.filter(function(o) {
            return o.phase === n
        }))
    }, [])
}
function r3(e) {
    var t;
    return function() {
        return t || (t = new Promise(function(r) {
                Promise.resolve().then(function() {
                    t = void 0,
                        r(e())
                })
            }
        )),
            t
    }
}
function Ut(e) {
    return e.split("-")[0]
}
function n3(e) {
    var t = e.reduce(function(r, n) {
        var o = r[n.name];
        return r[n.name] = o ? Object.assign({}, o, n, {
            options: Object.assign({}, o.options, n.options),
            data: Object.assign({}, o.data, n.data)
        }) : n,
            r
    }, {});
    return Object.keys(t).map(function(r) {
        return t[r]
    })
}
function o3(e) {
    var t = Mt(e)
        , r = vr(e)
        , n = t.visualViewport
        , o = r.clientWidth
        , i = r.clientHeight
        , a = 0
        , s = 0;
    return n && (o = n.width,
        i = n.height,
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || (a = n.offsetLeft,
        s = n.offsetTop)),
        {
            width: o,
            height: i,
            x: a + Ql(e),
            y: s
        }
}
var mr = Math.max
    , Bo = Math.min
    , fa = Math.round;
function i3(e) {
    var t, r = vr(e), n = Jl(e), o = (t = e.ownerDocument) == null ? void 0 : t.body, i = mr(r.scrollWidth, r.clientWidth, o ? o.scrollWidth : 0, o ? o.clientWidth : 0), a = mr(r.scrollHeight, r.clientHeight, o ? o.scrollHeight : 0, o ? o.clientHeight : 0), s = -n.scrollLeft + Ql(e), l = -n.scrollTop;
    return Xt(o || r).direction === "rtl" && (s += mr(r.clientWidth, o ? o.clientWidth : 0) - i),
        {
            width: i,
            height: a,
            x: s,
            y: l
        }
}
function nh(e, t) {
    var r = t.getRootNode && t.getRootNode();
    if (e.contains(t))
        return !0;
    if (r && Jp(r)) {
        var n = t;
        do {
            if (n && e.isSameNode(n))
                return !0;
            n = n.parentNode || n.host
        } while (n)
    }
    return !1
}
function ru(e) {
    return Object.assign({}, e, {
        left: e.x,
        top: e.y,
        right: e.x + e.width,
        bottom: e.y + e.height
    })
}
function a3(e) {
    var t = Bn(e);
    return t.top = t.top + e.clientTop,
        t.left = t.left + e.clientLeft,
        t.bottom = t.top + e.clientHeight,
        t.right = t.left + e.clientWidth,
        t.width = e.clientWidth,
        t.height = e.clientHeight,
        t.x = t.left,
        t.y = t.top,
        t
}
function oh(e, t) {
    return t === eh ? ru(o3(e)) : _t(t) ? a3(t) : ru(i3(vr(e)))
}
function s3(e) {
    var t = $o(ca(e))
        , r = ["absolute", "fixed"].indexOf(Xt(e).position) >= 0
        , n = r && _t(e) ? Mo(e) : e;
    return To(n) ? t.filter(function(o) {
        return To(o) && nh(o, n) && Ht(o) !== "body"
    }) : []
}
function l3(e, t, r) {
    var n = t === "clippingParents" ? s3(e) : [].concat(t)
        , o = [].concat(n, [r])
        , i = o[0]
        , a = o.reduce(function(s, l) {
        var c = oh(e, l);
        return s.top = mr(c.top, s.top),
            s.right = Bo(c.right, s.right),
            s.bottom = Bo(c.bottom, s.bottom),
            s.left = mr(c.left, s.left),
            s
    }, oh(e, i));
    return a.width = a.right - a.left,
        a.height = a.bottom - a.top,
        a.x = a.left,
        a.y = a.top,
        a
}
function Ln(e) {
    return e.split("-")[1]
}
function nu(e) {
    return ["top", "bottom"].indexOf(e) >= 0 ? "x" : "y"
}
function ih(e) {
    var t = e.reference, r = e.element, n = e.placement, o = n ? Ut(n) : null, i = n ? Ln(n) : null, a = t.x + t.width / 2 - r.width / 2, s = t.y + t.height / 2 - r.height / 2, l;
    switch (o) {
        case xt:
            l = {
                x: a,
                y: t.y - r.height
            };
            break;
        case Rt:
            l = {
                x: a,
                y: t.y + t.height
            };
            break;
        case It:
            l = {
                x: t.x + t.width,
                y: s
            };
            break;
        case St:
            l = {
                x: t.x - r.width,
                y: s
            };
            break;
        default:
            l = {
                x: t.x,
                y: t.y
            }
    }
    var c = o ? nu(o) : null;
    if (c != null) {
        var u = c === "y" ? "height" : "width";
        switch (i) {
            case Nn:
                l[c] = l[c] - (t[u] / 2 - r[u] / 2);
                break;
            case Io:
                l[c] = l[c] + (t[u] / 2 - r[u] / 2);
                break
        }
    }
    return l
}
function ah() {
    return {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    }
}
function sh(e) {
    return Object.assign({}, ah(), e)
}
function lh(e, t) {
    return t.reduce(function(r, n) {
        return r[n] = e,
            r
    }, {})
}
function ou(e, t) {
    t === void 0 && (t = {});
    var r = t
        , n = r.placement
        , o = n === void 0 ? e.placement : n
        , i = r.boundary
        , a = i === void 0 ? UC : i
        , s = r.rootBoundary
        , l = s === void 0 ? eh : s
        , c = r.elementContext
        , u = c === void 0 ? Do : c
        , f = r.altBoundary
        , d = f === void 0 ? !1 : f
        , p = r.padding
        , g = p === void 0 ? 0 : p
        , m = sh(typeof g != "number" ? g : lh(g, Ro))
        , h = u === Do ? WC : Do
        , v = e.rects.popper
        , w = e.elements[d ? h : u]
        , S = l3(To(w) ? w : w.contextElement || vr(e.elements.popper), a, l)
        , b = Bn(e.elements.reference)
        , O = ih({
        reference: b,
        element: v,
        strategy: "absolute",
        placement: o
    })
        , C = ru(Object.assign({}, v, O))
        , _ = u === Do ? C : b
        , E = {
        top: S.top - _.top + m.top,
        bottom: _.bottom - S.bottom + m.bottom,
        left: S.left - _.left + m.left,
        right: _.right - S.right + m.right
    }
        , A = e.modifiersData.offset;
    if (u === Do && A) {
        var M = A[o];
        Object.keys(E).forEach(function(I) {
            var F = [It, Rt].indexOf(I) >= 0 ? 1 : -1
                , B = [xt, Rt].indexOf(I) >= 0 ? "y" : "x";
            E[I] += M[B] * F
        })
    }
    return E
}
var uh = {
    placement: "bottom",
    modifiers: [],
    strategy: "absolute"
};
function ch() {
    for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++)
        t[r] = arguments[r];
    return !t.some(function(n) {
        return !(n && typeof n.getBoundingClientRect == "function")
    })
}
function u3(e) {
    e === void 0 && (e = {});
    var t = e
        , r = t.defaultModifiers
        , n = r === void 0 ? [] : r
        , o = t.defaultOptions
        , i = o === void 0 ? uh : o;
    return function(s, l, c) {
        c === void 0 && (c = i);
        var u = {
            placement: "bottom",
            orderedModifiers: [],
            options: Object.assign({}, uh, i),
            modifiersData: {},
            elements: {
                reference: s,
                popper: l
            },
            attributes: {},
            styles: {}
        }
            , f = []
            , d = !1
            , p = {
            state: u,
            setOptions: function(v) {
                var w = typeof v == "function" ? v(u.options) : v;
                m(),
                    u.options = Object.assign({}, i, u.options, w),
                    u.scrollParents = {
                        reference: To(s) ? $o(s) : s.contextElement ? $o(s.contextElement) : [],
                        popper: $o(l)
                    };
                var S = t3(n3([].concat(n, u.options.modifiers)));
                return u.orderedModifiers = S.filter(function(b) {
                    return b.enabled
                }),
                    g(),
                    p.update()
            },
            forceUpdate: function() {
                if (!d) {
                    var v = u.elements
                        , w = v.reference
                        , S = v.popper;
                    if (!!ch(w, S)) {
                        u.rects = {
                            reference: LC(w, Mo(S), u.options.strategy === "fixed"),
                            popper: eu(S)
                        },
                            u.reset = !1,
                            u.placement = u.options.placement,
                            u.orderedModifiers.forEach(function(M) {
                                return u.modifiersData[M.name] = Object.assign({}, M.data)
                            });
                        for (var b = 0; b < u.orderedModifiers.length; b++) {
                            if (u.reset === !0) {
                                u.reset = !1,
                                    b = -1;
                                continue
                            }
                            var O = u.orderedModifiers[b]
                                , C = O.fn
                                , _ = O.options
                                , E = _ === void 0 ? {} : _
                                , A = O.name;
                            typeof C == "function" && (u = C({
                                state: u,
                                options: E,
                                name: A,
                                instance: p
                            }) || u)
                        }
                    }
                }
            },
            update: r3(function() {
                return new Promise(function(h) {
                        p.forceUpdate(),
                            h(u)
                    }
                )
            }),
            destroy: function() {
                m(),
                    d = !0
            }
        };
        if (!ch(s, l))
            return p;
        p.setOptions(c).then(function(h) {
            !d && c.onFirstUpdate && c.onFirstUpdate(h)
        });
        function g() {
            u.orderedModifiers.forEach(function(h) {
                var v = h.name
                    , w = h.options
                    , S = w === void 0 ? {} : w
                    , b = h.effect;
                if (typeof b == "function") {
                    var O = b({
                        state: u,
                        name: v,
                        instance: p,
                        options: S
                    })
                        , C = function() {};
                    f.push(O || C)
                }
            })
        }
        function m() {
            f.forEach(function(h) {
                return h()
            }),
                f = []
        }
        return p
    }
}
var da = {
    passive: !0
};
function c3(e) {
    var t = e.state
        , r = e.instance
        , n = e.options
        , o = n.scroll
        , i = o === void 0 ? !0 : o
        , a = n.resize
        , s = a === void 0 ? !0 : a
        , l = Mt(t.elements.popper)
        , c = [].concat(t.scrollParents.reference, t.scrollParents.popper);
    return i && c.forEach(function(u) {
        u.addEventListener("scroll", r.update, da)
    }),
    s && l.addEventListener("resize", r.update, da),
        function() {
            i && c.forEach(function(u) {
                u.removeEventListener("scroll", r.update, da)
            }),
            s && l.removeEventListener("resize", r.update, da)
        }
}
var f3 = {
    name: "eventListeners",
    enabled: !0,
    phase: "write",
    fn: function() {},
    effect: c3,
    data: {}
};
function d3(e) {
    var t = e.state
        , r = e.name;
    t.modifiersData[r] = ih({
        reference: t.rects.reference,
        element: t.rects.popper,
        strategy: "absolute",
        placement: t.placement
    })
}
var p3 = {
    name: "popperOffsets",
    enabled: !0,
    phase: "read",
    fn: d3,
    data: {}
}
    , h3 = {
    top: "auto",
    right: "auto",
    bottom: "auto",
    left: "auto"
};
function v3(e) {
    var t = e.x
        , r = e.y
        , n = window
        , o = n.devicePixelRatio || 1;
    return {
        x: fa(fa(t * o) / o) || 0,
        y: fa(fa(r * o) / o) || 0
    }
}
function fh(e) {
    var t, r = e.popper, n = e.popperRect, o = e.placement, i = e.variation, a = e.offsets, s = e.position, l = e.gpuAcceleration, c = e.adaptive, u = e.roundOffsets, f = u === !0 ? v3(a) : typeof u == "function" ? u(a) : a, d = f.x, p = d === void 0 ? 0 : d, g = f.y, m = g === void 0 ? 0 : g, h = a.hasOwnProperty("x"), v = a.hasOwnProperty("y"), w = St, S = xt, b = window;
    if (c) {
        var O = Mo(r)
            , C = "clientHeight"
            , _ = "clientWidth";
        O === Mt(r) && (O = vr(r),
        Xt(O).position !== "static" && s === "absolute" && (C = "scrollHeight",
            _ = "scrollWidth")),
            O = O,
        (o === xt || (o === St || o === It) && i === Io) && (S = Rt,
            m -= O[C] - n.height,
            m *= l ? 1 : -1),
        (o === St || (o === xt || o === Rt) && i === Io) && (w = It,
            p -= O[_] - n.width,
            p *= l ? 1 : -1)
    }
    var E = Object.assign({
        position: s
    }, c && h3);
    if (l) {
        var A;
        return Object.assign({}, E, (A = {},
            A[S] = v ? "0" : "",
            A[w] = h ? "0" : "",
            A.transform = (b.devicePixelRatio || 1) <= 1 ? "translate(" + p + "px, " + m + "px)" : "translate3d(" + p + "px, " + m + "px, 0)",
            A))
    }
    return Object.assign({}, E, (t = {},
        t[S] = v ? m + "px" : "",
        t[w] = h ? p + "px" : "",
        t.transform = "",
        t))
}
function m3(e) {
    var t = e.state
        , r = e.options
        , n = r.gpuAcceleration
        , o = n === void 0 ? !0 : n
        , i = r.adaptive
        , a = i === void 0 ? !0 : i
        , s = r.roundOffsets
        , l = s === void 0 ? !0 : s
        , c = {
        placement: Ut(t.placement),
        variation: Ln(t.placement),
        popper: t.elements.popper,
        popperRect: t.rects.popper,
        gpuAcceleration: o
    };
    t.modifiersData.popperOffsets != null && (t.styles.popper = Object.assign({}, t.styles.popper, fh(Object.assign({}, c, {
        offsets: t.modifiersData.popperOffsets,
        position: t.options.strategy,
        adaptive: a,
        roundOffsets: l
    })))),
    t.modifiersData.arrow != null && (t.styles.arrow = Object.assign({}, t.styles.arrow, fh(Object.assign({}, c, {
        offsets: t.modifiersData.arrow,
        position: "absolute",
        adaptive: !1,
        roundOffsets: l
    })))),
        t.attributes.popper = Object.assign({}, t.attributes.popper, {
            "data-popper-placement": t.placement
        })
}
var g3 = {
    name: "computeStyles",
    enabled: !0,
    phase: "beforeWrite",
    fn: m3,
    data: {}
};
function y3(e) {
    var t = e.state;
    Object.keys(t.elements).forEach(function(r) {
        var n = t.styles[r] || {}
            , o = t.attributes[r] || {}
            , i = t.elements[r];
        !_t(i) || !Ht(i) || (Object.assign(i.style, n),
            Object.keys(o).forEach(function(a) {
                var s = o[a];
                s === !1 ? i.removeAttribute(a) : i.setAttribute(a, s === !0 ? "" : s)
            }))
    })
}
function b3(e) {
    var t = e.state
        , r = {
        popper: {
            position: t.options.strategy,
            left: "0",
            top: "0",
            margin: "0"
        },
        arrow: {
            position: "absolute"
        },
        reference: {}
    };
    return Object.assign(t.elements.popper.style, r.popper),
        t.styles = r,
    t.elements.arrow && Object.assign(t.elements.arrow.style, r.arrow),
        function() {
            Object.keys(t.elements).forEach(function(n) {
                var o = t.elements[n]
                    , i = t.attributes[n] || {}
                    , a = Object.keys(t.styles.hasOwnProperty(n) ? t.styles[n] : r[n])
                    , s = a.reduce(function(l, c) {
                    return l[c] = "",
                        l
                }, {});
                !_t(o) || !Ht(o) || (Object.assign(o.style, s),
                    Object.keys(i).forEach(function(l) {
                        o.removeAttribute(l)
                    }))
            })
        }
}
var w3 = {
    name: "applyStyles",
    enabled: !0,
    phase: "write",
    fn: y3,
    effect: b3,
    requires: ["computeStyles"]
}
    , C3 = [f3, p3, g3, w3]
    , _3 = u3({
    defaultModifiers: C3
});
function x3(e) {
    return e === "x" ? "y" : "x"
}
function pa(e, t, r) {
    return mr(e, Bo(t, r))
}
function S3(e) {
    var t = e.state
        , r = e.options
        , n = e.name
        , o = r.mainAxis
        , i = o === void 0 ? !0 : o
        , a = r.altAxis
        , s = a === void 0 ? !1 : a
        , l = r.boundary
        , c = r.rootBoundary
        , u = r.altBoundary
        , f = r.padding
        , d = r.tether
        , p = d === void 0 ? !0 : d
        , g = r.tetherOffset
        , m = g === void 0 ? 0 : g
        , h = ou(t, {
        boundary: l,
        rootBoundary: c,
        padding: f,
        altBoundary: u
    })
        , v = Ut(t.placement)
        , w = Ln(t.placement)
        , S = !w
        , b = nu(v)
        , O = x3(b)
        , C = t.modifiersData.popperOffsets
        , _ = t.rects.reference
        , E = t.rects.popper
        , A = typeof m == "function" ? m(Object.assign({}, t.rects, {
        placement: t.placement
    })) : m
        , M = {
        x: 0,
        y: 0
    };
    if (!!C) {
        if (i || s) {
            var I = b === "y" ? xt : St
                , F = b === "y" ? Rt : It
                , B = b === "y" ? "height" : "width"
                , K = C[b]
                , oe = C[b] + h[I]
                , ee = C[b] - h[F]
                , ne = p ? -E[B] / 2 : 0
                , se = w === Nn ? _[B] : E[B]
                , xe = w === Nn ? -E[B] : -_[B]
                , Be = t.elements.arrow
                , We = p && Be ? eu(Be) : {
                width: 0,
                height: 0
            }
                , Xe = t.modifiersData["arrow#persistent"] ? t.modifiersData["arrow#persistent"].padding : ah()
                , Je = Xe[I]
                , Ot = Xe[F]
                , P = pa(0, _[B], We[B])
                , G = S ? _[B] / 2 - ne - P - Je - A : se - P - Je - A
                , j = S ? -_[B] / 2 + ne + P + Ot + A : xe + P + Ot + A
                , Y = t.elements.arrow && Mo(t.elements.arrow)
                , be = Y ? b === "y" ? Y.clientTop || 0 : Y.clientLeft || 0 : 0
                , we = t.modifiersData.offset ? t.modifiersData.offset[t.placement][b] : 0
                , fe = C[b] + G - we - be
                , le = C[b] + j - we;
            if (i) {
                var y = pa(p ? Bo(oe, fe) : oe, K, p ? mr(ee, le) : ee);
                C[b] = y,
                    M[b] = y - K
            }
            if (s) {
                var x = b === "x" ? xt : St
                    , k = b === "x" ? Rt : It
                    , T = C[O]
                    , $ = T + h[x]
                    , N = T - h[k]
                    , q = pa(p ? Bo($, fe) : $, T, p ? mr(N, le) : N);
                C[O] = q,
                    M[O] = q - T
            }
        }
        t.modifiersData[n] = M
    }
}
var O3 = {
    name: "preventOverflow",
    enabled: !0,
    phase: "main",
    fn: S3,
    requiresIfExists: ["offset"]
}
    , E3 = {
    left: "right",
    right: "left",
    bottom: "top",
    top: "bottom"
};
function ha(e) {
    return e.replace(/left|right|bottom|top/g, function(t) {
        return E3[t]
    })
}
var F3 = {
    start: "end",
    end: "start"
};
function dh(e) {
    return e.replace(/start|end/g, function(t) {
        return F3[t]
    })
}
function A3(e, t) {
    t === void 0 && (t = {});
    var r = t
        , n = r.placement
        , o = r.boundary
        , i = r.rootBoundary
        , a = r.padding
        , s = r.flipVariations
        , l = r.allowedAutoPlacements
        , c = l === void 0 ? rh : l
        , u = Ln(n)
        , f = u ? s ? th : th.filter(function(g) {
        return Ln(g) === u
    }) : Ro
        , d = f.filter(function(g) {
        return c.indexOf(g) >= 0
    });
    d.length === 0 && (d = f);
    var p = d.reduce(function(g, m) {
        return g[m] = ou(e, {
            placement: m,
            boundary: o,
            rootBoundary: i,
            padding: a
        })[Ut(m)],
            g
    }, {});
    return Object.keys(p).sort(function(g, m) {
        return p[g] - p[m]
    })
}
function k3(e) {
    if (Ut(e) === tu)
        return [];
    var t = ha(e);
    return [dh(e), t, dh(t)]
}
function P3(e) {
    var t = e.state
        , r = e.options
        , n = e.name;
    if (!t.modifiersData[n]._skip) {
        for (var o = r.mainAxis, i = o === void 0 ? !0 : o, a = r.altAxis, s = a === void 0 ? !0 : a, l = r.fallbackPlacements, c = r.padding, u = r.boundary, f = r.rootBoundary, d = r.altBoundary, p = r.flipVariations, g = p === void 0 ? !0 : p, m = r.allowedAutoPlacements, h = t.options.placement, v = Ut(h), w = v === h, S = l || (w || !g ? [ha(h)] : k3(h)), b = [h].concat(S).reduce(function(Ot, P) {
            return Ot.concat(Ut(P) === tu ? A3(t, {
                placement: P,
                boundary: u,
                rootBoundary: f,
                padding: c,
                flipVariations: g,
                allowedAutoPlacements: m
            }) : P)
        }, []), O = t.rects.reference, C = t.rects.popper, _ = new Map, E = !0, A = b[0], M = 0; M < b.length; M++) {
            var I = b[M]
                , F = Ut(I)
                , B = Ln(I) === Nn
                , K = [xt, Rt].indexOf(F) >= 0
                , oe = K ? "width" : "height"
                , ee = ou(t, {
                placement: I,
                boundary: u,
                rootBoundary: f,
                altBoundary: d,
                padding: c
            })
                , ne = K ? B ? It : St : B ? Rt : xt;
            O[oe] > C[oe] && (ne = ha(ne));
            var se = ha(ne)
                , xe = [];
            if (i && xe.push(ee[F] <= 0),
            s && xe.push(ee[ne] <= 0, ee[se] <= 0),
                xe.every(function(Ot) {
                    return Ot
                })) {
                A = I,
                    E = !1;
                break
            }
            _.set(I, xe)
        }
        if (E)
            for (var Be = g ? 3 : 1, We = function(P) {
                var G = b.find(function(j) {
                    var Y = _.get(j);
                    if (Y)
                        return Y.slice(0, P).every(function(be) {
                            return be
                        })
                });
                if (G)
                    return A = G,
                        "break"
            }, Xe = Be; Xe > 0; Xe--) {
                var Je = We(Xe);
                if (Je === "break")
                    break
            }
        t.placement !== A && (t.modifiersData[n]._skip = !0,
            t.placement = A,
            t.reset = !0)
    }
}
var T3 = {
    name: "flip",
    enabled: !0,
    phase: "main",
    fn: P3,
    requiresIfExists: ["offset"],
    data: {
        _skip: !1
    }
};
function $3(e, t, r) {
    var n = Ut(e)
        , o = [St, xt].indexOf(n) >= 0 ? -1 : 1
        , i = typeof r == "function" ? r(Object.assign({}, t, {
        placement: e
    })) : r
        , a = i[0]
        , s = i[1];
    return a = a || 0,
        s = (s || 0) * o,
        [St, It].indexOf(n) >= 0 ? {
            x: s,
            y: a
        } : {
            x: a,
            y: s
        }
}
function M3(e) {
    var t = e.state
        , r = e.options
        , n = e.name
        , o = r.offset
        , i = o === void 0 ? [0, 0] : o
        , a = rh.reduce(function(u, f) {
        return u[f] = $3(f, t.rects, i),
            u
    }, {})
        , s = a[t.placement]
        , l = s.x
        , c = s.y;
    t.modifiersData.popperOffsets != null && (t.modifiersData.popperOffsets.x += l,
        t.modifiersData.popperOffsets.y += c),
        t.modifiersData[n] = a
}
var R3 = {
    name: "offset",
    enabled: !0,
    phase: "main",
    requires: ["popperOffsets"],
    fn: M3
}
    , I3 = function(t, r) {
    return t = typeof t == "function" ? t(Object.assign({}, r.rects, {
        placement: r.placement
    })) : t,
        sh(typeof t != "number" ? t : lh(t, Ro))
};
function D3(e) {
    var t, r = e.state, n = e.name, o = e.options, i = r.elements.arrow, a = r.modifiersData.popperOffsets, s = Ut(r.placement), l = nu(s), c = [St, It].indexOf(s) >= 0, u = c ? "height" : "width";
    if (!(!i || !a)) {
        var f = I3(o.padding, r)
            , d = eu(i)
            , p = l === "y" ? xt : St
            , g = l === "y" ? Rt : It
            , m = r.rects.reference[u] + r.rects.reference[l] - a[l] - r.rects.popper[u]
            , h = a[l] - r.rects.reference[l]
            , v = Mo(i)
            , w = v ? l === "y" ? v.clientHeight || 0 : v.clientWidth || 0 : 0
            , S = m / 2 - h / 2
            , b = f[p]
            , O = w - d[u] - f[g]
            , C = w / 2 - d[u] / 2 + S
            , _ = pa(b, C, O)
            , E = l;
        r.modifiersData[n] = (t = {},
            t[E] = _,
            t.centerOffset = _ - C,
            t)
    }
}
function B3(e) {
    var t = e.state
        , r = e.options
        , n = r.element
        , o = n === void 0 ? "[data-popper-arrow]" : n;
    o != null && (typeof o == "string" && (o = t.elements.popper.querySelector(o),
        !o) || !nh(t.elements.popper, o) || (t.elements.arrow = o))
}
var N3 = {
    name: "arrow",
    enabled: !0,
    phase: "main",
    fn: D3,
    effect: B3,
    requires: ["popperOffsets"],
    requiresIfExists: ["preventOverflow"]
};
const iu = e => parseInt(e, 10);
function L3({arrowPadding: e, emit: t, locked: r, offsetDistance: n, offsetSkid: o, placement: i, popperNode: a, triggerNode: s}) {
    const l = er({
            isOpen: !1,
            popperInstance: null
        })
        , c = m => {
            var h;
            (h = l.popperInstance) === null || h === void 0 || h.setOptions(v => Qe(z({}, v), {
                modifiers: [...v.modifiers, {
                    name: "eventListeners",
                    enabled: m
                }]
            }))
        }
        , u = () => c(!0)
        , f = () => c(!1)
        , d = () => {
            !l.isOpen || (l.isOpen = !1,
                t("close:popper"))
        }
        , p = () => {
            l.isOpen || (l.isOpen = !0,
                t("open:popper"))
        }
    ;
    st([ () => l.isOpen, i], async ([m]) => {
            m ? (await g(),
                u()) : f()
        }
    );
    const g = async () => {
            await Se(),
                l.popperInstance = _3(s.value, a.value, {
                    placement: i.value,
                    modifiers: [O3, T3, {
                        name: "flip",
                        enabled: !r.value
                    }, N3, {
                        name: "arrow",
                        options: {
                            padding: iu(e.value)
                        }
                    }, R3, {
                        name: "offset",
                        options: {
                            offset: [iu(o.value), iu(n.value)]
                        }
                    }]
                }),
                l.popperInstance.update()
        }
    ;
    return uo( () => {
            var m;
            (m = l.popperInstance) === null || m === void 0 || m.destroy()
        }
    ),
        Qe(z({}, Ac(l)), {
            open: p,
            close: d
        })
}
const j3 = {
    id: "arrow",
    "data-popper-arrow": ""
};
function H3(e, t) {
    return Z(),
        of("div", j3)
}
function ph(e, t) {
    t === void 0 && (t = {});
    var r = t.insertAt;
    if (!(!e || typeof document == "undefined")) {
        var n = document.head || document.getElementsByTagName("head")[0]
            , o = document.createElement("style");
        o.type = "text/css",
            r === "top" && n.firstChild ? n.insertBefore(o, n.firstChild) : n.appendChild(o),
            o.styleSheet ? o.styleSheet.cssText = e : o.appendChild(document.createTextNode(e))
    }
}
var U3 = `
#arrow[data-v-20b7fd4a],
  #arrow[data-v-20b7fd4a]::before {
    transition: background 250ms ease-in-out;
    position: absolute;
    width: calc(10px - var(--popper-theme-border-width, 0px));
    height: calc(10px - var(--popper-theme-border-width, 0px));
    box-sizing: border-box;
    background: var(--popper-theme-background-color);
}
#arrow[data-v-20b7fd4a] {
    visibility: hidden;
}
#arrow[data-v-20b7fd4a]::before {
    visibility: visible;
    content: "";
    transform: rotate(45deg);
}

  /* Top arrow */
.popper[data-popper-placement^="top"] > #arrow[data-v-20b7fd4a] {
    bottom: -5px;
}
.popper[data-popper-placement^="top"] > #arrow[data-v-20b7fd4a]::before {
    border-right: var(--popper-theme-border-width)
      var(--popper-theme-border-style) var(--popper-theme-border-color);
    border-bottom: var(--popper-theme-border-width)
      var(--popper-theme-border-style) var(--popper-theme-border-color);
}

  /* Bottom arrow */
.popper[data-popper-placement^="bottom"] > #arrow[data-v-20b7fd4a] {
    top: -5px;
}
.popper[data-popper-placement^="bottom"] > #arrow[data-v-20b7fd4a]::before {
    border-left: var(--popper-theme-border-width)
      var(--popper-theme-border-style) var(--popper-theme-border-color);
    border-top: var(--popper-theme-border-width)
      var(--popper-theme-border-style) var(--popper-theme-border-color);
}

  /* Left arrow */
.popper[data-popper-placement^="left"] > #arrow[data-v-20b7fd4a] {
    right: -5px;
}
.popper[data-popper-placement^="left"] > #arrow[data-v-20b7fd4a]::before {
    border-right: var(--popper-theme-border-width)
      var(--popper-theme-border-style) var(--popper-theme-border-color);
    border-top: var(--popper-theme-border-width)
      var(--popper-theme-border-style) var(--popper-theme-border-color);
}

  /* Right arrow */
.popper[data-popper-placement^="right"] > #arrow[data-v-20b7fd4a] {
    left: -5px;
}
`;
ph(U3);
const au = {};
au.render = H3;
au.__scopeId = "data-v-20b7fd4a";
var W3 = au;
const q3 = ["onKeyup"];
var hh = {
    props: {
        placement: {
            type: String,
            default: "bottom",
            validator: function(e) {
                return ["auto", "auto-start", "auto-end", "top", "top-start", "top-end", "bottom", "bottom-start", "bottom-end", "right", "right-start", "right-end", "left", "left-start", "left-end"].includes(e)
            }
        },
        disableClickAway: {
            type: Boolean,
            default: !1
        },
        offsetSkid: {
            type: String,
            default: "0"
        },
        offsetDistance: {
            type: String,
            default: "12"
        },
        hover: {
            type: Boolean,
            default: !1
        },
        show: {
            type: Boolean,
            default: null
        },
        disabled: {
            type: Boolean,
            default: !1
        },
        openDelay: {
            type: [Number, String],
            default: 0
        },
        closeDelay: {
            type: [Number, String],
            default: 0
        },
        zIndex: {
            type: [Number, String],
            default: 9999
        },
        arrow: {
            type: Boolean,
            default: !1
        },
        arrowPadding: {
            type: String,
            default: "0"
        },
        interactive: {
            type: Boolean,
            default: !0
        },
        locked: {
            type: Boolean,
            default: !1
        },
        content: {
            type: String,
            default: null
        }
    },
    emits: ["open:popper", "close:popper"],
    setup(e, {emit: t}) {
        const r = e;
        i0(se => ({
            c81fc0a4: e.zIndex
        }));
        const n = Lg()
            , o = U(null)
            , i = U(null)
            , a = U(null)
            , s = U(!1);
        Pe( () => {
                const se = n.default();
                if (se && se.length > 1)
                    return console.error(`[Popper]: The <Popper> component expects only one child element at its root. You passed ${se.length} child nodes.`)
            }
        );
        const {arrowPadding: l, closeDelay: c, content: u, disableClickAway: f, disabled: d, interactive: p, locked: g, offsetDistance: m, offsetSkid: h, openDelay: v, placement: w, show: S} = Ac(r)
            , {isOpen: b, open: O, close: C} = L3({
                arrowPadding: l,
                emit: t,
                locked: g,
                offsetDistance: m,
                offsetSkid: h,
                placement: w,
                popperNode: i,
                triggerNode: a
            })
            , {hasContent: _} = IC(n, i, u)
            , E = W( () => S.value !== null)
            , A = W( () => d.value || !_.value)
            , M = W( () => b.value && !A.value)
            , I = W( () => !f.value && !E.value)
            , F = W( () => p.value ? `border: ${m.value}px solid transparent; margin: -${m.value}px;` : null)
            , B = Xl.debounce(O, v.value)
            , K = Xl.debounce(C, c.value)
            , oe = async () => {
                A.value || E.value || (K.clear(),
                    B())
            }
            , ee = async () => {
                E.value || (B.clear(),
                    K())
            }
            , ne = () => {
                b.value ? ee() : oe()
            }
        ;
        return st([_, d], ([se,xe]) => {
                b.value && (!se || xe) && C()
            }
        ),
            st(b, se => {
                    se ? s.value = !0 : Xl.debounce( () => {
                            s.value = !1
                        }
                        , 200)
                }
            ),
            Re( () => {
                    E.value && (S.value ? B() : K())
                }
            ),
            Re( () => {
                    I.value && RC(o, ee)
                }
            ),
            (se, xe) => (Z(),
                of("div", {
                    class: "inline-block",
                    style: Yo(lt(F)),
                    onMouseleave: xe[2] || (xe[2] = Be => e.hover && ee()),
                    ref: (Be, We) => {
                        We.popperContainerNode = Be,
                            o.value = Be
                    }
                }, [Ci("div", {
                    ref: (Be, We) => {
                        We.triggerNode = Be,
                            a.value = Be
                    }
                    ,
                    onMouseover: xe[0] || (xe[0] = Be => e.hover && oe()),
                    onClick: ne,
                    onFocus: oe,
                    onKeyup: b0(ee, ["esc"])
                }, [sf(se.$slots, "default")], 40, q3), V(Es, {
                    name: "fade"
                }, {
                    default: Pc( () => [sg(Ci("div", {
                        onClick: xe[1] || (xe[1] = Be => !lt(p) && ee()),
                        class: "popper",
                        ref: (Be, We) => {
                            We.popperNode = Be,
                                i.value = Be
                        }
                    }, [sf(se.$slots, "content", {
                        close: lt(C),
                        isOpen: s.value
                    }, () => [ps(zv(lt(u)), 1)]), e.arrow ? (Z(),
                        re(W3, {
                            key: 0
                        })) : Cg("", !0)], 512), [[w0, lt(M)]])]),
                    _: 3
                })], 36))
    }
}
    , z3 = `
.inline-block[data-v-5784ed69] {
    display: inline-block;
}
.popper[data-v-5784ed69] {
    transition: background 250ms ease-in-out;
    background: var(--popper-theme-background-color);
    padding: var(--popper-theme-padding);
    color: var(--popper-theme-text-color);
    border-radius: var(--popper-theme-border-radius);
    border-width: var(--popper-theme-border-width);
    border-style: var(--popper-theme-border-style);
    border-color: var(--popper-theme-border-color);
    box-shadow: var(--popper-theme-box-shadow);
    z-index: var(--c81fc0a4);
}
.popper[data-v-5784ed69]:hover,
  .popper:hover > #arrow[data-v-5784ed69]::before {
    background: var(--popper-theme-background-color-hover);
}
.inline-block[data-v-5784ed69] {
    display: inline-block;
}
.fade-enter-active[data-v-5784ed69],
  .fade-leave-active[data-v-5784ed69] {
    transition: opacity 0.2s ease;
}
.fade-enter-from[data-v-5784ed69],
  .fade-leave-to[data-v-5784ed69] {
    opacity: 0;
}
`;
ph(z3);
hh.__scopeId = "data-v-5784ed69";
var Vk = ( () => {
        const e = hh;
        return e.install = t => {
            t.component("Popper", e)
        }
            ,
            e
    }
)();
/*!
  * vue-router v4.0.12
  * (c) 2021 Eduardo San Martin Morote
  * @license MIT
  */
const vh = typeof Symbol == "function" && typeof Symbol.toStringTag == "symbol"
    , jn = e => vh ? Symbol(e) : "_vr_" + e
    , V3 = jn("rvlm")
    , mh = jn("rvd")
    , su = jn("r")
    , gh = jn("rl")
    , lu = jn("rvl")
    , Hn = typeof window != "undefined";
function K3(e) {
    return e.__esModule || vh && e[Symbol.toStringTag] === "Module"
}
const ke = Object.assign;
function uu(e, t) {
    const r = {};
    for (const n in t) {
        const o = t[n];
        r[n] = Array.isArray(o) ? o.map(e) : e(o)
    }
    return r
}
const No = () => {}
    , G3 = /\/$/
    , Y3 = e => e.replace(G3, "");
function cu(e, t, r="/") {
    let n, o = {}, i = "", a = "";
    const s = t.indexOf("?")
        , l = t.indexOf("#", s > -1 ? s : 0);
    return s > -1 && (n = t.slice(0, s),
        i = t.slice(s + 1, l > -1 ? l : t.length),
        o = e(i)),
    l > -1 && (n = n || t.slice(0, l),
        a = t.slice(l, t.length)),
        n = Z3(n != null ? n : t, r),
        {
            fullPath: n + (i && "?") + i + a,
            path: n,
            query: o,
            hash: a
        }
}
function X3(e, t) {
    const r = t.query ? e(t.query) : "";
    return t.path + (r && "?") + r + (t.hash || "")
}
function yh(e, t) {
    return !t || !e.toLowerCase().startsWith(t.toLowerCase()) ? e : e.slice(t.length) || "/"
}
function J3(e, t, r) {
    const n = t.matched.length - 1
        , o = r.matched.length - 1;
    return n > -1 && n === o && Un(t.matched[n], r.matched[o]) && bh(t.params, r.params) && e(t.query) === e(r.query) && t.hash === r.hash
}
function Un(e, t) {
    return (e.aliasOf || e) === (t.aliasOf || t)
}
function bh(e, t) {
    if (Object.keys(e).length !== Object.keys(t).length)
        return !1;
    for (const r in e)
        if (!Q3(e[r], t[r]))
            return !1;
    return !0
}
function Q3(e, t) {
    return Array.isArray(e) ? wh(e, t) : Array.isArray(t) ? wh(t, e) : e === t
}
function wh(e, t) {
    return Array.isArray(t) ? e.length === t.length && e.every( (r, n) => r === t[n]) : e.length === 1 && e[0] === t
}
function Z3(e, t) {
    if (e.startsWith("/"))
        return e;
    if (!e)
        return t;
    const r = t.split("/")
        , n = e.split("/");
    let o = r.length - 1, i, a;
    for (i = 0; i < n.length; i++)
        if (a = n[i],
            !(o === 1 || a === "."))
            if (a === "..")
                o--;
            else
                break;
    return r.slice(0, o).join("/") + "/" + n.slice(i - (i === n.length ? 1 : 0)).join("/")
}
var Lo;
(function(e) {
        e.pop = "pop",
            e.push = "push"
    }
)(Lo || (Lo = {}));
var jo;
(function(e) {
        e.back = "back",
            e.forward = "forward",
            e.unknown = ""
    }
)(jo || (jo = {}));
function e_(e) {
    if (!e)
        if (Hn) {
            const t = document.querySelector("base");
            e = t && t.getAttribute("href") || "/",
                e = e.replace(/^\w+:\/\/[^\/]+/, "")
        } else
            e = "/";
    return e[0] !== "/" && e[0] !== "#" && (e = "/" + e),
        Y3(e)
}
const t_ = /^[^#]+#/;
function r_(e, t) {
    return e.replace(t_, "#") + t
}
function n_(e, t) {
    const r = document.documentElement.getBoundingClientRect()
        , n = e.getBoundingClientRect();
    return {
        behavior: t.behavior,
        left: n.left - r.left - (t.left || 0),
        top: n.top - r.top - (t.top || 0)
    }
}
const va = () => ({
    left: window.pageXOffset,
    top: window.pageYOffset
});
function o_(e) {
    let t;
    if ("el"in e) {
        const r = e.el
            , n = typeof r == "string" && r.startsWith("#")
            , o = typeof r == "string" ? n ? document.getElementById(r.slice(1)) : document.querySelector(r) : r;
        if (!o)
            return;
        t = n_(o, e)
    } else
        t = e;
    "scrollBehavior"in document.documentElement.style ? window.scrollTo(t) : window.scrollTo(t.left != null ? t.left : window.pageXOffset, t.top != null ? t.top : window.pageYOffset)
}
function Ch(e, t) {
    return (history.state ? history.state.position - t : -1) + e
}
const fu = new Map;
function i_(e, t) {
    fu.set(e, t)
}
function a_(e) {
    const t = fu.get(e);
    return fu.delete(e),
        t
}
let s_ = () => location.protocol + "//" + location.host;
function _h(e, t) {
    const {pathname: r, search: n, hash: o} = t
        , i = e.indexOf("#");
    if (i > -1) {
        let s = o.includes(e.slice(i)) ? e.slice(i).length : 1
            , l = o.slice(s);
        return l[0] !== "/" && (l = "/" + l),
            yh(l, "")
    }
    return yh(r, e) + n + o
}
function l_(e, t, r, n) {
    let o = []
        , i = []
        , a = null;
    const s = ({state: d}) => {
            const p = _h(e, location)
                , g = r.value
                , m = t.value;
            let h = 0;
            if (d) {
                if (r.value = p,
                    t.value = d,
                a && a === g) {
                    a = null;
                    return
                }
                h = m ? d.position - m.position : 0
            } else
                n(p);
            o.forEach(v => {
                    v(r.value, g, {
                        delta: h,
                        type: Lo.pop,
                        direction: h ? h > 0 ? jo.forward : jo.back : jo.unknown
                    })
                }
            )
        }
    ;
    function l() {
        a = r.value
    }
    function c(d) {
        o.push(d);
        const p = () => {
                const g = o.indexOf(d);
                g > -1 && o.splice(g, 1)
            }
        ;
        return i.push(p),
            p
    }
    function u() {
        const {history: d} = window;
        !d.state || d.replaceState(ke({}, d.state, {
            scroll: va()
        }), "")
    }
    function f() {
        for (const d of i)
            d();
        i = [],
            window.removeEventListener("popstate", s),
            window.removeEventListener("beforeunload", u)
    }
    return window.addEventListener("popstate", s),
        window.addEventListener("beforeunload", u),
        {
            pauseListeners: l,
            listen: c,
            destroy: f
        }
}
function xh(e, t, r, n=!1, o=!1) {
    return {
        back: e,
        current: t,
        forward: r,
        replaced: n,
        position: window.history.length,
        scroll: o ? va() : null
    }
}
function u_(e) {
    const {history: t, location: r} = window
        , n = {
        value: _h(e, r)
    }
        , o = {
        value: t.state
    };
    o.value || i(n.value, {
        back: null,
        current: n.value,
        forward: null,
        position: t.length - 1,
        replaced: !0,
        scroll: null
    }, !0);
    function i(l, c, u) {
        const f = e.indexOf("#")
            , d = f > -1 ? (r.host && document.querySelector("base") ? e : e.slice(f)) + l : s_() + e + l;
        try {
            t[u ? "replaceState" : "pushState"](c, "", d),
                o.value = c
        } catch (p) {
            console.error(p),
                r[u ? "replace" : "assign"](d)
        }
    }
    function a(l, c) {
        const u = ke({}, t.state, xh(o.value.back, l, o.value.forward, !0), c, {
            position: o.value.position
        });
        i(l, u, !0),
            n.value = l
    }
    function s(l, c) {
        const u = ke({}, o.value, t.state, {
            forward: l,
            scroll: va()
        });
        i(u.current, u, !0);
        const f = ke({}, xh(n.value, l, null), {
            position: u.position + 1
        }, c);
        i(l, f, !1),
            n.value = l
    }
    return {
        location: n,
        state: o,
        push: s,
        replace: a
    }
}
function Kk(e) {
    e = e_(e);
    const t = u_(e)
        , r = l_(e, t.state, t.location, t.replace);
    function n(i, a=!0) {
        a || r.pauseListeners(),
            history.go(i)
    }
    const o = ke({
        location: "",
        base: e,
        go: n,
        createHref: r_.bind(null, e)
    }, t, r);
    return Object.defineProperty(o, "location", {
        enumerable: !0,
        get: () => t.location.value
    }),
        Object.defineProperty(o, "state", {
            enumerable: !0,
            get: () => t.state.value
        }),
        o
}
function c_(e) {
    return typeof e == "string" || e && typeof e == "object"
}
function Sh(e) {
    return typeof e == "string" || typeof e == "symbol"
}
const gr = {
    path: "/",
    name: void 0,
    params: {},
    query: {},
    hash: "",
    fullPath: "/",
    matched: [],
    meta: {},
    redirectedFrom: void 0
}
    , Oh = jn("nf");
var Eh;
(function(e) {
        e[e.aborted = 4] = "aborted",
            e[e.cancelled = 8] = "cancelled",
            e[e.duplicated = 16] = "duplicated"
    }
)(Eh || (Eh = {}));
function Wn(e, t) {
    return ke(new Error, {
        type: e,
        [Oh]: !0
    }, t)
}
function Kr(e, t) {
    return e instanceof Error && Oh in e && (t == null || !!(e.type & t))
}
const Fh = "[^/]+?"
    , f_ = {
    sensitive: !1,
    strict: !1,
    start: !0,
    end: !0
}
    , d_ = /[.+*?^${}()[\]/\\]/g;
function p_(e, t) {
    const r = ke({}, f_, t)
        , n = [];
    let o = r.start ? "^" : "";
    const i = [];
    for (const c of e) {
        const u = c.length ? [] : [90];
        r.strict && !c.length && (o += "/");
        for (let f = 0; f < c.length; f++) {
            const d = c[f];
            let p = 40 + (r.sensitive ? .25 : 0);
            if (d.type === 0)
                f || (o += "/"),
                    o += d.value.replace(d_, "\\$&"),
                    p += 40;
            else if (d.type === 1) {
                const {value: g, repeatable: m, optional: h, regexp: v} = d;
                i.push({
                    name: g,
                    repeatable: m,
                    optional: h
                });
                const w = v || Fh;
                if (w !== Fh) {
                    p += 10;
                    try {
                        new RegExp(`(${w})`)
                    } catch (b) {
                        throw new Error(`Invalid custom RegExp for param "${g}" (${w}): ` + b.message)
                    }
                }
                let S = m ? `((?:${w})(?:/(?:${w}))*)` : `(${w})`;
                f || (S = h && c.length < 2 ? `(?:/${S})` : "/" + S),
                h && (S += "?"),
                    o += S,
                    p += 20,
                h && (p += -8),
                m && (p += -20),
                w === ".*" && (p += -50)
            }
            u.push(p)
        }
        n.push(u)
    }
    if (r.strict && r.end) {
        const c = n.length - 1;
        n[c][n[c].length - 1] += .7000000000000001
    }
    r.strict || (o += "/?"),
        r.end ? o += "$" : r.strict && (o += "(?:/|$)");
    const a = new RegExp(o,r.sensitive ? "" : "i");
    function s(c) {
        const u = c.match(a)
            , f = {};
        if (!u)
            return null;
        for (let d = 1; d < u.length; d++) {
            const p = u[d] || ""
                , g = i[d - 1];
            f[g.name] = p && g.repeatable ? p.split("/") : p
        }
        return f
    }
    function l(c) {
        let u = ""
            , f = !1;
        for (const d of e) {
            (!f || !u.endsWith("/")) && (u += "/"),
                f = !1;
            for (const p of d)
                if (p.type === 0)
                    u += p.value;
                else if (p.type === 1) {
                    const {value: g, repeatable: m, optional: h} = p
                        , v = g in c ? c[g] : "";
                    if (Array.isArray(v) && !m)
                        throw new Error(`Provided param "${g}" is an array but it is not repeatable (* or + modifiers)`);
                    const w = Array.isArray(v) ? v.join("/") : v;
                    if (!w)
                        if (h)
                            d.length < 2 && (u.endsWith("/") ? u = u.slice(0, -1) : f = !0);
                        else
                            throw new Error(`Missing required param "${g}"`);
                    u += w
                }
        }
        return u
    }
    return {
        re: a,
        score: n,
        keys: i,
        parse: s,
        stringify: l
    }
}
function h_(e, t) {
    let r = 0;
    for (; r < e.length && r < t.length; ) {
        const n = t[r] - e[r];
        if (n)
            return n;
        r++
    }
    return e.length < t.length ? e.length === 1 && e[0] === 40 + 40 ? -1 : 1 : e.length > t.length ? t.length === 1 && t[0] === 40 + 40 ? 1 : -1 : 0
}
function v_(e, t) {
    let r = 0;
    const n = e.score
        , o = t.score;
    for (; r < n.length && r < o.length; ) {
        const i = h_(n[r], o[r]);
        if (i)
            return i;
        r++
    }
    return o.length - n.length
}
const m_ = {
    type: 0,
    value: ""
}
    , g_ = /[a-zA-Z0-9_]/;
function y_(e) {
    if (!e)
        return [[]];
    if (e === "/")
        return [[m_]];
    if (!e.startsWith("/"))
        throw new Error(`Invalid path "${e}"`);
    function t(p) {
        throw new Error(`ERR (${r})/"${c}": ${p}`)
    }
    let r = 0
        , n = r;
    const o = [];
    let i;
    function a() {
        i && o.push(i),
            i = []
    }
    let s = 0, l, c = "", u = "";
    function f() {
        !c || (r === 0 ? i.push({
            type: 0,
            value: c
        }) : r === 1 || r === 2 || r === 3 ? (i.length > 1 && (l === "*" || l === "+") && t(`A repeatable param (${c}) must be alone in its segment. eg: '/:ids+.`),
            i.push({
                type: 1,
                value: c,
                regexp: u,
                repeatable: l === "*" || l === "+",
                optional: l === "*" || l === "?"
            })) : t("Invalid state to consume buffer"),
            c = "")
    }
    function d() {
        c += l
    }
    for (; s < e.length; ) {
        if (l = e[s++],
        l === "\\" && r !== 2) {
            n = r,
                r = 4;
            continue
        }
        switch (r) {
            case 0:
                l === "/" ? (c && f(),
                    a()) : l === ":" ? (f(),
                    r = 1) : d();
                break;
            case 4:
                d(),
                    r = n;
                break;
            case 1:
                l === "(" ? r = 2 : g_.test(l) ? d() : (f(),
                    r = 0,
                l !== "*" && l !== "?" && l !== "+" && s--);
                break;
            case 2:
                l === ")" ? u[u.length - 1] == "\\" ? u = u.slice(0, -1) + l : r = 3 : u += l;
                break;
            case 3:
                f(),
                    r = 0,
                l !== "*" && l !== "?" && l !== "+" && s--,
                    u = "";
                break;
            default:
                t("Unknown state");
                break
        }
    }
    return r === 2 && t(`Unfinished custom RegExp for param "${c}"`),
        f(),
        a(),
        o
}
function b_(e, t, r) {
    const n = p_(y_(e.path), r)
        , o = ke(n, {
        record: e,
        parent: t,
        children: [],
        alias: []
    });
    return t && !o.record.aliasOf == !t.record.aliasOf && t.children.push(o),
        o
}
function w_(e, t) {
    const r = []
        , n = new Map;
    t = kh({
        strict: !1,
        end: !0,
        sensitive: !1
    }, t);
    function o(u) {
        return n.get(u)
    }
    function i(u, f, d) {
        const p = !d
            , g = __(u);
        g.aliasOf = d && d.record;
        const m = kh(t, u)
            , h = [g];
        if ("alias"in u) {
            const S = typeof u.alias == "string" ? [u.alias] : u.alias;
            for (const b of S)
                h.push(ke({}, g, {
                    components: d ? d.record.components : g.components,
                    path: b,
                    aliasOf: d ? d.record : g
                }))
        }
        let v, w;
        for (const S of h) {
            const {path: b} = S;
            if (f && b[0] !== "/") {
                const O = f.record.path
                    , C = O[O.length - 1] === "/" ? "" : "/";
                S.path = f.record.path + (b && C + b)
            }
            if (v = b_(S, f, m),
                d ? d.alias.push(v) : (w = w || v,
                w !== v && w.alias.push(v),
                p && u.name && !Ah(v) && a(u.name)),
            "children"in g) {
                const O = g.children;
                for (let C = 0; C < O.length; C++)
                    i(O[C], v, d && d.children[C])
            }
            d = d || v,
                l(v)
        }
        return w ? () => {
                a(w)
            }
            : No
    }
    function a(u) {
        if (Sh(u)) {
            const f = n.get(u);
            f && (n.delete(u),
                r.splice(r.indexOf(f), 1),
                f.children.forEach(a),
                f.alias.forEach(a))
        } else {
            const f = r.indexOf(u);
            f > -1 && (r.splice(f, 1),
            u.record.name && n.delete(u.record.name),
                u.children.forEach(a),
                u.alias.forEach(a))
        }
    }
    function s() {
        return r
    }
    function l(u) {
        let f = 0;
        for (; f < r.length && v_(u, r[f]) >= 0; )
            f++;
        r.splice(f, 0, u),
        u.record.name && !Ah(u) && n.set(u.record.name, u)
    }
    function c(u, f) {
        let d, p = {}, g, m;
        if ("name"in u && u.name) {
            if (d = n.get(u.name),
                !d)
                throw Wn(1, {
                    location: u
                });
            m = d.record.name,
                p = ke(C_(f.params, d.keys.filter(w => !w.optional).map(w => w.name)), u.params),
                g = d.stringify(p)
        } else if ("path"in u)
            g = u.path,
                d = r.find(w => w.re.test(g)),
            d && (p = d.parse(g),
                m = d.record.name);
        else {
            if (d = f.name ? n.get(f.name) : r.find(w => w.re.test(f.path)),
                !d)
                throw Wn(1, {
                    location: u,
                    currentLocation: f
                });
            m = d.record.name,
                p = ke({}, f.params, u.params),
                g = d.stringify(p)
        }
        const h = [];
        let v = d;
        for (; v; )
            h.unshift(v.record),
                v = v.parent;
        return {
            name: m,
            path: g,
            params: p,
            matched: h,
            meta: S_(h)
        }
    }
    return e.forEach(u => i(u)),
        {
            addRoute: i,
            resolve: c,
            removeRoute: a,
            getRoutes: s,
            getRecordMatcher: o
        }
}
function C_(e, t) {
    const r = {};
    for (const n of t)
        n in e && (r[n] = e[n]);
    return r
}
function __(e) {
    return {
        path: e.path,
        redirect: e.redirect,
        name: e.name,
        meta: e.meta || {},
        aliasOf: void 0,
        beforeEnter: e.beforeEnter,
        props: x_(e),
        children: e.children || [],
        instances: {},
        leaveGuards: new Set,
        updateGuards: new Set,
        enterCallbacks: {},
        components: "components"in e ? e.components || {} : {
            default: e.component
        }
    }
}
function x_(e) {
    const t = {}
        , r = e.props || !1;
    if ("component"in e)
        t.default = r;
    else
        for (const n in e.components)
            t[n] = typeof r == "boolean" ? r : r[n];
    return t
}
function Ah(e) {
    for (; e; ) {
        if (e.record.aliasOf)
            return !0;
        e = e.parent
    }
    return !1
}
function S_(e) {
    return e.reduce( (t, r) => ke(t, r.meta), {})
}
function kh(e, t) {
    const r = {};
    for (const n in e)
        r[n] = n in t ? t[n] : e[n];
    return r
}
const Ph = /#/g
    , O_ = /&/g
    , E_ = /\//g
    , F_ = /=/g
    , A_ = /\?/g
    , Th = /\+/g
    , k_ = /%5B/g
    , P_ = /%5D/g
    , $h = /%5E/g
    , T_ = /%60/g
    , Mh = /%7B/g
    , $_ = /%7C/g
    , Rh = /%7D/g
    , M_ = /%20/g;
function du(e) {
    return encodeURI("" + e).replace($_, "|").replace(k_, "[").replace(P_, "]")
}
function R_(e) {
    return du(e).replace(Mh, "{").replace(Rh, "}").replace($h, "^")
}
function pu(e) {
    return du(e).replace(Th, "%2B").replace(M_, "+").replace(Ph, "%23").replace(O_, "%26").replace(T_, "`").replace(Mh, "{").replace(Rh, "}").replace($h, "^")
}
function I_(e) {
    return pu(e).replace(F_, "%3D")
}
function D_(e) {
    return du(e).replace(Ph, "%23").replace(A_, "%3F")
}
function B_(e) {
    return e == null ? "" : D_(e).replace(E_, "%2F")
}
function ma(e) {
    try {
        return decodeURIComponent("" + e)
    } catch {}
    return "" + e
}
function N_(e) {
    const t = {};
    if (e === "" || e === "?")
        return t;
    const n = (e[0] === "?" ? e.slice(1) : e).split("&");
    for (let o = 0; o < n.length; ++o) {
        const i = n[o].replace(Th, " ")
            , a = i.indexOf("=")
            , s = ma(a < 0 ? i : i.slice(0, a))
            , l = a < 0 ? null : ma(i.slice(a + 1));
        if (s in t) {
            let c = t[s];
            Array.isArray(c) || (c = t[s] = [c]),
                c.push(l)
        } else
            t[s] = l
    }
    return t
}
function Ih(e) {
    let t = "";
    for (let r in e) {
        const n = e[r];
        if (r = I_(r),
        n == null) {
            n !== void 0 && (t += (t.length ? "&" : "") + r);
            continue
        }
        (Array.isArray(n) ? n.map(i => i && pu(i)) : [n && pu(n)]).forEach(i => {
                i !== void 0 && (t += (t.length ? "&" : "") + r,
                i != null && (t += "=" + i))
            }
        )
    }
    return t
}
function L_(e) {
    const t = {};
    for (const r in e) {
        const n = e[r];
        n !== void 0 && (t[r] = Array.isArray(n) ? n.map(o => o == null ? null : "" + o) : n == null ? n : "" + n)
    }
    return t
}
function Ho() {
    let e = [];
    function t(n) {
        return e.push(n),
            () => {
                const o = e.indexOf(n);
                o > -1 && e.splice(o, 1)
            }
    }
    function r() {
        e = []
    }
    return {
        add: t,
        list: () => e,
        reset: r
    }
}
function yr(e, t, r, n, o) {
    const i = n && (n.enterCallbacks[o] = n.enterCallbacks[o] || []);
    return () => new Promise( (a, s) => {
            const l = f => {
                f === !1 ? s(Wn(4, {
                    from: r,
                    to: t
                })) : f instanceof Error ? s(f) : c_(f) ? s(Wn(2, {
                    from: t,
                    to: f
                })) : (i && n.enterCallbacks[o] === i && typeof f == "function" && i.push(f),
                    a())
            }
                , c = e.call(n && n.instances[o], t, r, l);
            let u = Promise.resolve(c);
            e.length < 3 && (u = u.then(l)),
                u.catch(f => s(f))
        }
    )
}
function hu(e, t, r, n) {
    const o = [];
    for (const i of e)
        for (const a in i.components) {
            let s = i.components[a];
            if (!(t !== "beforeRouteEnter" && !i.instances[a]))
                if (j_(s)) {
                    const c = (s.__vccOpts || s)[t];
                    c && o.push(yr(c, r, n, i, a))
                } else {
                    let l = s();
                    o.push( () => l.then(c => {
                            if (!c)
                                return Promise.reject(new Error(`Couldn't resolve component "${a}" at "${i.path}"`));
                            const u = K3(c) ? c.default : c;
                            i.components[a] = u;
                            const d = (u.__vccOpts || u)[t];
                            return d && yr(d, r, n, i, a)()
                        }
                    ))
                }
        }
    return o
}
function j_(e) {
    return typeof e == "object" || "displayName"in e || "props"in e || "__vccOpts"in e
}
function Dh(e) {
    const t = Ce(su)
        , r = Ce(gh)
        , n = W( () => t.resolve(lt(e.to)))
        , o = W( () => {
            const {matched: l} = n.value
                , {length: c} = l
                , u = l[c - 1]
                , f = r.matched;
            if (!u || !f.length)
                return -1;
            const d = f.findIndex(Un.bind(null, u));
            if (d > -1)
                return d;
            const p = Bh(l[c - 2]);
            return c > 1 && Bh(u) === p && f[f.length - 1].path !== p ? f.findIndex(Un.bind(null, l[c - 2])) : d
        }
    )
        , i = W( () => o.value > -1 && q_(r.params, n.value.params))
        , a = W( () => o.value > -1 && o.value === r.matched.length - 1 && bh(r.params, n.value.params));
    function s(l={}) {
        return W_(l) ? t[lt(e.replace) ? "replace" : "push"](lt(e.to)).catch(No) : Promise.resolve()
    }
    return {
        route: n,
        href: W( () => n.value.href),
        isActive: i,
        isExactActive: a,
        navigate: s
    }
}
const H_ = ie({
    name: "RouterLink",
    props: {
        to: {
            type: [String, Object],
            required: !0
        },
        replace: Boolean,
        activeClass: String,
        exactActiveClass: String,
        custom: Boolean,
        ariaCurrentValue: {
            type: String,
            default: "page"
        }
    },
    useLink: Dh,
    setup(e, {slots: t}) {
        const r = er(Dh(e))
            , {options: n} = Ce(su)
            , o = W( () => ({
            [Nh(e.activeClass, n.linkActiveClass, "router-link-active")]: r.isActive,
            [Nh(e.exactActiveClass, n.linkExactActiveClass, "router-link-exact-active")]: r.isExactActive
        }));
        return () => {
            const i = t.default && t.default(r);
            return e.custom ? i : Pt("a", {
                "aria-current": r.isExactActive ? e.ariaCurrentValue : null,
                href: r.href,
                onClick: r.navigate,
                class: o.value
            }, i)
        }
    }
})
    , U_ = H_;
function W_(e) {
    if (!(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) && !e.defaultPrevented && !(e.button !== void 0 && e.button !== 0)) {
        if (e.currentTarget && e.currentTarget.getAttribute) {
            const t = e.currentTarget.getAttribute("target");
            if (/\b_blank\b/i.test(t))
                return
        }
        return e.preventDefault && e.preventDefault(),
            !0
    }
}
function q_(e, t) {
    for (const r in t) {
        const n = t[r]
            , o = e[r];
        if (typeof n == "string") {
            if (n !== o)
                return !1
        } else if (!Array.isArray(o) || o.length !== n.length || n.some( (i, a) => i !== o[a]))
            return !1
    }
    return !0
}
function Bh(e) {
    return e ? e.aliasOf ? e.aliasOf.path : e.path : ""
}
const Nh = (e, t, r) => e != null ? e : t != null ? t : r
    , z_ = ie({
    name: "RouterView",
    inheritAttrs: !1,
    props: {
        name: {
            type: String,
            default: "default"
        },
        route: Object
    },
    setup(e, {attrs: t, slots: r}) {
        const n = Ce(lu)
            , o = W( () => e.route || n.value)
            , i = Ce(mh, 0)
            , a = W( () => o.value.matched[i]);
        Me(mh, i + 1),
            Me(V3, a),
            Me(lu, o);
        const s = U();
        return st( () => [s.value, a.value, e.name], ([l,c,u], [f,d,p]) => {
                c && (c.instances[u] = l,
                d && d !== c && l && l === f && (c.leaveGuards.size || (c.leaveGuards = d.leaveGuards),
                c.updateGuards.size || (c.updateGuards = d.updateGuards))),
                l && c && (!d || !Un(c, d) || !f) && (c.enterCallbacks[u] || []).forEach(g => g(l))
            }
            , {
                flush: "post"
            }),
            () => {
                const l = o.value
                    , c = a.value
                    , u = c && c.components[e.name]
                    , f = e.name;
                if (!u)
                    return Lh(r.default, {
                        Component: u,
                        route: l
                    });
                const d = c.props[e.name]
                    , p = d ? d === !0 ? l.params : typeof d == "function" ? d(l) : d : null
                    , m = Pt(u, ke({}, p, t, {
                    onVnodeUnmounted: h => {
                        h.component.isUnmounted && (c.instances[f] = null)
                    }
                    ,
                    ref: s
                }));
                return Lh(r.default, {
                    Component: m,
                    route: l
                }) || m
            }
    }
});
function Lh(e, t) {
    if (!e)
        return null;
    const r = e(t);
    return r.length === 1 ? r[0] : r
}
const V_ = z_;
function Gk(e) {
    const t = w_(e.routes, e)
        , r = e.parseQuery || N_
        , n = e.stringifyQuery || Ih
        , o = e.history
        , i = Ho()
        , a = Ho()
        , s = Ho()
        , l = Am(gr);
    let c = gr;
    Hn && e.scrollBehavior && "scrollRestoration"in history && (history.scrollRestoration = "manual");
    const u = uu.bind(null, P => "" + P)
        , f = uu.bind(null, B_)
        , d = uu.bind(null, ma);
    function p(P, G) {
        let j, Y;
        return Sh(P) ? (j = t.getRecordMatcher(P),
            Y = G) : Y = P,
            t.addRoute(Y, j)
    }
    function g(P) {
        const G = t.getRecordMatcher(P);
        G && t.removeRoute(G)
    }
    function m() {
        return t.getRoutes().map(P => P.record)
    }
    function h(P) {
        return !!t.getRecordMatcher(P)
    }
    function v(P, G) {
        if (G = ke({}, G || l.value),
        typeof P == "string") {
            const le = cu(r, P, G.path)
                , y = t.resolve({
                path: le.path
            }, G)
                , x = o.createHref(le.fullPath);
            return ke(le, y, {
                params: d(y.params),
                hash: ma(le.hash),
                redirectedFrom: void 0,
                href: x
            })
        }
        let j;
        if ("path"in P)
            j = ke({}, P, {
                path: cu(r, P.path, G.path).path
            });
        else {
            const le = ke({}, P.params);
            for (const y in le)
                le[y] == null && delete le[y];
            j = ke({}, P, {
                params: f(P.params)
            }),
                G.params = f(G.params)
        }
        const Y = t.resolve(j, G)
            , be = P.hash || "";
        Y.params = u(d(Y.params));
        const we = X3(n, ke({}, P, {
            hash: R_(be),
            path: Y.path
        }))
            , fe = o.createHref(we);
        return ke({
            fullPath: we,
            hash: be,
            query: n === Ih ? L_(P.query) : P.query || {}
        }, Y, {
            redirectedFrom: void 0,
            href: fe
        })
    }
    function w(P) {
        return typeof P == "string" ? cu(r, P, l.value.path) : ke({}, P)
    }
    function S(P, G) {
        if (c !== P)
            return Wn(8, {
                from: G,
                to: P
            })
    }
    function b(P) {
        return _(P)
    }
    function O(P) {
        return b(ke(w(P), {
            replace: !0
        }))
    }
    function C(P) {
        const G = P.matched[P.matched.length - 1];
        if (G && G.redirect) {
            const {redirect: j} = G;
            let Y = typeof j == "function" ? j(P) : j;
            return typeof Y == "string" && (Y = Y.includes("?") || Y.includes("#") ? Y = w(Y) : {
                path: Y
            },
                Y.params = {}),
                ke({
                    query: P.query,
                    hash: P.hash,
                    params: P.params
                }, Y)
        }
    }
    function _(P, G) {
        const j = c = v(P)
            , Y = l.value
            , be = P.state
            , we = P.force
            , fe = P.replace === !0
            , le = C(j);
        if (le)
            return _(ke(w(le), {
                state: be,
                force: we,
                replace: fe
            }), G || j);
        const y = j;
        y.redirectedFrom = G;
        let x;
        return !we && J3(n, Y, j) && (x = Wn(16, {
            to: y,
            from: Y
        }),
            Be(Y, Y, !0, !1)),
            (x ? Promise.resolve(x) : A(y, Y)).catch(k => Kr(k) ? k : ne(k, y, Y)).then(k => {
                    if (k) {
                        if (Kr(k, 2))
                            return _(ke(w(k.to), {
                                state: be,
                                force: we,
                                replace: fe
                            }), G || y)
                    } else
                        k = I(y, Y, !0, fe, be);
                    return M(y, Y, k),
                        k
                }
            )
    }
    function E(P, G) {
        const j = S(P, G);
        return j ? Promise.reject(j) : Promise.resolve()
    }
    function A(P, G) {
        let j;
        const [Y,be,we] = K_(P, G);
        j = hu(Y.reverse(), "beforeRouteLeave", P, G);
        for (const le of Y)
            le.leaveGuards.forEach(y => {
                    j.push(yr(y, P, G))
                }
            );
        const fe = E.bind(null, P, G);
        return j.push(fe),
            qn(j).then( () => {
                    j = [];
                    for (const le of i.list())
                        j.push(yr(le, P, G));
                    return j.push(fe),
                        qn(j)
                }
            ).then( () => {
                    j = hu(be, "beforeRouteUpdate", P, G);
                    for (const le of be)
                        le.updateGuards.forEach(y => {
                                j.push(yr(y, P, G))
                            }
                        );
                    return j.push(fe),
                        qn(j)
                }
            ).then( () => {
                    j = [];
                    for (const le of P.matched)
                        if (le.beforeEnter && !G.matched.includes(le))
                            if (Array.isArray(le.beforeEnter))
                                for (const y of le.beforeEnter)
                                    j.push(yr(y, P, G));
                            else
                                j.push(yr(le.beforeEnter, P, G));
                    return j.push(fe),
                        qn(j)
                }
            ).then( () => (P.matched.forEach(le => le.enterCallbacks = {}),
                j = hu(we, "beforeRouteEnter", P, G),
                j.push(fe),
                qn(j))).then( () => {
                    j = [];
                    for (const le of a.list())
                        j.push(yr(le, P, G));
                    return j.push(fe),
                        qn(j)
                }
            ).catch(le => Kr(le, 8) ? le : Promise.reject(le))
    }
    function M(P, G, j) {
        for (const Y of s.list())
            Y(P, G, j)
    }
    function I(P, G, j, Y, be) {
        const we = S(P, G);
        if (we)
            return we;
        const fe = G === gr
            , le = Hn ? history.state : {};
        j && (Y || fe ? o.replace(P.fullPath, ke({
            scroll: fe && le && le.scroll
        }, be)) : o.push(P.fullPath, be)),
            l.value = P,
            Be(P, G, j, fe),
            xe()
    }
    let F;
    function B() {
        F = o.listen( (P, G, j) => {
                const Y = v(P)
                    , be = C(Y);
                if (be) {
                    _(ke(be, {
                        replace: !0
                    }), Y).catch(No);
                    return
                }
                c = Y;
                const we = l.value;
                Hn && i_(Ch(we.fullPath, j.delta), va()),
                    A(Y, we).catch(fe => Kr(fe, 4 | 8) ? fe : Kr(fe, 2) ? (_(fe.to, Y).then(le => {
                            Kr(le, 4 | 16) && !j.delta && j.type === Lo.pop && o.go(-1, !1)
                        }
                    ).catch(No),
                        Promise.reject()) : (j.delta && o.go(-j.delta, !1),
                        ne(fe, Y, we))).then(fe => {
                            fe = fe || I(Y, we, !1),
                            fe && (j.delta ? o.go(-j.delta, !1) : j.type === Lo.pop && Kr(fe, 4 | 16) && o.go(-1, !1)),
                                M(Y, we, fe)
                        }
                    ).catch(No)
            }
        )
    }
    let K = Ho(), oe = Ho(), ee;
    function ne(P, G, j) {
        xe(P);
        const Y = oe.list();
        return Y.length ? Y.forEach(be => be(P, G, j)) : console.error(P),
            Promise.reject(P)
    }
    function se() {
        return ee && l.value !== gr ? Promise.resolve() : new Promise( (P, G) => {
                K.add([P, G])
            }
        )
    }
    function xe(P) {
        ee || (ee = !0,
            B(),
            K.list().forEach( ([G,j]) => P ? j(P) : G()),
            K.reset())
    }
    function Be(P, G, j, Y) {
        const {scrollBehavior: be} = e;
        if (!Hn || !be)
            return Promise.resolve();
        const we = !j && a_(Ch(P.fullPath, 0)) || (Y || !j) && history.state && history.state.scroll || null;
        return Se().then( () => be(P, G, we)).then(fe => fe && o_(fe)).catch(fe => ne(fe, P, G))
    }
    const We = P => o.go(P);
    let Xe;
    const Je = new Set;
    return {
        currentRoute: l,
        addRoute: p,
        removeRoute: g,
        hasRoute: h,
        getRoutes: m,
        resolve: v,
        options: e,
        push: b,
        replace: O,
        go: We,
        back: () => We(-1),
        forward: () => We(1),
        beforeEach: i.add,
        beforeResolve: a.add,
        afterEach: s.add,
        onError: oe.add,
        isReady: se,
        install(P) {
            const G = this;
            P.component("RouterLink", U_),
                P.component("RouterView", V_),
                P.config.globalProperties.$router = G,
                Object.defineProperty(P.config.globalProperties, "$route", {
                    enumerable: !0,
                    get: () => lt(l)
                }),
            Hn && !Xe && l.value === gr && (Xe = !0,
                b(o.location).catch(be => {}
                ));
            const j = {};
            for (const be in gr)
                j[be] = W( () => l.value[be]);
            P.provide(su, G),
                P.provide(gh, er(j)),
                P.provide(lu, l);
            const Y = P.unmount;
            Je.add(P),
                P.unmount = function() {
                    Je.delete(P),
                    Je.size < 1 && (c = gr,
                    F && F(),
                        l.value = gr,
                        Xe = !1,
                        ee = !1),
                        Y()
                }
        }
    }
}
function qn(e) {
    return e.reduce( (t, r) => t.then( () => r()), Promise.resolve())
}
function K_(e, t) {
    const r = []
        , n = []
        , o = []
        , i = Math.max(t.matched.length, e.matched.length);
    for (let a = 0; a < i; a++) {
        const s = t.matched[a];
        s && (e.matched.find(c => Un(c, s)) ? n.push(s) : r.push(s));
        const l = e.matched[a];
        l && (t.matched.find(c => Un(c, l)) || o.push(l))
    }
    return [r, n, o]
}
var G_ = function() {
    if (typeof Symbol != "function" || typeof Object.getOwnPropertySymbols != "function")
        return !1;
    if (typeof Symbol.iterator == "symbol")
        return !0;
    var t = {}
        , r = Symbol("test")
        , n = Object(r);
    if (typeof r == "string" || Object.prototype.toString.call(r) !== "[object Symbol]" || Object.prototype.toString.call(n) !== "[object Symbol]")
        return !1;
    var o = 42;
    t[r] = o;
    for (r in t)
        return !1;
    if (typeof Object.keys == "function" && Object.keys(t).length !== 0 || typeof Object.getOwnPropertyNames == "function" && Object.getOwnPropertyNames(t).length !== 0)
        return !1;
    var i = Object.getOwnPropertySymbols(t);
    if (i.length !== 1 || i[0] !== r || !Object.prototype.propertyIsEnumerable.call(t, r))
        return !1;
    if (typeof Object.getOwnPropertyDescriptor == "function") {
        var a = Object.getOwnPropertyDescriptor(t, r);
        if (a.value !== o || a.enumerable !== !0)
            return !1
    }
    return !0
}, jh = typeof Symbol != "undefined" && Symbol, Y_ = G_, X_ = function() {
    return typeof jh != "function" || typeof Symbol != "function" || typeof jh("foo") != "symbol" || typeof Symbol("bar") != "symbol" ? !1 : Y_()
}, J_ = "Function.prototype.bind called on incompatible ", vu = Array.prototype.slice, Q_ = Object.prototype.toString, Z_ = "[object Function]", ex = function(t) {
    var r = this;
    if (typeof r != "function" || Q_.call(r) !== Z_)
        throw new TypeError(J_ + r);
    for (var n = vu.call(arguments, 1), o, i = function() {
        if (this instanceof o) {
            var u = r.apply(this, n.concat(vu.call(arguments)));
            return Object(u) === u ? u : this
        } else
            return r.apply(t, n.concat(vu.call(arguments)))
    }, a = Math.max(0, r.length - n.length), s = [], l = 0; l < a; l++)
        s.push("$" + l);
    if (o = Function("binder", "return function (" + s.join(",") + "){ return binder.apply(this,arguments); }")(i),
        r.prototype) {
        var c = function() {};
        c.prototype = r.prototype,
            o.prototype = new c,
            c.prototype = null
    }
    return o
}, tx = ex, mu = Function.prototype.bind || tx, rx = mu, nx = rx.call(Function.call, Object.prototype.hasOwnProperty), ve, Uo = SyntaxError, Hh = Function, zn = TypeError, gu = function(e) {
    try {
        return Hh('"use strict"; return (' + e + ").constructor;")()
    } catch {}
}, Gr = Object.getOwnPropertyDescriptor;
if (Gr)
    try {
        Gr({}, "")
    } catch {
        Gr = null
    }
var yu = function() {
    throw new zn
}
    , ox = Gr ? function() {
    try {
        return arguments.callee,
            yu
    } catch {
        try {
            return Gr(arguments, "callee").get
        } catch {
            return yu
        }
    }
}() : yu
    , Vn = X_()
    , br = Object.getPrototypeOf || function(e) {
    return e.__proto__
}
    , Kn = {}
    , ix = typeof Uint8Array == "undefined" ? ve : br(Uint8Array)
    , Gn = {
    "%AggregateError%": typeof AggregateError == "undefined" ? ve : AggregateError,
    "%Array%": Array,
    "%ArrayBuffer%": typeof ArrayBuffer == "undefined" ? ve : ArrayBuffer,
    "%ArrayIteratorPrototype%": Vn ? br([][Symbol.iterator]()) : ve,
    "%AsyncFromSyncIteratorPrototype%": ve,
    "%AsyncFunction%": Kn,
    "%AsyncGenerator%": Kn,
    "%AsyncGeneratorFunction%": Kn,
    "%AsyncIteratorPrototype%": Kn,
    "%Atomics%": typeof Atomics == "undefined" ? ve : Atomics,
    "%BigInt%": typeof BigInt == "undefined" ? ve : BigInt,
    "%Boolean%": Boolean,
    "%DataView%": typeof DataView == "undefined" ? ve : DataView,
    "%Date%": Date,
    "%decodeURI%": decodeURI,
    "%decodeURIComponent%": decodeURIComponent,
    "%encodeURI%": encodeURI,
    "%encodeURIComponent%": encodeURIComponent,
    "%Error%": Error,
    "%eval%": eval,
    "%EvalError%": EvalError,
    "%Float32Array%": typeof Float32Array == "undefined" ? ve : Float32Array,
    "%Float64Array%": typeof Float64Array == "undefined" ? ve : Float64Array,
    "%FinalizationRegistry%": typeof FinalizationRegistry == "undefined" ? ve : FinalizationRegistry,
    "%Function%": Hh,
    "%GeneratorFunction%": Kn,
    "%Int8Array%": typeof Int8Array == "undefined" ? ve : Int8Array,
    "%Int16Array%": typeof Int16Array == "undefined" ? ve : Int16Array,
    "%Int32Array%": typeof Int32Array == "undefined" ? ve : Int32Array,
    "%isFinite%": isFinite,
    "%isNaN%": isNaN,
    "%IteratorPrototype%": Vn ? br(br([][Symbol.iterator]())) : ve,
    "%JSON%": typeof JSON == "object" ? JSON : ve,
    "%Map%": typeof Map == "undefined" ? ve : Map,
    "%MapIteratorPrototype%": typeof Map == "undefined" || !Vn ? ve : br(new Map()[Symbol.iterator]()),
    "%Math%": Math,
    "%Number%": Number,
    "%Object%": Object,
    "%parseFloat%": parseFloat,
    "%parseInt%": parseInt,
    "%Promise%": typeof Promise == "undefined" ? ve : Promise,
    "%Proxy%": typeof Proxy == "undefined" ? ve : Proxy,
    "%RangeError%": RangeError,
    "%ReferenceError%": ReferenceError,
    "%Reflect%": typeof Reflect == "undefined" ? ve : Reflect,
    "%RegExp%": RegExp,
    "%Set%": typeof Set == "undefined" ? ve : Set,
    "%SetIteratorPrototype%": typeof Set == "undefined" || !Vn ? ve : br(new Set()[Symbol.iterator]()),
    "%SharedArrayBuffer%": typeof SharedArrayBuffer == "undefined" ? ve : SharedArrayBuffer,
    "%String%": String,
    "%StringIteratorPrototype%": Vn ? br(""[Symbol.iterator]()) : ve,
    "%Symbol%": Vn ? Symbol : ve,
    "%SyntaxError%": Uo,
    "%ThrowTypeError%": ox,
    "%TypedArray%": ix,
    "%TypeError%": zn,
    "%Uint8Array%": typeof Uint8Array == "undefined" ? ve : Uint8Array,
    "%Uint8ClampedArray%": typeof Uint8ClampedArray == "undefined" ? ve : Uint8ClampedArray,
    "%Uint16Array%": typeof Uint16Array == "undefined" ? ve : Uint16Array,
    "%Uint32Array%": typeof Uint32Array == "undefined" ? ve : Uint32Array,
    "%URIError%": URIError,
    "%WeakMap%": typeof WeakMap == "undefined" ? ve : WeakMap,
    "%WeakRef%": typeof WeakRef == "undefined" ? ve : WeakRef,
    "%WeakSet%": typeof WeakSet == "undefined" ? ve : WeakSet
}
    , ax = function e(t) {
    var r;
    if (t === "%AsyncFunction%")
        r = gu("async function () {}");
    else if (t === "%GeneratorFunction%")
        r = gu("function* () {}");
    else if (t === "%AsyncGeneratorFunction%")
        r = gu("async function* () {}");
    else if (t === "%AsyncGenerator%") {
        var n = e("%AsyncGeneratorFunction%");
        n && (r = n.prototype)
    } else if (t === "%AsyncIteratorPrototype%") {
        var o = e("%AsyncGenerator%");
        o && (r = br(o.prototype))
    }
    return Gn[t] = r,
        r
}
    , Uh = {
    "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
    "%ArrayPrototype%": ["Array", "prototype"],
    "%ArrayProto_entries%": ["Array", "prototype", "entries"],
    "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
    "%ArrayProto_keys%": ["Array", "prototype", "keys"],
    "%ArrayProto_values%": ["Array", "prototype", "values"],
    "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
    "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
    "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
    "%BooleanPrototype%": ["Boolean", "prototype"],
    "%DataViewPrototype%": ["DataView", "prototype"],
    "%DatePrototype%": ["Date", "prototype"],
    "%ErrorPrototype%": ["Error", "prototype"],
    "%EvalErrorPrototype%": ["EvalError", "prototype"],
    "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
    "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
    "%FunctionPrototype%": ["Function", "prototype"],
    "%Generator%": ["GeneratorFunction", "prototype"],
    "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
    "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
    "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
    "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
    "%JSONParse%": ["JSON", "parse"],
    "%JSONStringify%": ["JSON", "stringify"],
    "%MapPrototype%": ["Map", "prototype"],
    "%NumberPrototype%": ["Number", "prototype"],
    "%ObjectPrototype%": ["Object", "prototype"],
    "%ObjProto_toString%": ["Object", "prototype", "toString"],
    "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
    "%PromisePrototype%": ["Promise", "prototype"],
    "%PromiseProto_then%": ["Promise", "prototype", "then"],
    "%Promise_all%": ["Promise", "all"],
    "%Promise_reject%": ["Promise", "reject"],
    "%Promise_resolve%": ["Promise", "resolve"],
    "%RangeErrorPrototype%": ["RangeError", "prototype"],
    "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
    "%RegExpPrototype%": ["RegExp", "prototype"],
    "%SetPrototype%": ["Set", "prototype"],
    "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
    "%StringPrototype%": ["String", "prototype"],
    "%SymbolPrototype%": ["Symbol", "prototype"],
    "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
    "%TypedArrayPrototype%": ["TypedArray", "prototype"],
    "%TypeErrorPrototype%": ["TypeError", "prototype"],
    "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
    "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
    "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
    "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
    "%URIErrorPrototype%": ["URIError", "prototype"],
    "%WeakMapPrototype%": ["WeakMap", "prototype"],
    "%WeakSetPrototype%": ["WeakSet", "prototype"]
}
    , ga = mu
    , ya = nx
    , sx = ga.call(Function.call, Array.prototype.concat)
    , lx = ga.call(Function.apply, Array.prototype.splice)
    , Wh = ga.call(Function.call, String.prototype.replace)
    , ba = ga.call(Function.call, String.prototype.slice)
    , ux = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g
    , cx = /\\(\\)?/g
    , fx = function(t) {
    var r = ba(t, 0, 1)
        , n = ba(t, -1);
    if (r === "%" && n !== "%")
        throw new Uo("invalid intrinsic syntax, expected closing `%`");
    if (n === "%" && r !== "%")
        throw new Uo("invalid intrinsic syntax, expected opening `%`");
    var o = [];
    return Wh(t, ux, function(i, a, s, l) {
        o[o.length] = s ? Wh(l, cx, "$1") : a || i
    }),
        o
}
    , dx = function(t, r) {
    var n = t, o;
    if (ya(Uh, n) && (o = Uh[n],
        n = "%" + o[0] + "%"),
        ya(Gn, n)) {
        var i = Gn[n];
        if (i === Kn && (i = ax(n)),
        typeof i == "undefined" && !r)
            throw new zn("intrinsic " + t + " exists, but is not available. Please file an issue!");
        return {
            alias: o,
            name: n,
            value: i
        }
    }
    throw new Uo("intrinsic " + t + " does not exist!")
}
    , bu = function(t, r) {
    if (typeof t != "string" || t.length === 0)
        throw new zn("intrinsic name must be a non-empty string");
    if (arguments.length > 1 && typeof r != "boolean")
        throw new zn('"allowMissing" argument must be a boolean');
    var n = fx(t)
        , o = n.length > 0 ? n[0] : ""
        , i = dx("%" + o + "%", r)
        , a = i.name
        , s = i.value
        , l = !1
        , c = i.alias;
    c && (o = c[0],
        lx(n, sx([0, 1], c)));
    for (var u = 1, f = !0; u < n.length; u += 1) {
        var d = n[u]
            , p = ba(d, 0, 1)
            , g = ba(d, -1);
        if ((p === '"' || p === "'" || p === "`" || g === '"' || g === "'" || g === "`") && p !== g)
            throw new Uo("property names with quotes must have matching quotes");
        if ((d === "constructor" || !f) && (l = !0),
            o += "." + d,
            a = "%" + o + "%",
            ya(Gn, a))
            s = Gn[a];
        else if (s != null) {
            if (!(d in s)) {
                if (!r)
                    throw new zn("base intrinsic for " + t + " exists, but the property is not available.");
                return
            }
            if (Gr && u + 1 >= n.length) {
                var m = Gr(s, d);
                f = !!m,
                    f && "get"in m && !("originalValue"in m.get) ? s = m.get : s = s[d]
            } else
                f = ya(s, d),
                    s = s[d];
            f && !l && (Gn[a] = s)
        }
    }
    return s
}
    , qh = {
    exports: {}
};
(function(e) {
        var t = mu
            , r = bu
            , n = r("%Function.prototype.apply%")
            , o = r("%Function.prototype.call%")
            , i = r("%Reflect.apply%", !0) || t.call(o, n)
            , a = r("%Object.getOwnPropertyDescriptor%", !0)
            , s = r("%Object.defineProperty%", !0)
            , l = r("%Math.max%");
        if (s)
            try {
                s({}, "a", {
                    value: 1
                })
            } catch {
                s = null
            }
        e.exports = function(f) {
            var d = i(t, o, arguments);
            if (a && s) {
                var p = a(d, "length");
                p.configurable && s(d, "length", {
                    value: 1 + l(0, f.length - (arguments.length - 1))
                })
            }
            return d
        }
        ;
        var c = function() {
            return i(t, n, arguments)
        };
        s ? s(e.exports, "apply", {
            value: c
        }) : e.exports.apply = c
    }
)(qh);
var zh = bu
    , Vh = qh.exports
    , px = Vh(zh("String.prototype.indexOf"))
    , hx = function(t, r) {
    var n = zh(t, !!r);
    return typeof n == "function" && px(t, ".prototype.") > -1 ? Vh(n) : n
}
    , vx = {}
    , mx = Object.freeze({
    __proto__: null,
    [Symbol.toStringTag]: "Module",
    default: vx
})
    , gx = G0(mx)
    , wu = typeof Map == "function" && Map.prototype
    , Cu = Object.getOwnPropertyDescriptor && wu ? Object.getOwnPropertyDescriptor(Map.prototype, "size") : null
    , wa = wu && Cu && typeof Cu.get == "function" ? Cu.get : null
    , Kh = wu && Map.prototype.forEach
    , _u = typeof Set == "function" && Set.prototype
    , xu = Object.getOwnPropertyDescriptor && _u ? Object.getOwnPropertyDescriptor(Set.prototype, "size") : null
    , Ca = _u && xu && typeof xu.get == "function" ? xu.get : null
    , Gh = _u && Set.prototype.forEach
    , yx = typeof WeakMap == "function" && WeakMap.prototype
    , Wo = yx ? WeakMap.prototype.has : null
    , bx = typeof WeakSet == "function" && WeakSet.prototype
    , qo = bx ? WeakSet.prototype.has : null
    , wx = typeof WeakRef == "function" && WeakRef.prototype
    , Yh = wx ? WeakRef.prototype.deref : null
    , Cx = Boolean.prototype.valueOf
    , _x = Object.prototype.toString
    , xx = Function.prototype.toString
    , Sx = String.prototype.match
    , Su = String.prototype.slice
    , wr = String.prototype.replace
    , Ox = String.prototype.toUpperCase
    , Xh = String.prototype.toLowerCase
    , Jh = RegExp.prototype.test
    , Qh = Array.prototype.concat
    , Wt = Array.prototype.join
    , Ex = Array.prototype.slice
    , Zh = Math.floor
    , Ou = typeof BigInt == "function" ? BigInt.prototype.valueOf : null
    , Eu = Object.getOwnPropertySymbols
    , Fu = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? Symbol.prototype.toString : null
    , Yn = typeof Symbol == "function" && typeof Symbol.iterator == "object"
    , nt = typeof Symbol == "function" && Symbol.toStringTag && (typeof Symbol.toStringTag === Yn ? "object" : "symbol") ? Symbol.toStringTag : null
    , ev = Object.prototype.propertyIsEnumerable
    , tv = (typeof Reflect == "function" ? Reflect.getPrototypeOf : Object.getPrototypeOf) || ([].__proto__ === Array.prototype ? function(e) {
        return e.__proto__
    }
    : null);
function rv(e, t) {
    if (e === 1 / 0 || e === -1 / 0 || e !== e || e && e > -1e3 && e < 1e3 || Jh.call(/e/, t))
        return t;
    var r = /[0-9](?=(?:[0-9]{3})+(?![0-9]))/g;
    if (typeof e == "number") {
        var n = e < 0 ? -Zh(-e) : Zh(e);
        if (n !== e) {
            var o = String(n)
                , i = Su.call(t, o.length + 1);
            return wr.call(o, r, "$&_") + "." + wr.call(wr.call(i, /([0-9]{3})/g, "$&_"), /_$/, "")
        }
    }
    return wr.call(t, r, "$&_")
}
var Au = gx
    , nv = Au.custom
    , ov = sv(nv) ? nv : null
    , Fx = function e(t, r, n, o) {
    var i = r || {};
    if (Cr(i, "quoteStyle") && i.quoteStyle !== "single" && i.quoteStyle !== "double")
        throw new TypeError('option "quoteStyle" must be "single" or "double"');
    if (Cr(i, "maxStringLength") && (typeof i.maxStringLength == "number" ? i.maxStringLength < 0 && i.maxStringLength !== 1 / 0 : i.maxStringLength !== null))
        throw new TypeError('option "maxStringLength", if provided, must be a positive integer, Infinity, or `null`');
    var a = Cr(i, "customInspect") ? i.customInspect : !0;
    if (typeof a != "boolean" && a !== "symbol")
        throw new TypeError("option \"customInspect\", if provided, must be `true`, `false`, or `'symbol'`");
    if (Cr(i, "indent") && i.indent !== null && i.indent !== "	" && !(parseInt(i.indent, 10) === i.indent && i.indent > 0))
        throw new TypeError('option "indent" must be "\\t", an integer > 0, or `null`');
    if (Cr(i, "numericSeparator") && typeof i.numericSeparator != "boolean")
        throw new TypeError('option "numericSeparator", if provided, must be `true` or `false`');
    var s = i.numericSeparator;
    if (typeof t == "undefined")
        return "undefined";
    if (t === null)
        return "null";
    if (typeof t == "boolean")
        return t ? "true" : "false";
    if (typeof t == "string")
        return uv(t, i);
    if (typeof t == "number") {
        if (t === 0)
            return 1 / 0 / t > 0 ? "0" : "-0";
        var l = String(t);
        return s ? rv(t, l) : l
    }
    if (typeof t == "bigint") {
        var c = String(t) + "n";
        return s ? rv(t, c) : c
    }
    var u = typeof i.depth == "undefined" ? 5 : i.depth;
    if (typeof n == "undefined" && (n = 0),
    n >= u && u > 0 && typeof t == "object")
        return ku(t) ? "[Array]" : "[Object]";
    var f = zx(i, n);
    if (typeof o == "undefined")
        o = [];
    else if (lv(o, t) >= 0)
        return "[Circular]";
    function d(B, K, oe) {
        if (K && (o = Ex.call(o),
            o.push(K)),
            oe) {
            var ee = {
                depth: i.depth
            };
            return Cr(i, "quoteStyle") && (ee.quoteStyle = i.quoteStyle),
                e(B, ee, n + 1, o)
        }
        return e(B, i, n + 1, o)
    }
    if (typeof t == "function" && !av(t)) {
        var p = Dx(t)
            , g = _a(t, d);
        return "[Function" + (p ? ": " + p : " (anonymous)") + "]" + (g.length > 0 ? " { " + Wt.call(g, ", ") + " }" : "")
    }
    if (sv(t)) {
        var m = Yn ? wr.call(String(t), /^(Symbol\(.*\))_[^)]*$/, "$1") : Fu.call(t);
        return typeof t == "object" && !Yn ? zo(m) : m
    }
    if (Ux(t)) {
        for (var h = "<" + Xh.call(String(t.nodeName)), v = t.attributes || [], w = 0; w < v.length; w++)
            h += " " + v[w].name + "=" + iv(Ax(v[w].value), "double", i);
        return h += ">",
        t.childNodes && t.childNodes.length && (h += "..."),
            h += "</" + Xh.call(String(t.nodeName)) + ">",
            h
    }
    if (ku(t)) {
        if (t.length === 0)
            return "[]";
        var S = _a(t, d);
        return f && !qx(S) ? "[" + Tu(S, f) + "]" : "[ " + Wt.call(S, ", ") + " ]"
    }
    if (Px(t)) {
        var b = _a(t, d);
        return !("cause"in Error.prototype) && "cause"in t && !ev.call(t, "cause") ? "{ [" + String(t) + "] " + Wt.call(Qh.call("[cause]: " + d(t.cause), b), ", ") + " }" : b.length === 0 ? "[" + String(t) + "]" : "{ [" + String(t) + "] " + Wt.call(b, ", ") + " }"
    }
    if (typeof t == "object" && a) {
        if (ov && typeof t[ov] == "function" && Au)
            return Au(t, {
                depth: u - n
            });
        if (a !== "symbol" && typeof t.inspect == "function")
            return t.inspect()
    }
    if (Bx(t)) {
        var O = [];
        return Kh && Kh.call(t, function(B, K) {
            O.push(d(K, t, !0) + " => " + d(B, t))
        }),
            cv("Map", wa.call(t), O, f)
    }
    if (jx(t)) {
        var C = [];
        return Gh && Gh.call(t, function(B) {
            C.push(d(B, t))
        }),
            cv("Set", Ca.call(t), C, f)
    }
    if (Nx(t))
        return Pu("WeakMap");
    if (Hx(t))
        return Pu("WeakSet");
    if (Lx(t))
        return Pu("WeakRef");
    if ($x(t))
        return zo(d(Number(t)));
    if (Rx(t))
        return zo(d(Ou.call(t)));
    if (Mx(t))
        return zo(Cx.call(t));
    if (Tx(t))
        return zo(d(String(t)));
    if (!kx(t) && !av(t)) {
        var _ = _a(t, d)
            , E = tv ? tv(t) === Object.prototype : t instanceof Object || t.constructor === Object
            , A = t instanceof Object ? "" : "null prototype"
            , M = !E && nt && Object(t) === t && nt in t ? Su.call(_r(t), 8, -1) : A ? "Object" : ""
            , I = E || typeof t.constructor != "function" ? "" : t.constructor.name ? t.constructor.name + " " : ""
            , F = I + (M || A ? "[" + Wt.call(Qh.call([], M || [], A || []), ": ") + "] " : "");
        return _.length === 0 ? F + "{}" : f ? F + "{" + Tu(_, f) + "}" : F + "{ " + Wt.call(_, ", ") + " }"
    }
    return String(t)
};
function iv(e, t, r) {
    var n = (r.quoteStyle || t) === "double" ? '"' : "'";
    return n + e + n
}
function Ax(e) {
    return wr.call(String(e), /"/g, "&quot;")
}
function ku(e) {
    return _r(e) === "[object Array]" && (!nt || !(typeof e == "object" && nt in e))
}
function kx(e) {
    return _r(e) === "[object Date]" && (!nt || !(typeof e == "object" && nt in e))
}
function av(e) {
    return _r(e) === "[object RegExp]" && (!nt || !(typeof e == "object" && nt in e))
}
function Px(e) {
    return _r(e) === "[object Error]" && (!nt || !(typeof e == "object" && nt in e))
}
function Tx(e) {
    return _r(e) === "[object String]" && (!nt || !(typeof e == "object" && nt in e))
}
function $x(e) {
    return _r(e) === "[object Number]" && (!nt || !(typeof e == "object" && nt in e))
}
function Mx(e) {
    return _r(e) === "[object Boolean]" && (!nt || !(typeof e == "object" && nt in e))
}
function sv(e) {
    if (Yn)
        return e && typeof e == "object" && e instanceof Symbol;
    if (typeof e == "symbol")
        return !0;
    if (!e || typeof e != "object" || !Fu)
        return !1;
    try {
        return Fu.call(e),
            !0
    } catch {}
    return !1
}
function Rx(e) {
    if (!e || typeof e != "object" || !Ou)
        return !1;
    try {
        return Ou.call(e),
            !0
    } catch {}
    return !1
}
var Ix = Object.prototype.hasOwnProperty || function(e) {
        return e in this
    }
;
function Cr(e, t) {
    return Ix.call(e, t)
}
function _r(e) {
    return _x.call(e)
}
function Dx(e) {
    if (e.name)
        return e.name;
    var t = Sx.call(xx.call(e), /^function\s*([\w$]+)/);
    return t ? t[1] : null
}
function lv(e, t) {
    if (e.indexOf)
        return e.indexOf(t);
    for (var r = 0, n = e.length; r < n; r++)
        if (e[r] === t)
            return r;
    return -1
}
function Bx(e) {
    if (!wa || !e || typeof e != "object")
        return !1;
    try {
        wa.call(e);
        try {
            Ca.call(e)
        } catch {
            return !0
        }
        return e instanceof Map
    } catch {}
    return !1
}
function Nx(e) {
    if (!Wo || !e || typeof e != "object")
        return !1;
    try {
        Wo.call(e, Wo);
        try {
            qo.call(e, qo)
        } catch {
            return !0
        }
        return e instanceof WeakMap
    } catch {}
    return !1
}
function Lx(e) {
    if (!Yh || !e || typeof e != "object")
        return !1;
    try {
        return Yh.call(e),
            !0
    } catch {}
    return !1
}
function jx(e) {
    if (!Ca || !e || typeof e != "object")
        return !1;
    try {
        Ca.call(e);
        try {
            wa.call(e)
        } catch {
            return !0
        }
        return e instanceof Set
    } catch {}
    return !1
}
function Hx(e) {
    if (!qo || !e || typeof e != "object")
        return !1;
    try {
        qo.call(e, qo);
        try {
            Wo.call(e, Wo)
        } catch {
            return !0
        }
        return e instanceof WeakSet
    } catch {}
    return !1
}
function Ux(e) {
    return !e || typeof e != "object" ? !1 : typeof HTMLElement != "undefined" && e instanceof HTMLElement ? !0 : typeof e.nodeName == "string" && typeof e.getAttribute == "function"
}
function uv(e, t) {
    if (e.length > t.maxStringLength) {
        var r = e.length - t.maxStringLength
            , n = "... " + r + " more character" + (r > 1 ? "s" : "");
        return uv(Su.call(e, 0, t.maxStringLength), t) + n
    }
    var o = wr.call(wr.call(e, /(['\\])/g, "\\$1"), /[\x00-\x1f]/g, Wx);
    return iv(o, "single", t)
}
function Wx(e) {
    var t = e.charCodeAt(0)
        , r = {
        8: "b",
        9: "t",
        10: "n",
        12: "f",
        13: "r"
    }[t];
    return r ? "\\" + r : "\\x" + (t < 16 ? "0" : "") + Ox.call(t.toString(16))
}
function zo(e) {
    return "Object(" + e + ")"
}
function Pu(e) {
    return e + " { ? }"
}
function cv(e, t, r, n) {
    var o = n ? Tu(r, n) : Wt.call(r, ", ");
    return e + " (" + t + ") {" + o + "}"
}
function qx(e) {
    for (var t = 0; t < e.length; t++)
        if (lv(e[t], `
`) >= 0)
            return !1;
    return !0
}
function zx(e, t) {
    var r;
    if (e.indent === "	")
        r = "	";
    else if (typeof e.indent == "number" && e.indent > 0)
        r = Wt.call(Array(e.indent + 1), " ");
    else
        return null;
    return {
        base: r,
        prev: Wt.call(Array(t + 1), r)
    }
}
function Tu(e, t) {
    if (e.length === 0)
        return "";
    var r = `
` + t.prev + t.base;
    return r + Wt.call(e, "," + r) + `
` + t.prev
}
function _a(e, t) {
    var r = ku(e)
        , n = [];
    if (r) {
        n.length = e.length;
        for (var o = 0; o < e.length; o++)
            n[o] = Cr(e, o) ? t(e[o], e) : ""
    }
    var i = typeof Eu == "function" ? Eu(e) : [], a;
    if (Yn) {
        a = {};
        for (var s = 0; s < i.length; s++)
            a["$" + i[s]] = i[s]
    }
    for (var l in e)
        !Cr(e, l) || r && String(Number(l)) === l && l < e.length || Yn && a["$" + l]instanceof Symbol || (Jh.call(/[^\w$]/, l) ? n.push(t(l, e) + ": " + t(e[l], e)) : n.push(l + ": " + t(e[l], e)));
    if (typeof Eu == "function")
        for (var c = 0; c < i.length; c++)
            ev.call(e, i[c]) && n.push("[" + t(i[c]) + "]: " + t(e[i[c]], e));
    return n
}
var $u = bu
    , Xn = hx
    , Vx = Fx
    , Kx = $u("%TypeError%")
    , xa = $u("%WeakMap%", !0)
    , Sa = $u("%Map%", !0)
    , Gx = Xn("WeakMap.prototype.get", !0)
    , Yx = Xn("WeakMap.prototype.set", !0)
    , Xx = Xn("WeakMap.prototype.has", !0)
    , Jx = Xn("Map.prototype.get", !0)
    , Qx = Xn("Map.prototype.set", !0)
    , Zx = Xn("Map.prototype.has", !0)
    , Mu = function(e, t) {
    for (var r = e, n; (n = r.next) !== null; r = n)
        if (n.key === t)
            return r.next = n.next,
                n.next = e.next,
                e.next = n,
                n
}
    , eS = function(e, t) {
    var r = Mu(e, t);
    return r && r.value
}
    , tS = function(e, t, r) {
    var n = Mu(e, t);
    n ? n.value = r : e.next = {
        key: t,
        next: e.next,
        value: r
    }
}
    , rS = function(e, t) {
    return !!Mu(e, t)
}
    , nS = function() {
    var t, r, n, o = {
        assert: function(i) {
            if (!o.has(i))
                throw new Kx("Side channel does not contain " + Vx(i))
        },
        get: function(i) {
            if (xa && i && (typeof i == "object" || typeof i == "function")) {
                if (t)
                    return Gx(t, i)
            } else if (Sa) {
                if (r)
                    return Jx(r, i)
            } else if (n)
                return eS(n, i)
        },
        has: function(i) {
            if (xa && i && (typeof i == "object" || typeof i == "function")) {
                if (t)
                    return Xx(t, i)
            } else if (Sa) {
                if (r)
                    return Zx(r, i)
            } else if (n)
                return rS(n, i);
            return !1
        },
        set: function(i, a) {
            xa && i && (typeof i == "object" || typeof i == "function") ? (t || (t = new xa),
                Yx(t, i, a)) : Sa ? (r || (r = new Sa),
                Qx(r, i, a)) : (n || (n = {
                key: {},
                next: null
            }),
                tS(n, i, a))
        }
    };
    return o
}
    , oS = String.prototype.replace
    , iS = /%20/g
    , Ru = {
    RFC1738: "RFC1738",
    RFC3986: "RFC3986"
}
    , Iu = {
    default: Ru.RFC3986,
    formatters: {
        RFC1738: function(e) {
            return oS.call(e, iS, "+")
        },
        RFC3986: function(e) {
            return String(e)
        }
    },
    RFC1738: Ru.RFC1738,
    RFC3986: Ru.RFC3986
}
    , aS = Iu
    , Du = Object.prototype.hasOwnProperty
    , Yr = Array.isArray
    , qt = function() {
    for (var e = [], t = 0; t < 256; ++t)
        e.push("%" + ((t < 16 ? "0" : "") + t.toString(16)).toUpperCase());
    return e
}()
    , sS = function(t) {
    for (; t.length > 1; ) {
        var r = t.pop()
            , n = r.obj[r.prop];
        if (Yr(n)) {
            for (var o = [], i = 0; i < n.length; ++i)
                typeof n[i] != "undefined" && o.push(n[i]);
            r.obj[r.prop] = o
        }
    }
}
    , fv = function(t, r) {
    for (var n = r && r.plainObjects ? Object.create(null) : {}, o = 0; o < t.length; ++o)
        typeof t[o] != "undefined" && (n[o] = t[o]);
    return n
}
    , lS = function e(t, r, n) {
    if (!r)
        return t;
    if (typeof r != "object") {
        if (Yr(t))
            t.push(r);
        else if (t && typeof t == "object")
            (n && (n.plainObjects || n.allowPrototypes) || !Du.call(Object.prototype, r)) && (t[r] = !0);
        else
            return [t, r];
        return t
    }
    if (!t || typeof t != "object")
        return [t].concat(r);
    var o = t;
    return Yr(t) && !Yr(r) && (o = fv(t, n)),
        Yr(t) && Yr(r) ? (r.forEach(function(i, a) {
            if (Du.call(t, a)) {
                var s = t[a];
                s && typeof s == "object" && i && typeof i == "object" ? t[a] = e(s, i, n) : t.push(i)
            } else
                t[a] = i
        }),
            t) : Object.keys(r).reduce(function(i, a) {
            var s = r[a];
            return Du.call(i, a) ? i[a] = e(i[a], s, n) : i[a] = s,
                i
        }, o)
}
    , uS = function(t, r) {
    return Object.keys(r).reduce(function(n, o) {
        return n[o] = r[o],
            n
    }, t)
}
    , cS = function(e, t, r) {
    var n = e.replace(/\+/g, " ");
    if (r === "iso-8859-1")
        return n.replace(/%[0-9a-f]{2}/gi, unescape);
    try {
        return decodeURIComponent(n)
    } catch {
        return n
    }
}
    , fS = function(t, r, n, o, i) {
    if (t.length === 0)
        return t;
    var a = t;
    if (typeof t == "symbol" ? a = Symbol.prototype.toString.call(t) : typeof t != "string" && (a = String(t)),
    n === "iso-8859-1")
        return escape(a).replace(/%u[0-9a-f]{4}/gi, function(u) {
            return "%26%23" + parseInt(u.slice(2), 16) + "%3B"
        });
    for (var s = "", l = 0; l < a.length; ++l) {
        var c = a.charCodeAt(l);
        if (c === 45 || c === 46 || c === 95 || c === 126 || c >= 48 && c <= 57 || c >= 65 && c <= 90 || c >= 97 && c <= 122 || i === aS.RFC1738 && (c === 40 || c === 41)) {
            s += a.charAt(l);
            continue
        }
        if (c < 128) {
            s = s + qt[c];
            continue
        }
        if (c < 2048) {
            s = s + (qt[192 | c >> 6] + qt[128 | c & 63]);
            continue
        }
        if (c < 55296 || c >= 57344) {
            s = s + (qt[224 | c >> 12] + qt[128 | c >> 6 & 63] + qt[128 | c & 63]);
            continue
        }
        l += 1,
            c = 65536 + ((c & 1023) << 10 | a.charCodeAt(l) & 1023),
            s += qt[240 | c >> 18] + qt[128 | c >> 12 & 63] + qt[128 | c >> 6 & 63] + qt[128 | c & 63]
    }
    return s
}
    , dS = function(t) {
    for (var r = [{
        obj: {
            o: t
        },
        prop: "o"
    }], n = [], o = 0; o < r.length; ++o)
        for (var i = r[o], a = i.obj[i.prop], s = Object.keys(a), l = 0; l < s.length; ++l) {
            var c = s[l]
                , u = a[c];
            typeof u == "object" && u !== null && n.indexOf(u) === -1 && (r.push({
                obj: a,
                prop: c
            }),
                n.push(u))
        }
    return sS(r),
        t
}
    , pS = function(t) {
    return Object.prototype.toString.call(t) === "[object RegExp]"
}
    , hS = function(t) {
    return !t || typeof t != "object" ? !1 : !!(t.constructor && t.constructor.isBuffer && t.constructor.isBuffer(t))
}
    , vS = function(t, r) {
    return [].concat(t, r)
}
    , mS = function(t, r) {
    if (Yr(t)) {
        for (var n = [], o = 0; o < t.length; o += 1)
            n.push(r(t[o]));
        return n
    }
    return r(t)
}
    , dv = {
    arrayToObject: fv,
    assign: uS,
    combine: vS,
    compact: dS,
    decode: cS,
    encode: fS,
    isBuffer: hS,
    isRegExp: pS,
    maybeMap: mS,
    merge: lS
}
    , pv = nS
    , Oa = dv
    , Vo = Iu
    , gS = Object.prototype.hasOwnProperty
    , hv = {
    brackets: function(t) {
        return t + "[]"
    },
    comma: "comma",
    indices: function(t, r) {
        return t + "[" + r + "]"
    },
    repeat: function(t) {
        return t
    }
}
    , Jt = Array.isArray
    , yS = Array.prototype.push
    , vv = function(e, t) {
    yS.apply(e, Jt(t) ? t : [t])
}
    , bS = Date.prototype.toISOString
    , mv = Vo.default
    , ot = {
    addQueryPrefix: !1,
    allowDots: !1,
    charset: "utf-8",
    charsetSentinel: !1,
    delimiter: "&",
    encode: !0,
    encoder: Oa.encode,
    encodeValuesOnly: !1,
    format: mv,
    formatter: Vo.formatters[mv],
    indices: !1,
    serializeDate: function(t) {
        return bS.call(t)
    },
    skipNulls: !1,
    strictNullHandling: !1
}
    , wS = function(t) {
    return typeof t == "string" || typeof t == "number" || typeof t == "boolean" || typeof t == "symbol" || typeof t == "bigint"
}
    , Bu = {}
    , CS = function e(t, r, n, o, i, a, s, l, c, u, f, d, p, g, m, h) {
    for (var v = t, w = h, S = 0, b = !1; (w = w.get(Bu)) !== void 0 && !b; ) {
        var O = w.get(t);
        if (S += 1,
        typeof O != "undefined") {
            if (O === S)
                throw new RangeError("Cyclic object value");
            b = !0
        }
        typeof w.get(Bu) == "undefined" && (S = 0)
    }
    if (typeof l == "function" ? v = l(r, v) : v instanceof Date ? v = f(v) : n === "comma" && Jt(v) && (v = Oa.maybeMap(v, function(ee) {
        return ee instanceof Date ? f(ee) : ee
    })),
    v === null) {
        if (i)
            return s && !g ? s(r, ot.encoder, m, "key", d) : r;
        v = ""
    }
    if (wS(v) || Oa.isBuffer(v)) {
        if (s) {
            var C = g ? r : s(r, ot.encoder, m, "key", d);
            return [p(C) + "=" + p(s(v, ot.encoder, m, "value", d))]
        }
        return [p(r) + "=" + p(String(v))]
    }
    var _ = [];
    if (typeof v == "undefined")
        return _;
    var E;
    if (n === "comma" && Jt(v))
        g && s && (v = Oa.maybeMap(v, s)),
            E = [{
                value: v.length > 0 ? v.join(",") || null : void 0
            }];
    else if (Jt(l))
        E = l;
    else {
        var A = Object.keys(v);
        E = c ? A.sort(c) : A
    }
    for (var M = o && Jt(v) && v.length === 1 ? r + "[]" : r, I = 0; I < E.length; ++I) {
        var F = E[I]
            , B = typeof F == "object" && typeof F.value != "undefined" ? F.value : v[F];
        if (!(a && B === null)) {
            var K = Jt(v) ? typeof n == "function" ? n(M, F) : M : M + (u ? "." + F : "[" + F + "]");
            h.set(t, S);
            var oe = pv();
            oe.set(Bu, h),
                vv(_, e(B, K, n, o, i, a, n === "comma" && g && Jt(v) ? null : s, l, c, u, f, d, p, g, m, oe))
        }
    }
    return _
}
    , _S = function(t) {
    if (!t)
        return ot;
    if (t.encoder !== null && typeof t.encoder != "undefined" && typeof t.encoder != "function")
        throw new TypeError("Encoder has to be a function.");
    var r = t.charset || ot.charset;
    if (typeof t.charset != "undefined" && t.charset !== "utf-8" && t.charset !== "iso-8859-1")
        throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
    var n = Vo.default;
    if (typeof t.format != "undefined") {
        if (!gS.call(Vo.formatters, t.format))
            throw new TypeError("Unknown format option provided.");
        n = t.format
    }
    var o = Vo.formatters[n]
        , i = ot.filter;
    return (typeof t.filter == "function" || Jt(t.filter)) && (i = t.filter),
        {
            addQueryPrefix: typeof t.addQueryPrefix == "boolean" ? t.addQueryPrefix : ot.addQueryPrefix,
            allowDots: typeof t.allowDots == "undefined" ? ot.allowDots : !!t.allowDots,
            charset: r,
            charsetSentinel: typeof t.charsetSentinel == "boolean" ? t.charsetSentinel : ot.charsetSentinel,
            delimiter: typeof t.delimiter == "undefined" ? ot.delimiter : t.delimiter,
            encode: typeof t.encode == "boolean" ? t.encode : ot.encode,
            encoder: typeof t.encoder == "function" ? t.encoder : ot.encoder,
            encodeValuesOnly: typeof t.encodeValuesOnly == "boolean" ? t.encodeValuesOnly : ot.encodeValuesOnly,
            filter: i,
            format: n,
            formatter: o,
            serializeDate: typeof t.serializeDate == "function" ? t.serializeDate : ot.serializeDate,
            skipNulls: typeof t.skipNulls == "boolean" ? t.skipNulls : ot.skipNulls,
            sort: typeof t.sort == "function" ? t.sort : null,
            strictNullHandling: typeof t.strictNullHandling == "boolean" ? t.strictNullHandling : ot.strictNullHandling
        }
}
    , xS = function(e, t) {
    var r = e, n = _S(t), o, i;
    typeof n.filter == "function" ? (i = n.filter,
        r = i("", r)) : Jt(n.filter) && (i = n.filter,
        o = i);
    var a = [];
    if (typeof r != "object" || r === null)
        return "";
    var s;
    t && t.arrayFormat in hv ? s = t.arrayFormat : t && "indices"in t ? s = t.indices ? "indices" : "repeat" : s = "indices";
    var l = hv[s];
    if (t && "commaRoundTrip"in t && typeof t.commaRoundTrip != "boolean")
        throw new TypeError("`commaRoundTrip` must be a boolean, or absent");
    var c = l === "comma" && t && t.commaRoundTrip;
    o || (o = Object.keys(r)),
    n.sort && o.sort(n.sort);
    for (var u = pv(), f = 0; f < o.length; ++f) {
        var d = o[f];
        n.skipNulls && r[d] === null || vv(a, CS(r[d], d, l, c, n.strictNullHandling, n.skipNulls, n.encode ? n.encoder : null, n.filter, n.sort, n.allowDots, n.serializeDate, n.format, n.formatter, n.encodeValuesOnly, n.charset, u))
    }
    var p = a.join(n.delimiter)
        , g = n.addQueryPrefix === !0 ? "?" : "";
    return n.charsetSentinel && (n.charset === "iso-8859-1" ? g += "utf8=%26%2310003%3B&" : g += "utf8=%E2%9C%93&"),
        p.length > 0 ? g + p : ""
}
    , Jn = dv
    , Nu = Object.prototype.hasOwnProperty
    , SS = Array.isArray
    , Ye = {
    allowDots: !1,
    allowPrototypes: !1,
    allowSparse: !1,
    arrayLimit: 20,
    charset: "utf-8",
    charsetSentinel: !1,
    comma: !1,
    decoder: Jn.decode,
    delimiter: "&",
    depth: 5,
    ignoreQueryPrefix: !1,
    interpretNumericEntities: !1,
    parameterLimit: 1e3,
    parseArrays: !0,
    plainObjects: !1,
    strictNullHandling: !1
}
    , OS = function(e) {
    return e.replace(/&#(\d+);/g, function(t, r) {
        return String.fromCharCode(parseInt(r, 10))
    })
}
    , gv = function(e, t) {
    return e && typeof e == "string" && t.comma && e.indexOf(",") > -1 ? e.split(",") : e
}
    , ES = "utf8=%26%2310003%3B"
    , FS = "utf8=%E2%9C%93"
    , AS = function(t, r) {
    var n = {
        __proto__: null
    }, o = r.ignoreQueryPrefix ? t.replace(/^\?/, "") : t, i = r.parameterLimit === 1 / 0 ? void 0 : r.parameterLimit, a = o.split(r.delimiter, i), s = -1, l, c = r.charset;
    if (r.charsetSentinel)
        for (l = 0; l < a.length; ++l)
            a[l].indexOf("utf8=") === 0 && (a[l] === FS ? c = "utf-8" : a[l] === ES && (c = "iso-8859-1"),
                s = l,
                l = a.length);
    for (l = 0; l < a.length; ++l)
        if (l !== s) {
            var u = a[l], f = u.indexOf("]="), d = f === -1 ? u.indexOf("=") : f + 1, p, g;
            d === -1 ? (p = r.decoder(u, Ye.decoder, c, "key"),
                g = r.strictNullHandling ? null : "") : (p = r.decoder(u.slice(0, d), Ye.decoder, c, "key"),
                g = Jn.maybeMap(gv(u.slice(d + 1), r), function(m) {
                    return r.decoder(m, Ye.decoder, c, "value")
                })),
            g && r.interpretNumericEntities && c === "iso-8859-1" && (g = OS(g)),
            u.indexOf("[]=") > -1 && (g = SS(g) ? [g] : g),
                Nu.call(n, p) ? n[p] = Jn.combine(n[p], g) : n[p] = g
        }
    return n
}
    , kS = function(e, t, r, n) {
    for (var o = n ? t : gv(t, r), i = e.length - 1; i >= 0; --i) {
        var a, s = e[i];
        if (s === "[]" && r.parseArrays)
            a = [].concat(o);
        else {
            a = r.plainObjects ? Object.create(null) : {};
            var l = s.charAt(0) === "[" && s.charAt(s.length - 1) === "]" ? s.slice(1, -1) : s
                , c = parseInt(l, 10);
            !r.parseArrays && l === "" ? a = {
                0: o
            } : !isNaN(c) && s !== l && String(c) === l && c >= 0 && r.parseArrays && c <= r.arrayLimit ? (a = [],
                a[c] = o) : l !== "__proto__" && (a[l] = o)
        }
        o = a
    }
    return o
}
    , PS = function(t, r, n, o) {
    if (!!t) {
        var i = n.allowDots ? t.replace(/\.([^.[]+)/g, "[$1]") : t
            , a = /(\[[^[\]]*])/
            , s = /(\[[^[\]]*])/g
            , l = n.depth > 0 && a.exec(i)
            , c = l ? i.slice(0, l.index) : i
            , u = [];
        if (c) {
            if (!n.plainObjects && Nu.call(Object.prototype, c) && !n.allowPrototypes)
                return;
            u.push(c)
        }
        for (var f = 0; n.depth > 0 && (l = s.exec(i)) !== null && f < n.depth; ) {
            if (f += 1,
            !n.plainObjects && Nu.call(Object.prototype, l[1].slice(1, -1)) && !n.allowPrototypes)
                return;
            u.push(l[1])
        }
        return l && u.push("[" + i.slice(l.index) + "]"),
            kS(u, r, n, o)
    }
}
    , TS = function(t) {
    if (!t)
        return Ye;
    if (t.decoder !== null && t.decoder !== void 0 && typeof t.decoder != "function")
        throw new TypeError("Decoder has to be a function.");
    if (typeof t.charset != "undefined" && t.charset !== "utf-8" && t.charset !== "iso-8859-1")
        throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
    var r = typeof t.charset == "undefined" ? Ye.charset : t.charset;
    return {
        allowDots: typeof t.allowDots == "undefined" ? Ye.allowDots : !!t.allowDots,
        allowPrototypes: typeof t.allowPrototypes == "boolean" ? t.allowPrototypes : Ye.allowPrototypes,
        allowSparse: typeof t.allowSparse == "boolean" ? t.allowSparse : Ye.allowSparse,
        arrayLimit: typeof t.arrayLimit == "number" ? t.arrayLimit : Ye.arrayLimit,
        charset: r,
        charsetSentinel: typeof t.charsetSentinel == "boolean" ? t.charsetSentinel : Ye.charsetSentinel,
        comma: typeof t.comma == "boolean" ? t.comma : Ye.comma,
        decoder: typeof t.decoder == "function" ? t.decoder : Ye.decoder,
        delimiter: typeof t.delimiter == "string" || Jn.isRegExp(t.delimiter) ? t.delimiter : Ye.delimiter,
        depth: typeof t.depth == "number" || t.depth === !1 ? +t.depth : Ye.depth,
        ignoreQueryPrefix: t.ignoreQueryPrefix === !0,
        interpretNumericEntities: typeof t.interpretNumericEntities == "boolean" ? t.interpretNumericEntities : Ye.interpretNumericEntities,
        parameterLimit: typeof t.parameterLimit == "number" ? t.parameterLimit : Ye.parameterLimit,
        parseArrays: t.parseArrays !== !1,
        plainObjects: typeof t.plainObjects == "boolean" ? t.plainObjects : Ye.plainObjects,
        strictNullHandling: typeof t.strictNullHandling == "boolean" ? t.strictNullHandling : Ye.strictNullHandling
    }
}
    , $S = function(e, t) {
    var r = TS(t);
    if (e === "" || e === null || typeof e == "undefined")
        return r.plainObjects ? Object.create(null) : {};
    for (var n = typeof e == "string" ? AS(e, r) : e, o = r.plainObjects ? Object.create(null) : {}, i = Object.keys(n), a = 0; a < i.length; ++a) {
        var s = i[a]
            , l = PS(s, n[s], r, typeof e == "string");
        o = Jn.merge(o, l, r)
    }
    return r.allowSparse === !0 ? o : Jn.compact(o)
}
    , MS = xS
    , RS = $S
    , IS = Iu
    , Yk = {
    formats: IS,
    parse: RS,
    stringify: MS
}
    , DS = typeof Le == "object" && Le && Le.Object === Object && Le
    , BS = DS
    , NS = BS
    , LS = typeof self == "object" && self && self.Object === Object && self
    , jS = NS || LS || Function("return this")()
    , Ea = jS
    , HS = Ea
    , US = HS.Symbol
    , Lu = US
    , yv = Lu
    , bv = Object.prototype
    , WS = bv.hasOwnProperty
    , qS = bv.toString
    , Ko = yv ? yv.toStringTag : void 0;
function zS(e) {
    var t = WS.call(e, Ko)
        , r = e[Ko];
    try {
        e[Ko] = void 0;
        var n = !0
    } catch {}
    var o = qS.call(e);
    return n && (t ? e[Ko] = r : delete e[Ko]),
        o
}
var VS = zS
    , KS = Object.prototype
    , GS = KS.toString;
function YS(e) {
    return GS.call(e)
}
var XS = YS
    , wv = Lu
    , JS = VS
    , QS = XS
    , ZS = "[object Null]"
    , eO = "[object Undefined]"
    , Cv = wv ? wv.toStringTag : void 0;
function tO(e) {
    return e == null ? e === void 0 ? eO : ZS : Cv && Cv in Object(e) ? JS(e) : QS(e)
}
var _v = tO;
function rO(e) {
    var t = typeof e;
    return e != null && (t == "object" || t == "function")
}
var ju = rO
    , nO = _v
    , oO = ju
    , iO = "[object AsyncFunction]"
    , aO = "[object Function]"
    , sO = "[object GeneratorFunction]"
    , lO = "[object Proxy]";
function uO(e) {
    if (!oO(e))
        return !1;
    var t = nO(e);
    return t == aO || t == sO || t == iO || t == lO
}
var cO = uO
    , fO = Ea
    , dO = fO["__core-js_shared__"]
    , pO = dO
    , Hu = pO
    , xv = function() {
    var e = /[^.]+$/.exec(Hu && Hu.keys && Hu.keys.IE_PROTO || "");
    return e ? "Symbol(src)_1." + e : ""
}();
function hO(e) {
    return !!xv && xv in e
}
var vO = hO
    , mO = Function.prototype
    , gO = mO.toString;
function yO(e) {
    if (e != null) {
        try {
            return gO.call(e)
        } catch {}
        try {
            return e + ""
        } catch {}
    }
    return ""
}
var bO = yO
    , wO = cO
    , CO = vO
    , _O = ju
    , xO = bO
    , SO = /[\\^$.*+?()[\]{}|]/g
    , OO = /^\[object .+?Constructor\]$/
    , EO = Function.prototype
    , FO = Object.prototype
    , AO = EO.toString
    , kO = FO.hasOwnProperty
    , PO = RegExp("^" + AO.call(kO).replace(SO, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$");
function TO(e) {
    if (!_O(e) || CO(e))
        return !1;
    var t = wO(e) ? PO : OO;
    return t.test(xO(e))
}
var $O = TO;
function MO(e, t) {
    return e == null ? void 0 : e[t]
}
var RO = MO
    , IO = $O
    , DO = RO;
function BO(e, t) {
    var r = DO(e, t);
    return IO(r) ? r : void 0
}
var Fa = BO
    , NO = Fa
    , LO = NO(Object, "create")
    , Aa = LO
    , Sv = Aa;
function jO() {
    this.__data__ = Sv ? Sv(null) : {},
        this.size = 0
}
var HO = jO;
function UO(e) {
    var t = this.has(e) && delete this.__data__[e];
    return this.size -= t ? 1 : 0,
        t
}
var WO = UO
    , qO = Aa
    , zO = "__lodash_hash_undefined__"
    , VO = Object.prototype
    , KO = VO.hasOwnProperty;
function GO(e) {
    var t = this.__data__;
    if (qO) {
        var r = t[e];
        return r === zO ? void 0 : r
    }
    return KO.call(t, e) ? t[e] : void 0
}
var YO = GO
    , XO = Aa
    , JO = Object.prototype
    , QO = JO.hasOwnProperty;
function ZO(e) {
    var t = this.__data__;
    return XO ? t[e] !== void 0 : QO.call(t, e)
}
var eE = ZO
    , tE = Aa
    , rE = "__lodash_hash_undefined__";
function nE(e, t) {
    var r = this.__data__;
    return this.size += this.has(e) ? 0 : 1,
        r[e] = tE && t === void 0 ? rE : t,
        this
}
var oE = nE
    , iE = HO
    , aE = WO
    , sE = YO
    , lE = eE
    , uE = oE;
function Qn(e) {
    var t = -1
        , r = e == null ? 0 : e.length;
    for (this.clear(); ++t < r; ) {
        var n = e[t];
        this.set(n[0], n[1])
    }
}
Qn.prototype.clear = iE;
Qn.prototype.delete = aE;
Qn.prototype.get = sE;
Qn.prototype.has = lE;
Qn.prototype.set = uE;
var cE = Qn;
function fE() {
    this.__data__ = [],
        this.size = 0
}
var dE = fE;
function pE(e, t) {
    return e === t || e !== e && t !== t
}
var Ov = pE
    , hE = Ov;
function vE(e, t) {
    for (var r = e.length; r--; )
        if (hE(e[r][0], t))
            return r;
    return -1
}
var ka = vE
    , mE = ka
    , gE = Array.prototype
    , yE = gE.splice;
function bE(e) {
    var t = this.__data__
        , r = mE(t, e);
    if (r < 0)
        return !1;
    var n = t.length - 1;
    return r == n ? t.pop() : yE.call(t, r, 1),
        --this.size,
        !0
}
var wE = bE
    , CE = ka;
function _E(e) {
    var t = this.__data__
        , r = CE(t, e);
    return r < 0 ? void 0 : t[r][1]
}
var xE = _E
    , SE = ka;
function OE(e) {
    return SE(this.__data__, e) > -1
}
var EE = OE
    , FE = ka;
function AE(e, t) {
    var r = this.__data__
        , n = FE(r, e);
    return n < 0 ? (++this.size,
        r.push([e, t])) : r[n][1] = t,
        this
}
var kE = AE
    , PE = dE
    , TE = wE
    , $E = xE
    , ME = EE
    , RE = kE;
function Zn(e) {
    var t = -1
        , r = e == null ? 0 : e.length;
    for (this.clear(); ++t < r; ) {
        var n = e[t];
        this.set(n[0], n[1])
    }
}
Zn.prototype.clear = PE;
Zn.prototype.delete = TE;
Zn.prototype.get = $E;
Zn.prototype.has = ME;
Zn.prototype.set = RE;
var IE = Zn
    , DE = Fa
    , BE = Ea
    , NE = DE(BE, "Map")
    , LE = NE
    , Ev = cE
    , jE = IE
    , HE = LE;
function UE() {
    this.size = 0,
        this.__data__ = {
            hash: new Ev,
            map: new (HE || jE),
            string: new Ev
        }
}
var WE = UE;
function qE(e) {
    var t = typeof e;
    return t == "string" || t == "number" || t == "symbol" || t == "boolean" ? e !== "__proto__" : e === null
}
var zE = qE
    , VE = zE;
function KE(e, t) {
    var r = e.__data__;
    return VE(t) ? r[typeof t == "string" ? "string" : "hash"] : r.map
}
var Pa = KE
    , GE = Pa;
function YE(e) {
    var t = GE(this, e).delete(e);
    return this.size -= t ? 1 : 0,
        t
}
var XE = YE
    , JE = Pa;
function QE(e) {
    return JE(this, e).get(e)
}
var ZE = QE
    , e2 = Pa;
function t2(e) {
    return e2(this, e).has(e)
}
var r2 = t2
    , n2 = Pa;
function o2(e, t) {
    var r = n2(this, e)
        , n = r.size;
    return r.set(e, t),
        this.size += r.size == n ? 0 : 1,
        this
}
var i2 = o2
    , a2 = WE
    , s2 = XE
    , l2 = ZE
    , u2 = r2
    , c2 = i2;
function eo(e) {
    var t = -1
        , r = e == null ? 0 : e.length;
    for (this.clear(); ++t < r; ) {
        var n = e[t];
        this.set(n[0], n[1])
    }
}
eo.prototype.clear = a2;
eo.prototype.delete = s2;
eo.prototype.get = l2;
eo.prototype.has = u2;
eo.prototype.set = c2;
var Fv = eo
    , f2 = "__lodash_hash_undefined__";
function d2(e) {
    return this.__data__.set(e, f2),
        this
}
var p2 = d2;
function h2(e) {
    return this.__data__.has(e)
}
var v2 = h2
    , m2 = Fv
    , g2 = p2
    , y2 = v2;
function Ta(e) {
    var t = -1
        , r = e == null ? 0 : e.length;
    for (this.__data__ = new m2; ++t < r; )
        this.add(e[t])
}
Ta.prototype.add = Ta.prototype.push = g2;
Ta.prototype.has = y2;
var b2 = Ta;
function w2(e, t, r, n) {
    for (var o = e.length, i = r + (n ? 1 : -1); n ? i-- : ++i < o; )
        if (t(e[i], i, e))
            return i;
    return -1
}
var C2 = w2;
function _2(e) {
    return e !== e
}
var x2 = _2;
function S2(e, t, r) {
    for (var n = r - 1, o = e.length; ++n < o; )
        if (e[n] === t)
            return n;
    return -1
}
var O2 = S2
    , E2 = C2
    , F2 = x2
    , A2 = O2;
function k2(e, t, r) {
    return t === t ? A2(e, t, r) : E2(e, F2, r)
}
var P2 = k2
    , T2 = P2;
function $2(e, t) {
    var r = e == null ? 0 : e.length;
    return !!r && T2(e, t, 0) > -1
}
var M2 = $2;
function R2(e, t, r) {
    for (var n = -1, o = e == null ? 0 : e.length; ++n < o; )
        if (r(t, e[n]))
            return !0;
    return !1
}
var I2 = R2;
function D2(e, t) {
    return e.has(t)
}
var B2 = D2
    , N2 = Fa
    , L2 = Ea
    , j2 = N2(L2, "Set")
    , H2 = j2;
function U2() {}
var W2 = U2;
function q2(e) {
    var t = -1
        , r = Array(e.size);
    return e.forEach(function(n) {
        r[++t] = n
    }),
        r
}
var Av = q2
    , Uu = H2
    , z2 = W2
    , V2 = Av
    , K2 = 1 / 0
    , G2 = Uu && 1 / V2(new Uu([, -0]))[1] == K2 ? function(e) {
        return new Uu(e)
    }
    : z2
    , Y2 = G2
    , X2 = b2
    , J2 = M2
    , Q2 = I2
    , Z2 = B2
    , eF = Y2
    , tF = Av
    , rF = 200;
function nF(e, t, r) {
    var n = -1
        , o = J2
        , i = e.length
        , a = !0
        , s = []
        , l = s;
    if (r)
        a = !1,
            o = Q2;
    else if (i >= rF) {
        var c = t ? null : eF(e);
        if (c)
            return tF(c);
        a = !1,
            o = Z2,
            l = new X2
    } else
        l = t ? [] : s;
    e: for (; ++n < i; ) {
        var u = e[n]
            , f = t ? t(u) : u;
        if (u = r || u !== 0 ? u : 0,
        a && f === f) {
            for (var d = l.length; d--; )
                if (l[d] === f)
                    continue e;
            t && l.push(f),
                s.push(u)
        } else
            o(l, f, r) || (l !== s && l.push(f),
                s.push(u))
    }
    return s
}
var oF = nF
    , iF = oF;
function aF(e) {
    return e && e.length ? iF(e) : []
}
var Xk = aF
    , sF = Fa
    , lF = function() {
    try {
        var e = sF(Object, "defineProperty");
        return e({}, "", {}),
            e
    } catch {}
}()
    , uF = lF
    , kv = uF;
function cF(e, t, r) {
    t == "__proto__" && kv ? kv(e, t, {
        configurable: !0,
        enumerable: !0,
        value: r,
        writable: !0
    }) : e[t] = r
}
var fF = cF
    , dF = fF
    , pF = Ov
    , hF = Object.prototype
    , vF = hF.hasOwnProperty;
function mF(e, t, r) {
    var n = e[t];
    (!(vF.call(e, t) && pF(n, r)) || r === void 0 && !(t in e)) && dF(e, t, r)
}
var gF = mF
    , yF = Array.isArray
    , Wu = yF;
function bF(e) {
    return e != null && typeof e == "object"
}
var wF = bF
    , CF = _v
    , _F = wF
    , xF = "[object Symbol]";
function SF(e) {
    return typeof e == "symbol" || _F(e) && CF(e) == xF
}
var qu = SF
    , OF = Wu
    , EF = qu
    , FF = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/
    , AF = /^\w*$/;
function kF(e, t) {
    if (OF(e))
        return !1;
    var r = typeof e;
    return r == "number" || r == "symbol" || r == "boolean" || e == null || EF(e) ? !0 : AF.test(e) || !FF.test(e) || t != null && e in Object(t)
}
var PF = kF
    , Pv = Fv
    , TF = "Expected a function";
function zu(e, t) {
    if (typeof e != "function" || t != null && typeof t != "function")
        throw new TypeError(TF);
    var r = function() {
        var n = arguments
            , o = t ? t.apply(this, n) : n[0]
            , i = r.cache;
        if (i.has(o))
            return i.get(o);
        var a = e.apply(this, n);
        return r.cache = i.set(o, a) || i,
            a
    };
    return r.cache = new (zu.Cache || Pv),
        r
}
zu.Cache = Pv;
var $F = zu
    , MF = $F
    , RF = 500;
function IF(e) {
    var t = MF(e, function(n) {
        return r.size === RF && r.clear(),
            n
    })
        , r = t.cache;
    return t
}
var DF = IF
    , BF = DF
    , NF = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g
    , LF = /\\(\\)?/g
    , jF = BF(function(e) {
    var t = [];
    return e.charCodeAt(0) === 46 && t.push(""),
        e.replace(NF, function(r, n, o, i) {
            t.push(o ? i.replace(LF, "$1") : n || r)
        }),
        t
})
    , HF = jF;
function UF(e, t) {
    for (var r = -1, n = e == null ? 0 : e.length, o = Array(n); ++r < n; )
        o[r] = t(e[r], r, e);
    return o
}
var WF = UF
    , Tv = Lu
    , qF = WF
    , zF = Wu
    , VF = qu
    , KF = 1 / 0
    , $v = Tv ? Tv.prototype : void 0
    , Mv = $v ? $v.toString : void 0;
function Rv(e) {
    if (typeof e == "string")
        return e;
    if (zF(e))
        return qF(e, Rv) + "";
    if (VF(e))
        return Mv ? Mv.call(e) : "";
    var t = e + "";
    return t == "0" && 1 / e == -KF ? "-0" : t
}
var GF = Rv
    , YF = GF;
function XF(e) {
    return e == null ? "" : YF(e)
}
var JF = XF
    , QF = Wu
    , ZF = PF
    , eA = HF
    , tA = JF;
function rA(e, t) {
    return QF(e) ? e : ZF(e, t) ? [e] : eA(tA(e))
}
var nA = rA
    , oA = 9007199254740991
    , iA = /^(?:0|[1-9]\d*)$/;
function aA(e, t) {
    var r = typeof e;
    return t = t == null ? oA : t,
    !!t && (r == "number" || r != "symbol" && iA.test(e)) && e > -1 && e % 1 == 0 && e < t
}
var sA = aA
    , lA = qu
    , uA = 1 / 0;
function cA(e) {
    if (typeof e == "string" || lA(e))
        return e;
    var t = e + "";
    return t == "0" && 1 / e == -uA ? "-0" : t
}
var fA = cA
    , dA = gF
    , pA = nA
    , hA = sA
    , Iv = ju
    , vA = fA;
function mA(e, t, r, n) {
    if (!Iv(e))
        return e;
    t = pA(t, e);
    for (var o = -1, i = t.length, a = i - 1, s = e; s != null && ++o < i; ) {
        var l = vA(t[o])
            , c = r;
        if (l === "__proto__" || l === "constructor" || l === "prototype")
            return e;
        if (o != a) {
            var u = s[l];
            c = n ? n(u, l, s) : void 0,
            c === void 0 && (c = Iv(u) ? u : hA(t[o + 1]) ? [] : {})
        }
        dA(s, l, c),
            s = s[l]
    }
    return e
}
var gA = mA
    , yA = gA;
function bA(e, t, r) {
    return e == null ? e : yA(e, t, r)
}
var Jk = bA;
export {QA as $, ok as A, TA as B, Z1 as C, Se as D, Df as E, b0 as F, CA as G, _A as H, Yo as I, at as J, EA as K, Vk as L, Hk as M, FA as N, Rk as O, mk as P, zk as Q, ZA as R, KA as S, Es as T, JA as U, YA as V, XA as W, ik as X, v0 as Y, zA as Z, VA as _, IA as a, Xk as a0, hk as a1, yk as a2, Ok as a3, Bk as a4, Wk as a5, $k as a6, WA as a7, wk as a8, Dk as a9, _k as aA, Ck as aB, OA as aC, Ik as aD, jk as aE, Ak as aF, uk as aG, xk as aH, dk as aI, So as aJ, Bd as aK, G0 as aL, qk as aM, ek as aN, tk as aO, rk as aP, Pk as aQ, ie as aR, U as aS, Pe as aT, AA as aU, ck as aV, kk as aW, Uk as aX, Ek as aY, lk as aa, gk as ab, qA as ac, fk as ad, Sk as ae, vk as af, MA as ag, Gk as ah, Kk as ai, Yk as aj, Pt as ak, V_ as al, Jk as am, PA as an, kA as ao, jA as ap, HA as aq, bk as ar, Tk as as, Le as at, pk as au, Fk as av, Mk as aw, Nk as ax, Lk as ay, $A as az, GA as b, xA as c, of as d, V as e, DA as f, Ci as g, re as h, RA as i, Pc as j, SA as k, sf as l, Cg as m, Ma as n, Z as o, ps as p, sk as q, LA as r, BA as s, zv as t, NA as u, w0 as v, sg as w, UA as x, ak as y, nk as z};
